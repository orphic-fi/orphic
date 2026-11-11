// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// CUSTOM, UNAUDITED. Everything in this file is new code written for Orphic.
// It holds junior depositors' USDC. Keep it small, keep it tested, keep it capped.

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Multicall} from "@openzeppelin/contracts/utils/Multicall.sol";
import {IMorpho, MarketParams, Id} from "morpho-blue/interfaces/IMorpho.sol";
import {MarketParamsLib} from "morpho-blue/libraries/MarketParamsLib.sol";
import {MorphoBalancesLib} from "morpho-blue/libraries/periphery/MorphoBalancesLib.sol";
import {IVaultV2} from "vault-v2/interfaces/IVaultV2.sol";
import {IAdapter} from "vault-v2/interfaces/IAdapter.sol";
import {VenueAdmin} from "./VenueAdmin.sol";

/// @dev Selectors probed on a MetaMorpho v1.1 vault behind a Vault V2 adapter; any other contract just fails the probe.
interface IFelixProbes {
    function morphoVaultV1() external view returns (address);
    function lostAssets() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function balanceOf(address) external view returns (uint256);
}

/// @title JuniorVault
/// @notice First-loss tranche for Orphic. ERC-20 share token over USDC.
///  - deposit: pulls USDC, and (once the stake token is set) a stake of `stakePerAsset` ORPH per USDC, held here and
///    released on full exit. Shares are minted at the price frozen at the last settle.
///  - exit: requestExit locks shares, claimExit pays them at the price of the first settle at or after 7 days' notice.
///  - settle: permissionless, no inputs, at most once per SETTLE_INTERVAL. Covers any senior shortfall from idle USDC,
///    then freezes a new share price from net asset value.
///  - agent: a single key that can only call (target, selector) pairs on the allowlist, and only with this contract as
///    the receiver where the call has one. Funds can move to allowlisted venues and back, nowhere else.
///  - pause: blocks deposits only. Exits, claims and settle always work.
contract JuniorVault is ERC20, Ownable2Step, ReentrancyGuard, Multicall {
    using SafeERC20 for IERC20;
    using MarketParamsLib for MarketParams;
    using MorphoBalancesLib for IMorpho;

    /* CONSTANTS AND IMMUTABLES */

    uint256 public constant WAD = 1e18;
    uint256 public constant NOTICE = 7 days;
    uint256 public constant SETTLE_INTERVAL = 7 days - 1 hours; // weekly, with an hour of slack for the keeper
    uint256 internal constant MAX_MARKETS = 16;
    uint256 public constant SEED_ASSETS = 1e6; // 1 USDC of dead shares against first-depositor price games
    uint256 internal constant PROBE_GAS = 50_000; // gas cap per Felix probe (storage reads need about 3k)
    uint256 public constant PRICE_UNIT = 1e24; // senior shares used to quote its price with enough precision

    IERC20 public immutable asset; // USDC, 6 decimals
    IVaultV2 public immutable senior; // Morpho Vault V2 we curate
    IMorpho public immutable morpho; // Morpho Blue
    uint256 internal immutable assetScale; // 10 ** (18 - asset decimals)

    /* STATE */

    uint256 public pricePerShare = WAD; // assets per share, 18 decimals of precision, frozen between settles
    uint256 public lastSettle;
    uint256 public depositCap;
    uint256 public walletCap; // max assets per wallet at the frozen price, 0 = no limit (week one: $10k)
    bool public depositsPaused;
    bool public seeded;
    address public agent;

    IERC20 public stakeToken; // ORPH, zero until setStakeToken (one-way)
    uint256 public stakePerAsset; // ORPH wei required per 1 unit (1e6) of USDC deposited
    uint256 public pendingStakePerAsset; // proposed rate, applies after STAKE_TIMELOCK
    uint256 public stakeEta; // when the pending rate may be applied, 0 = none pending
    uint256 public constant STAKE_TIMELOCK = 3 days;
    mapping(address => uint256) public stakeOf; // ORPH held for each depositor
    mapping(address => uint256) public stakedShares; // shares minted to each depositor while staking, drives release

    struct Settle {
        uint64 timestamp;
        uint192 price;
    }
    Settle[] public settles;

    struct ExitRequest {
        uint128 shares;
        uint64 readyAt;
        uint32 settleHint; // settles.length at request time, where the claim search starts
    }
    mapping(address => ExitRequest) public exitOf;
    mapping(uint256 => uint256) public maturingShares; // readyAt day => shares that mature that day
    uint256 public lastMaturedDay; // last day bucket folded into pricedExitShares by settle
    uint256 public seniorPriceBase; // senior real assets per PRICE_UNIT shares at the last settle, after any cover
    uint256 public seniorSupplyBase; // senior share supply at the last sync: only these shares were exposed to a loss
    uint256 public seniorSupplyMin; // lowest senior share supply observed since the baseline: exits before a late buy still count
    uint256 public carryPerShare; // unpaid cover per exposed senior share (PRICE_UNIT units), billed at the next settle
    /// @dev A Felix (MetaMorpho v1.1) vault behind a senior adapter. `lostBase` (Felix's `lostAssets`, a scalar flows cannot
    ///      move) is re-taken at every baseline reset. `fraction` (senior's share of the vault, PRICE_UNIT units, its shares
    ///      over its supply) and `assetsRef` (the adapter's assets, for the 1 ppm dust guard) are the EXPOSURE part: they
    ///      are re-taken only by `snapFelixExposure` (agent or owner), never by a permissionless call.
    struct FelixExp {
        address vault;
        uint96 lostBase;
        uint128 fraction;
        uint128 assetsRef;
    }
    FelixExp[] public felixExp;
    uint256 public felixExpSupply; // senior share supply when the exposure was taken
    uint256 public seniorBaseTime; // when the baseline was taken, for the management fee drift
    uint256 public pendingExitShares; // shares locked and not yet priced, still part of the live supply
    uint256 public pricedExitShares; // shares priced at a past settle, excluded from the live supply
    uint256 public reservedAssets; // USDC owed to priced exits, excluded from NAV

    // Valuation universe doubles as the agent's venue list.
    MarketParams[] public markets; // Morpho Blue markets the agent may supply to
    mapping(Id => bool) public isMarket;
    address[] public vaults; // ERC-4626 vaults the agent may deposit to (Felix v1.1, senior for fee shares)
    mapping(address => bool) public isVault;

    // Agent allowlist. receiverOffset is the calldata byte offset (after the 4-byte selector) of the address that must
    // equal this contract, or type(uint256).max when the call has no receiver to check.
    mapping(address => mapping(bytes4 => VenueAdmin.Rule)) public rules;
    mapping(address => mapping(address => bool)) public approvals; // token => spender the agent may approve

    /* EVENTS */

    event Deposit(address indexed caller, address indexed receiver, uint256 assets, uint256 shares, uint256 stake);
    event ExitRequested(address indexed owner, uint256 shares, uint256 readyAt);
    event ExitClaimed(address indexed owner, uint256 shares, uint256 assets, uint256 price);
    event Settled(uint256 indexed index, uint256 nav, uint256 supply, uint256 price, uint256 cover);
    event Cover(uint256 owed, uint256 paid);
    event FelixExposureSnapped(uint256 vaults, uint256 seniorSupply);
    event CoverShortfallCarried(uint256 unpaid); // part of a shortfall idle USDC could not pay, billed at the next settle
    event AgentCall(address indexed target, bytes4 indexed selector, uint256 value);
    event RuleSet(address indexed target, bytes4 indexed selector, bool allowed, uint256 receiverOffset);
    event ApprovalRuleSet(address indexed token, address indexed spender, bool allowed);
    event MarketAdded(Id indexed id);
    event VaultAdded(address indexed vault);
    event MarketRemoved(Id indexed id);
    event VaultRemoved(address indexed vault);
    event StakeTokenSet(address token, uint256 stakePerAsset);
    event StakePerAssetSet(uint256 stakePerAsset);
    event StakePerAssetProposed(uint256 stakePerAsset, uint256 eta);
    event DepositCapSet(uint256 cap);
    event WalletCapSet(uint256 cap);
    event DepositsPaused(bool paused);
    event AgentSet(address agent);

    /* ERRORS */

    error Paused();
    error CapExceeded();
    error ZeroAmount();
    error NotAgent();
    error NotAllowed();
    error BadReceiver();
    error TooSoon();
    error NothingToClaim();
    error NotReady();
    error AlreadySet();
    error TooMany();
    error InsufficientLiquidity();
    error WrongAsset();
    error VenueBroken();
    error ZeroPrice();
    error StakeRateOutOfBounds();

    constructor(IERC20 asset_, IVaultV2 senior_, IMorpho morpho_, address owner_, uint256 depositCap_)
        ERC20("Orphic Junior USDC", "ojUSDC")
        Ownable(owner_)
    {
        asset = asset_;
        senior = senior_;
        morpho = morpho_;
        uint8 dec = ERC20(address(asset_)).decimals();
        assetScale = 10 ** (18 - dec);
        depositCap = depositCap_;
        lastSettle = block.timestamp;
        lastMaturedDay = block.timestamp / 1 days;
        settles.push(Settle(uint64(block.timestamp), uint192(WAD)));
        seniorPriceBase = _seniorRealPrice();
        seniorSupplyBase = senior_.totalSupply();
        seniorSupplyMin = seniorSupplyBase;
        _snapFelixExposure();
        seniorBaseTime = block.timestamp;
    }

    /// @notice Owner funds 1 USDC of dead shares before deposits open, so no first depositor can play the price.
    function seed() external onlyOwner {
        if (seeded) revert AlreadySet();
        seeded = true;
        asset.safeTransferFrom(msg.sender, address(this), SEED_ASSETS);
        _mint(address(0xdead), _toShares(SEED_ASSETS, 0)); // supply is 0 here: the price is WAD, nav unused
    }

    /* DEPOSIT */

    function deposit(uint256 assets, address receiver) external nonReentrant returns (uint256 shares) {
        if (depositsPaused || !seeded) revert Paused();
        if (assets == 0) revert ZeroAmount();
        _syncSenior(); // every junior deposit also refreshes what senior exposure we stand behind
        (uint256 nav, bool complete) = _navComplete(); // one valuation prices both the cap and the shares
        if (!complete) revert VenueBroken();
        if (nav + assets > depositCap) revert CapExceeded();
        if (walletCap != 0) {
            uint256 held = balanceOf(receiver) + exitOf[receiver].shares;
            if (held * pricePerShare / WAD / assetScale + assets > walletCap) revert CapExceeded();
        }
        shares = _toShares(assets, nav);
        uint256 stake;
        if (address(stakeToken) != address(0)) {
            stake = assets * stakePerAsset / 1e6;
            stakeToken.safeTransferFrom(msg.sender, address(this), stake);
            stakeOf[receiver] += stake;
            stakedShares[receiver] += shares;
        }
        asset.safeTransferFrom(msg.sender, address(this), assets);
        _mint(receiver, shares);
        emit Deposit(msg.sender, receiver, assets, shares, stake);
    }

    /* EXIT */

    /// @notice Lock shares for exit. One open request per address; a new request merges and restarts the notice.
    function requestExit(uint256 shares) external nonReentrant {
        if (shares == 0) revert ZeroAmount();
        _transfer(msg.sender, address(this), shares);
        ExitRequest storage r = exitOf[msg.sender];
        if (r.shares != 0) {
            // Merge: a request already priced cannot be reopened, claim it first.
            if (r.readyAt / 1 days <= lastMaturedDay) revert AlreadySet();
            maturingShares[r.readyAt / 1 days] -= r.shares;
        }
        // Notice ends at the first UTC midnight at least 7 days out, so maturity buckets and prices line up exactly.
        uint64 readyAt = uint64((block.timestamp + NOTICE + 1 days - 1) / 1 days * 1 days);
        r.shares += uint128(shares);
        r.readyAt = readyAt;
        r.settleHint = uint32(settles.length);
        maturingShares[readyAt / 1 days] += r.shares;
        pendingExitShares += shares;
        emit ExitRequested(msg.sender, shares, readyAt);
    }

    /// @notice Pay a matured exit at the price of the first settle at or after readyAt.
    function claimExit() external nonReentrant {
        ExitRequest memory r = exitOf[msg.sender];
        if (r.shares == 0) revert NothingToClaim();
        uint256 price = _priceAtOrAfter(r.readyAt, r.settleHint);
        uint256 assets = uint256(r.shares) * price / WAD / assetScale;
        if (asset.balanceOf(address(this)) < assets) revert InsufficientLiquidity();
        delete exitOf[msg.sender];
        pricedExitShares -= r.shares;
        reservedAssets = reservedAssets >= assets ? reservedAssets - assets : 0;
        _burn(address(this), r.shares);
        // Release stake pro rata to the staked shares leaving; a full exit releases everything.
        uint256 stake = stakeOf[msg.sender];
        if (stake != 0) {
            uint256 held = stakedShares[msg.sender];
            uint256 burned = r.shares > held ? held : r.shares;
            uint256 release = held == burned ? stake : stake * burned / held;
            stakedShares[msg.sender] = held - burned;
            stakeOf[msg.sender] = stake - release;
            stakeToken.safeTransfer(msg.sender, release);
        }
        if (pricedExitShares == 0) reservedAssets = 0; // rounding dust
        asset.safeTransfer(msg.sender, assets);
        emit ExitClaimed(msg.sender, r.shares, assets, price);
    }

    function _priceAtOrAfter(uint64 readyAt, uint32 hint) internal view returns (uint256) {
        uint256 n = settles.length;
        for (uint256 i = hint; i < n; i++) {
            if (settles[i].timestamp >= readyAt) return settles[i].price;
        }
        revert NotReady();
    }

    /* SETTLE */

    /// @notice Weekly close. Anyone can call, nothing to pass. Covers senior, then freezes the new price.
    function settle() external nonReentrant {
        if (block.timestamp < lastSettle + SETTLE_INTERVAL) revert TooSoon();
        senior.accrueInterest(); // mints our management-fee shares in senior before we value them
        uint256 cover = _coverSenior();
        (uint256 nav, bool complete) = _navComplete(); // net of assets reserved for exits priced earlier
        if (!complete) revert VenueBroken(); // never freeze a wrong price; owner force-removes the venue first
        uint256 supply = totalSupply() - pricedExitShares; // shares still exposed to this epoch's result
        uint256 price = supply == 0 ? WAD : nav * assetScale * WAD / supply;
        pricePerShare = price;
        lastSettle = block.timestamp;
        settles.push(Settle(uint64(block.timestamp), uint192(price)));
        // Fold every exit whose notice has run into the priced set and earmark what it is owed.
        uint256 today = block.timestamp / 1 days; // bucket d is due once block.timestamp >= d * 1 days
        uint256 matured;
        for (uint256 d = lastMaturedDay + 1; d <= today; d++) {
            matured += maturingShares[d];
        }
        lastMaturedDay = today;
        if (matured != 0) {
            pendingExitShares -= matured;
            pricedExitShares += matured;
            uint256 owed = matured * price / WAD / assetScale;
            reservedAssets += owed > nav ? nav : owed;
        }
        emit Settled(settles.length - 1, nav, supply, price, cover);
    }

    /// @dev Senior's real assets per share below where they should be is a loss we cover, up to our idle USDC.
    ///      Real assets = idle USDC + adapters, independent of Vault V2's maxRate smoothing, so a cover already paid is
    ///      never paid twice. "Should be" is last settle's level less the management fee dilution since then (that
    ///      fee is ours, not a loss). Only shares that existed at the last settle are billed: senior deposits made
    ///      after the loss bought in at the depressed price and are not owed anything.
    ///      Exposure is the smallest senior supply seen since the baseline (current supply, baseline supply, and the
    ///      minimum recorded at every observation), so shares that left and were replaced by a buyer after the loss are
    ///      not billed as if they still held it. Residual: an exit and a buy that both fall between two observations
    ///      stay invisible (closed by the senior receive-shares gate, a later change).
    ///      Partial cover: when idle cannot pay what is owed, the unpaid part becomes an explicit debt,
    ///      `carryPerShare` (PRICE_UNIT units, per exposed senior share). The baseline is the plain post-payment price,
    ///      so senior's yield cannot net the debt. At every settle the owed amount is the new shortfall plus
    ///      `carryPerShare * exposed`, paid up to idle (no venue pull); what is still unpaid is carried again, and the
    ///      baseline supply stays at `exposed`, so senior bought after the loss cannot enlarge the bill and exits shrink
    ///      it. While a debt is outstanding `syncSenior` only observes: newcomers are covered again once it is cleared.
    ///      Junior's NAV is net of the debt (`carryOwed`) wherever junior is priced, so an exit priced at a partial-cover
    ///      settle bears its share. The `exposed != 0` guard is defensive (with nothing exposed nothing is owed). This
    ///      path never reverts: idle 0 pays 0 and carries it all.
    ///      Felix losses: Vault V2 never marks a Felix bad debt, so the gross price does not show it. The amount owed also
    ///      includes senior's share of the Felix `lostAssets` booked since the baseline: (lost now - lostBase) times
    ///      senior's share-of-Felix fraction from the exposure snapshot (`felixExp`, taken only by the agent or owner), scaled
    ///      to the exposed senior shares. Nothing a permissionless caller or a flow can move feeds it. `coverInProgress`
    ///      reads 0 for such a cover.
    function _coverSenior() internal returns (uint256 paid) {
        (uint256 price, uint256 denominator) = _seniorPriceAndDenominator();
        uint256 supply = senior.totalSupply();
        uint256 expected = _expectedSeniorPrice();
        uint256 baseSupply = supply;
        uint256 newCarry;
        (uint256 felixOwed, bool felixLoss) = _felixOwed();
        if ((price < expected || carryPerShare != 0 || felixLoss) && supply != 0) {
            uint256 exposed = _exposed(supply);
            uint256 owed = carryPerShare * exposed / PRICE_UNIT;
            if (price < expected) owed += (expected - price) * exposed / PRICE_UNIT;
            // exposed is capped at the exposure snapshot's supply: a flash-inflated baseline supply cannot scale the Felix term up
            if (felixLoss && felixExpSupply != 0) owed += felixOwed * (exposed < felixExpSupply ? exposed : felixExpSupply) / felixExpSupply;
            uint256 idle = asset.balanceOf(address(this));
            idle = idle > reservedAssets ? idle - reservedAssets : 0; // priced exits are fixed claims, not first loss
            paid = owed < idle ? owed : idle;
            if (paid != 0) asset.safeTransfer(address(senior), paid);
            if (owed != 0) emit Cover(owed, paid);
            price += paid * PRICE_UNIT / denominator; // what we just paid is idle USDC in senior; nothing else moved
            if (paid < owed) {
                emit CoverShortfallCarried(owed - paid);
                if (exposed != 0) {
                    newCarry = (owed - paid) * PRICE_UNIT / exposed;
                    baseSupply = exposed;
                }
            }
        }
        carryPerShare = newCarry;
        seniorPriceBase = price;
        seniorSupplyBase = baseSupply;
        seniorSupplyMin = baseSupply;
        _rebaseFelixLost();
        seniorBaseTime = block.timestamp;
    }

    /// @dev Senior shares that are still exposed to the loss: the smallest supply seen since the baseline.
    function _exposed(uint256 supply) internal view returns (uint256 exposed) {
        exposed = supply < seniorSupplyBase ? supply : seniorSupplyBase;
        if (seniorSupplyMin < exposed) exposed = seniorSupplyMin;
    }

    /// @notice USDC junior still owes senior from a partial cover, billed at the next settle. Junior's NAV is net of it.
    function carryOwed() public view returns (uint256) {
        if (carryPerShare == 0) return 0;
        return carryPerShare * _exposed(senior.totalSupply()) / PRICE_UNIT;
    }

    /// @notice Refresh the senior baseline while no loss is outstanding, so shares deposited since the last settle
    ///         become covered. Permissionless; the keeper calls it hourly. Below baseline, or while a partial-cover debt is
    ///         outstanding, it only lowers the observed minimum supply, so it can never be used after a loss to enlarge the bill.
    function syncSenior() external {
        _syncSenior();
    }

    function _syncSenior() internal {
        uint256 supply = _observeSenior();
        if (carryPerShare != 0) return; // a debt is outstanding: observe only, the baseline waits for the settle that clears it
        (, bool felixLoss) = _felixOwed();
        if (felixLoss) return; // a Felix loss is booked and not yet covered: observe only
        uint256 price = _seniorRealPrice();
        if (price < _expectedSeniorPrice()) return;
        seniorPriceBase = price;
        seniorSupplyBase = supply;
        seniorSupplyMin = supply;
        _rebaseFelixLost();
        seniorBaseTime = block.timestamp;
    }

    /// @notice Record senior's current share supply if it is the lowest since the baseline, so an exit followed by a
    ///         buy cannot be billed as one exposure. Permissionless, only ever lowers `seniorSupplyMin`; the keeper
    ///         calls it hourly. Every sync, deposit and settle observes as well.
    function observeSenior() external {
        _observeSenior();
    }

    function _observeSenior() internal returns (uint256 supply) {
        supply = senior.totalSupply();
        if (supply < seniorSupplyMin) seniorSupplyMin = supply;
    }

    /// @dev Baseline less the management fee drift, less 1 ppm so Vault V2 rounding never reads as a loss.
    function _expectedSeniorPrice() internal view returns (uint256) {
        uint256 elapsed = block.timestamp - seniorBaseTime;
        return seniorPriceBase - seniorPriceBase * senior.managementFee() * elapsed / WAD - seniorPriceBase / 1e6;
    }

    /// @dev Senior real assets per PRICE_UNIT shares, Vault V2 convention (virtual shares, +1 asset). GROSS: a Felix
    ///      (MetaMorpho v1.1) bad debt stays inside Felix's `totalAssets`, so this price does not show it, exactly like
    ///      Vault V2's own accounting. Used for the baselines and for `coverInProgress`; the Felix term is `_felixOwed`.
    function _seniorRealPrice() internal view returns (uint256 price) {
        (price,) = _seniorPriceAndDenominator();
    }

    function _seniorPriceAndDenominator() internal view returns (uint256 price, uint256 denominator) {
        uint256 real = asset.balanceOf(address(senior));
        uint256 n = senior.adaptersLength();
        for (uint256 i = 0; i < n; i++) {
            real += IAdapter(senior.adapters(i)).realAssets();
        }
        (,, uint256 pendingFeeShares) = senior.accrueInterestView(); // fee shares owed to us but not yet minted
        denominator = senior.totalSupply() + pendingFeeShares + senior.virtualShares();
        price = PRICE_UNIT * (real + 1) / denominator;
    }

    /// @dev USDC owed for the Felix losses booked since the baseline, in exposure-snapshot shares (multiply by exposed
    ///      shares over `felixExpSupply`): sum over entries of (lost now - lostBase) * fraction. Only `lostAssets` is read
    ///      live (one probe per entry; it only grows in v1.1 and moves on a real loss). `grew` is true when an entry's
    ///      amount is above 1 ppm of its reference assets, the same guard as the price baseline: smaller bumps, which
    ///      Felix books by rounding, never block a sync and are forgiven at the next reset. A failed probe counts as 0.
    function _felixOwed() internal view returns (uint256 owed, bool grew) {
        uint256 n = felixExp.length;
        for (uint256 i = 0; i < n; i++) {
            FelixExp storage f = felixExp[i];
            (bool ok, uint256 lost) = _probe(f.vault, IFelixProbes.lostAssets.selector, 0, false);
            if (!ok || lost <= f.lostBase) continue;
            uint256 amount = (lost - f.lostBase) * f.fraction / PRICE_UNIT;
            owed += amount;
            if (amount * 1e6 > f.assetsRef) grew = true;
        }
    }

    /// @dev At a baseline reset: Felix's `lostAssets` becomes the new base for every vault in the exposure snapshot.
    function _rebaseFelixLost() internal {
        uint256 n = felixExp.length;
        for (uint256 i = 0; i < n; i++) {
            FelixExp storage f = felixExp[i];
            (bool ok, uint256 lost) = _probe(f.vault, IFelixProbes.lostAssets.selector, 0, false);
            if (ok && lost <= type(uint96).max) f.lostBase = uint96(lost);
        }
    }

    /// @notice Re-take the Felix exposure: for each senior adapter that fronts a Felix vault, senior's share of that vault
    ///         (its shares over the vault's supply) and the adapter's assets, plus senior's supply now. Agent or owner only,
    ///         never a permissionless call, because the exposure is the one part a flash deposit could steer. The keeper
    ///         calls it hourly. A booked-but-unbilled loss is never forgiven here: a vault already in the snapshot keeps
    ///         its `lostBase`; only a vault new to the snapshot starts at its current `lostAssets`. Adapters that are gone
    ///         or fail a probe drop out.
    function snapFelixExposure() external {
        if (msg.sender != agent && msg.sender != owner()) revert NotAgent();
        _snapFelixExposure();
    }

    function _snapFelixExposure() internal {
        FelixExp[] memory old = felixExp;
        uint256 n = senior.adaptersLength();
        uint256 k;
        for (uint256 i = 0; i < n; i++) {
            (bool ok, FelixExp memory f) = _felixEntry(senior.adapters(i), old);
            if (!ok) continue;
            if (k < felixExp.length) felixExp[k] = f;
            else felixExp.push(f);
            k++;
        }
        while (felixExp.length > k) felixExp.pop();
        felixExpSupply = senior.totalSupply();
        emit FelixExposureSnapped(k, felixExpSupply);
    }

    /// @dev One adapter's exposure entry, or not ok when it is not a MetaMorpho wrapper or any probe fails.
    function _felixEntry(address adapter, FelixExp[] memory old) private view returns (bool, FelixExp memory f) {
        (bool ok, uint256 word) = _probe(adapter, IFelixProbes.morphoVaultV1.selector, 0, false);
        if (!ok || word > type(uint160).max) return (false, f);
        f.vault = address(uint160(word)); // a codeless or zero vault fails the probes below: they need a 32-byte answer
        uint256 lost;
        uint256 supply;
        uint256 shares;
        (ok, lost) = _probe(f.vault, IFelixProbes.lostAssets.selector, 0, false);
        if (!ok || lost > type(uint96).max) return (false, f);
        (ok, supply) = _probe(f.vault, IFelixProbes.totalSupply.selector, 0, false);
        if (!ok || supply > type(uint128).max) return (false, f);
        (ok, shares) = _probe(f.vault, IFelixProbes.balanceOf.selector, uint256(uint160(adapter)), true);
        if (!ok) return (false, f);
        for (uint256 j = 0; j < old.length; j++) {
            if (old[j].vault == f.vault) lost = old[j].lostBase; // never forgive a loss already booked
        }
        f.lostBase = uint96(lost);
        if (supply != 0) f.fraction = uint128(shares >= supply ? PRICE_UNIT : shares * PRICE_UNIT / supply);
        uint256 assets = IAdapter(adapter).realAssets();
        f.assetsRef = uint128(assets > type(uint128).max ? type(uint128).max : assets);
        return (true, f);
    }

    /// @dev staticcall with a gas cap (low level, because try/catch does not catch a malformed return or a call to an
    ///      address without code); the answer must be exactly 32 bytes and only those are copied, so a callee returning a
    ///      huge buffer costs this contract nothing beyond the callee's own capped gas.
    function _probe(address target, bytes4 selector, uint256 arg, bool hasArg) private view returns (bool ok, uint256 word) {
        uint256 g = PROBE_GAS;
        uint256 size = hasArg ? 36 : 4;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, selector)
            mstore(add(ptr, 4), arg)
            ok := staticcall(g, target, ptr, size, 0, 0)
            if ok {
                ok := eq(returndatasize(), 32)
                if ok {
                    returndatacopy(ptr, 0, 32)
                    word := mload(ptr)
                }
            }
        }
    }

    /// @notice USDC that senior's share price still has to recognise from the last cover. For the front end.
    ///         Reads 0 for a cover of a Felix bad debt: Vault V2 never marked that loss, so there is nothing to recognise.
    function coverInProgress() external view returns (uint256) {
        uint256 recognised = senior.convertToAssets(PRICE_UNIT);
        uint256 real = _seniorRealPrice();
        if (real <= recognised) return 0;
        return (real - recognised) * senior.totalSupply() / PRICE_UNIT;
    }

    /* VALUATION */

    /// @notice Idle USDC plus every allowlisted position, minus assets already owed to priced exits.
    ///         A venue whose view reverts counts as zero here (display never freezes); settle and deposit refuse
    ///         to act on an incomplete valuation, see _navComplete.
    function totalAssets() public view returns (uint256 total) {
        (total,) = _navComplete();
    }

    function _navComplete() internal view returns (uint256 total, bool complete) {
        complete = true;
        total = asset.balanceOf(address(this));
        for (uint256 i = 0; i < markets.length; i++) {
            try this.marketAssets(i) returns (uint256 a) {
                total += a;
            } catch {
                complete = false;
            }
        }
        for (uint256 i = 0; i < vaults.length; i++) {
            try this.vaultAssets(i) returns (uint256 a) {
                total += a;
            } catch {
                complete = false;
            }
        }
        total = total > reservedAssets ? total - reservedAssets : 0;
        uint256 owedToSenior = carryOwed(); // cover junior still owes is not junior's money
        total = total > owedToSenior ? total - owedToSenior : 0;
    }

    function marketAssets(uint256 i) external view returns (uint256) {
        return morpho.expectedSupplyAssets(markets[i], address(this));
    }

    function vaultAssets(uint256 i) external view returns (uint256) {
        IERC4626 v = IERC4626(vaults[i]);
        uint256 bal = v.balanceOf(address(this));
        if (address(v) == address(senior)) {
            // management-fee shares senior owes us but has not minted yet: ours already, so a deposit before settle cannot take them
            (,, uint256 pending) = senior.accrueInterestView();
            bal += pending;
        }
        return bal == 0 ? 0 : v.convertToAssets(bal);
    }

    /// @dev Mint at the worse of the frozen price and the live price, so a deposit just before settle cannot take
    ///      the epoch's accrued yield from earlier depositors.
    function _toShares(uint256 assets, uint256 nav) internal view returns (uint256) {
        uint256 supply = totalSupply() - pricedExitShares;
        uint256 live = supply == 0 ? WAD : nav * assetScale * WAD / supply;
        uint256 p = live > pricePerShare ? live : pricePerShare;
        if (p == 0) revert ZeroPrice(); // junior's NAV is wiped (net of any carried debt): nothing can be minted
        return assets * assetScale * WAD / p;
    }

    function settlesLength() external view returns (uint256) {
        return settles.length;
    }

    function marketsLength() external view returns (uint256) {
        return markets.length;
    }

    function vaultsLength() external view returns (uint256) {
        return vaults.length;
    }

    /* AGENT */

    /// @notice The only way the agent moves money. Target and selector must be allowlisted; the receiver word must be us.
    function execute(address target, bytes calldata data) external nonReentrant returns (bytes memory) {
        if (msg.sender != agent) revert NotAgent();
        if (data.length < 4) revert NotAllowed();
        if (target == address(stakeToken) && target != address(0)) revert NotAllowed();
        bytes4 selector = bytes4(data[:4]);
        if (selector == IERC20.approve.selector) {
            (address spender, uint256 amount) = abi.decode(data[4:], (address, uint256));
            // revoking is always allowed (a removed venue's allowance must be clearable); granting needs the rule
            if (amount != 0) {
                if (!approvals[target][spender]) revert NotAllowed();
                if (spender != address(morpho) && !isVault[spender]) revert NotAllowed(); // removed venues die at once
            }
        } else {
            VenueAdmin.Rule memory rule = rules[target][selector];
            if (!rule.allowed) revert NotAllowed();
            if (target == address(morpho)) {
                // every Morpho call starts with MarketParams: only registered markets, ever
                if (data.length < 4 + 160) revert NotAllowed();
                MarketParams memory mp = abi.decode(data[4:164], (MarketParams));
                if (!isMarket[mp.id()]) revert NotAllowed();
            } else if (!isVault[target]) {
                revert NotAllowed();
            }
            if (rule.receiverOffset != type(uint256).max) {
                uint256 off = 4 + rule.receiverOffset;
                if (data.length < off + 32) revert BadReceiver();
                address receiver = abi.decode(data[off:off + 32], (address));
                if (receiver != address(this)) revert BadReceiver();
            }
        }
        emit AgentCall(target, selector, 0);
        uint256 idleBefore = asset.balanceOf(address(this));
        bytes memory ret = Address.functionCall(target, data);
        uint256 idleAfter = asset.balanceOf(address(this));
        // the agent may never deploy USDC that priced exits are owed, nor what junior still owes senior from a partial cover
        if (idleAfter < idleBefore && idleAfter < reservedAssets + carryOwed()) revert InsufficientLiquidity();
        return ret;
    }

    /* OWNER */

    function setAgent(address agent_) external onlyOwner {
        agent = agent_;
        emit AgentSet(agent_);
    }

    function setRule(address target, bytes4 selector, bool allowed, uint256 receiverOffset) external onlyOwner {
        VenueAdmin.setRule(rules, isVault, address(morpho), target, selector, allowed, receiverOffset);
    }

    function setApprovalRule(address token, address spender, bool allowed) external onlyOwner {
        VenueAdmin.setApprovalRule(approvals, isVault, address(morpho), address(stakeToken), token, spender, allowed);
    }

    function addMarket(MarketParams calldata mp) external onlyOwner {
        VenueAdmin.addMarket(markets, isMarket, mp, address(asset));
    }

    function removeMarket(uint256 i) external onlyOwner {
        VenueAdmin.removeMarket(markets, isMarket, i, morpho, address(asset));
    }

    function removeVault(uint256 i) external onlyOwner {
        VenueAdmin.removeVault(vaults, isVault, i, address(asset));
    }

    /// @notice Drop a venue without calling it, for one whose view reverts. Any position there is abandoned
    ///         from the valuation on purpose; the agent can still not reach it afterwards.
    function forceRemoveMarket(uint256 i) external onlyOwner {
        VenueAdmin.forceRemoveMarket(markets, isMarket, i, address(morpho), address(asset));
        _pauseDeposits();
    }

    function forceRemoveVault(uint256 i) external onlyOwner {
        VenueAdmin.forceRemoveVault(vaults, isVault, i, address(asset));
        _pauseDeposits();
    }

    function addVault(address vault) external onlyOwner {
        VenueAdmin.addVault(vaults, isVault, vault, address(asset));
    }

    /// @notice One-way. Turns the stake gate on. Stakes are quoted in ORPH wei per 1 USDC (1e6).
    function setStakeToken(IERC20 token, uint256 stakePerAsset_) external onlyOwner {
        if (address(stakeToken) != address(0)) revert AlreadySet();
        if (address(token) == address(asset) || isVault[address(token)] || address(token) == address(morpho)) {
            revert WrongAsset();
        }
        stakeToken = token;
        stakePerAsset = stakePerAsset_;
        emit StakeTokenSet(address(token), stakePerAsset_);
    }

    /// @notice Propose a new stake rate (weekly, from the pool's 7-day average price). Applies after 3 days.
    function proposeStakePerAsset(uint256 stakePerAsset_) external onlyOwner {
        // one proposal moves the rate at most 2x either way (from a non-zero rate), so a mistyped or hostile value cannot
        // turn the stake into nothing or into a wall in one step; larger moves take several weekly steps
        uint256 cur = stakePerAsset;
        if (cur != 0 && (stakePerAsset_ < cur / 2 || stakePerAsset_ > cur * 2)) revert StakeRateOutOfBounds();
        pendingStakePerAsset = stakePerAsset_;
        stakeEta = block.timestamp + STAKE_TIMELOCK;
        emit StakePerAssetProposed(stakePerAsset_, stakeEta);
    }

    /// @notice Anyone may apply a matured proposal. Existing stakes are never re-quoted.
    function applyStakePerAsset() external {
        if (stakeEta == 0 || block.timestamp < stakeEta) revert TooSoon();
        stakePerAsset = pendingStakePerAsset;
        stakeEta = 0;
        pendingStakePerAsset = 0;
        emit StakePerAssetSet(stakePerAsset);
    }

    function cancelStakePerAsset() external onlyOwner {
        stakeEta = 0;
        pendingStakePerAsset = 0;
    }

    function setDepositCap(uint256 cap) external onlyOwner {
        depositCap = cap;
        emit DepositCapSet(cap);
    }

    function setWalletCap(uint256 cap) external onlyOwner {
        walletCap = cap;
        emit WalletCapSet(cap);
    }

    function setDepositsPaused(bool paused) external onlyOwner {
        depositsPaused = paused;
        emit DepositsPaused(paused);
    }

    /// @dev A forced removal abandons a position from the valuation: deposits stop until the owner re-lists and unpauses,
    ///      so nobody buys in at a NAV that no longer counts it.
    function _pauseDeposits() internal {
        depositsPaused = true;
        emit DepositsPaused(true);
    }
}
