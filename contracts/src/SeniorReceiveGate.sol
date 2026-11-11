// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// CUSTOM, UNAUDITED. View-only; it holds no funds and moves nothing.

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IVaultV2} from "vault-v2/interfaces/IVaultV2.sol";
import {IAdapter} from "vault-v2/interfaces/IAdapter.sol";

/// @dev The public state of JuniorVault the gate replicates its price math from.
interface IJuniorGateView {
    function asset() external view returns (address);
    function senior() external view returns (address);
    function seniorPriceBase() external view returns (uint256);
    function seniorBaseTime() external view returns (uint256);
    function carryPerShare() external view returns (uint256);
    function felixExp(uint256 i) external view returns (address vault, uint96 lostBase, uint128 fraction, uint128 assetsRef);
}

interface IFelixLost {
    function lostAssets() external view returns (uint256);
}

/// @title SeniorReceiveGate
/// @notice The `receiveSharesGate` of Orphic's senior Vault V2 (set by its curator through the timelock). It refuses NEW
///         senior shares to a non-exempt account (deposit, mint, transfer in) while a loss or a cover is still working
///         its way through senior's price, so a buyer cannot capture part of junior's cover (audit C7, C3b, C3 late buyer).
///         Redemptions are never gated. Exempt: junior (the management-fee recipient), every senior adapter, allowlisted.
///         `canReceiveShares` NEVER reverts: a failed read refuses a non-exempt account. Exempt accounts are decided before
///         any external read except the adapter probe, which is a capped low-level call and cannot revert either.
contract SeniorReceiveGate is Ownable2Step {
    uint256 internal constant WAD = 1e18;
    uint256 internal constant PRICE_UNIT = 1e24; // same unit as JuniorVault.PRICE_UNIT
    uint256 internal constant PROBE_GAS = 50_000; // cap for one cheap read (a storage getter needs ~3k)
    uint256 internal constant CHECK_GAS = 1_000_000; // cap for the whole refuse check (about 570k measured); HyperEVM small block is 2M
    uint256 internal constant MAX_ADAPTERS = 32; // bound for the adapter sweep and for the `felixExp` probe loop; above it the check refuses
    uint256 public constant MAX_UNRECOGNISED_CAP = 1_000e6; // owner cannot set the threshold above 1,000 USDC

    IVaultV2 public immutable senior;
    IJuniorGateView public immutable junior;
    IERC20 internal immutable asset;

    /// @notice Unrecognised cover (USDC, 6 decimals) above which new shares are refused.
    uint256 public maxUnrecognised = 10e6;
    mapping(address => bool) public isAllowed;

    event AllowedSet(address indexed account, bool allowed);
    event MaxUnrecognisedSet(uint256 amount);

    error AboveCap();
    error WrongPair();

    constructor(IVaultV2 senior_, IJuniorGateView junior_, address owner_) Ownable(owner_) {
        if (junior_.senior() != address(senior_)) revert WrongPair();
        senior = senior_;
        junior = junior_;
        asset = IERC20(junior_.asset());
    }

    function setAllowed(address account, bool allowed) external onlyOwner {
        isAllowed[account] = allowed;
        emit AllowedSet(account, allowed);
    }

    function setMaxUnrecognised(uint256 amount) external onlyOwner {
        if (amount > MAX_UNRECOGNISED_CAP) revert AboveCap();
        maxUnrecognised = amount;
        emit MaxUnrecognisedSet(amount);
    }

    /// @notice Vault V2 calls this on deposit/mint (onBehalf), transfer/transferFrom (to) and for BOTH fee recipients inside
    ///         `accrueInterestView`, which the checks below call too: every fee recipient is therefore exempt before any
    ///         heavy check, or the gate would recurse into itself.
    function canReceiveShares(address account) external view returns (bool) {
        if (account == address(junior) || isAllowed[account]) return true;
        // capped low-level reads, 32-byte answers only; a failed read just means "not exempt" and falls through to the
        // checks (which also fail closed). `isAdapter` is a public mapping on senior: no loop.
        (bool ok, uint256 w) = _probe(IVaultV2.isAdapter.selector, uint256(uint160(account)), true);
        if (ok && w == 1) return true;
        (ok, w) = _probe(IVaultV2.managementFeeRecipient.selector, 0, false);
        if (ok && w == uint256(uint160(account))) return true;
        (ok, w) = _probe(IVaultV2.performanceFeeRecipient.selector, 0, false);
        if (ok && w == uint256(uint160(account))) return true;
        // Everything else runs inside a self-call with a gas cap: any revert (a dependency without code, a malformed
        // return, arithmetic) or an out-of-gas ends as `false`, never as a revert.
        try this.checkClear{gas: CHECK_GAS}() returns (bool clear) {
            return clear;
        } catch {
            return false;
        }
    }

    /// @notice true when none of the four refuse conditions holds. External only for the guarded self-call; reverts on any
    ///         failed read, which `canReceiveShares` turns into a refusal.
    function checkClear() external view returns (bool) {
        require(msg.sender == address(this));
        // (3) booked Felix loss not yet billed, with junior's own 1 ppm guard (JuniorVault._felixOwed): the entry's
        //     (lost - lostBase) * fraction is above 1 ppm of its reference assets. Smaller bumps are Felix rounding, which
        //     anyone can book with dust, and junior forgives them at its next sync, so the gate must not refuse on them.
        //     Looped to a fixed bound, not senior.adaptersLength(): junior's array can be longer than the adapter list
        //     (an adapter removed since the last snap keeps its entry). The end of the array is the first revert.
        uint256 n = senior.adaptersLength();
        if (n > MAX_ADAPTERS) return false;
        for (uint256 i = 0; i < MAX_ADAPTERS; i++) {
            try junior.felixExp{gas: PROBE_GAS}(i) returns (address v, uint96 lostBase, uint128 fraction, uint128 assetsRef) {
                uint256 lost = IFelixLost(v).lostAssets{gas: PROBE_GAS}(); // a failed read reverts: refuse
                if (lost <= lostBase) continue;
                if ((lost - lostBase) * fraction / PRICE_UNIT * 1e6 > assetsRef) return false;
            } catch {
                break; // past the end of junior's array
            }
        }
        // (2) unpaid carry
        if (junior.carryPerShare() != 0) return false;
        // (1) loss outstanding and (4) unrecognised cover, from ONE price computation (each Felix adapter read is costly)
        (uint256 price, uint256 recognised) = _prices(n);
        if (price < _expectedPrice()) return false;
        return _coverInProgress(price, recognised) <= maxUnrecognised;
    }

    /// @dev staticcall to senior with a gas cap; ok only for an exactly-32-byte answer.
    function _probe(bytes4 selector, uint256 arg, bool hasArg) internal view returns (bool ok, uint256 word) {
        address s = address(senior);
        uint256 g = PROBE_GAS;
        uint256 size = hasArg ? 36 : 4;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, selector)
            mstore(add(ptr, 4), arg)
            ok := staticcall(g, s, ptr, size, 0, 0)
            if ok {
                ok := eq(returndatasize(), 32)
                if ok {
                    returndatacopy(ptr, 0, 32)
                    word := mload(ptr)
                }
            }
        }
    }

    /// @dev `price` is JuniorVault._seniorRealPrice, same formula: idle + adapters' realAssets, gross (Felix bad debt not
    ///      shown), over supply + pending management-fee shares + virtual shares, Vault V2 convention (+1 asset).
    ///      `recognised` is senior.convertToAssets(PRICE_UNIT), derived from the same single accrueInterestView call
    ///      (previewRedeem: newTotalAssets + 1 over supply + both fee-share kinds + virtual shares).
    function _prices(uint256 n) internal view returns (uint256 price, uint256 recognised) {
        uint256 real = asset.balanceOf(address(senior));
        for (uint256 i = 0; i < n; i++) {
            real += IAdapter(senior.adapters(i)).realAssets();
        }
        (uint256 newTotalAssets, uint256 perfFeeShares, uint256 mgmtFeeShares) = senior.accrueInterestView();
        uint256 supply = senior.totalSupply();
        uint256 virtualShares = senior.virtualShares();
        price = PRICE_UNIT * (real + 1) / (supply + mgmtFeeShares + virtualShares);
        recognised = PRICE_UNIT * (newTotalAssets + 1) / (supply + perfFeeShares + mgmtFeeShares + virtualShares);
    }

    /// @dev JuniorVault.coverInProgress with the same inputs.
    function _coverInProgress(uint256 price, uint256 recognised) internal view returns (uint256) {
        if (price <= recognised) return 0;
        return (price - recognised) * senior.totalSupply() / PRICE_UNIT;
    }

    /// @dev JuniorVault._expectedSeniorPrice: baseline less the management-fee drift since it, less 1 ppm. Floored at 0
    ///      (junior's own version would revert there; a gate must not). At 0 the price check always passes, i.e. it fails
    ///      OPEN there; unreachable (needs 10 years of fee drift, or a 100% fee).
    function _expectedPrice() internal view returns (uint256) {
        uint256 base = junior.seniorPriceBase();
        uint256 drift = base * senior.managementFee() * (block.timestamp - junior.seniorBaseTime()) / WAD + base / 1e6;
        return drift >= base ? 0 : base - drift;
    }
}
