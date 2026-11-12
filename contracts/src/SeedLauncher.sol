// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "v4-core/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {SwapParams} from "v4-core/types/PoolOperation.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {StateLibrary} from "v4-core/libraries/StateLibrary.sol";
import {PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {IPositionManager} from "v4-periphery/interfaces/IPositionManager.sol";
import {Actions} from "v4-periphery/libraries/Actions.sol";
import {LiquidityAmounts} from "v4-periphery/libraries/LiquidityAmounts.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";

/// @notice Atomic launcher for the ORPH pool (native HYPE = currency0, ORPH = currency1). One transaction, one
///         `PoolManager.unlock`: initialise the key at the planned price if it is uninitialised; if anyone initialised
///         it elsewhere, move it to the planned price with an exact-input swap whose price limit is the planned price
///         (an EMPTY pool moves no tokens); then mint the single-sided ORPH position through
///         `PositionManager.modifyLiquiditiesWithoutUnlock` (MINT_POSITION + SETTLE_PAIR) with the ORPH left.
///         Nothing can land between the re-price and the mint.
///
///         The cap is the only rule. If liquidity sits between the pool's price and the planned price and the price
///         must RISE, the swap sells ORPH into it, above the launch price (whoever parked it pays). `seed` reverts
///         with `CapExceeded` when that needs more than `cap` ORPH, and nothing is minted. There is no other refusal.
///
///         If the pool was initialised ABOVE the planned price the price must FALL, which takes HYPE in. The launcher
///         holds none and never takes any: an empty gap passes for free, liquidity in the gap reverts with
///         `PriceBlockedAbove` (before anything is settled).
///
///         Anyone may call `seed` and supplies the ORPH, the plan and the NFT owner; the caller gets back the
///         unspent ORPH and any HYPE the re-price earned. `unlockCallback` serves only the PoolManager, and the
///         PoolManager calls it only for an unlock this contract started, so no outsider reaches it; a nested `seed`
///         inside the callback hits `AlreadyUnlocked`. The launcher keeps no balance and no state between calls.
///         The caller must have approved this contract for `orphIn` ORPH.
contract SeedLauncher is IUnlockCallback {
    using StateLibrary for IPoolManager;
    using PoolIdLibrary for PoolKey;

    IPoolManager public immutable pm;
    IPositionManager public immutable posm;
    address public immutable permit2;

    error NotPoolManager();
    error NotNativePair();
    error CapAboveInput();
    error CapExceeded(uint256 cap);
    error PriceBlockedAbove();
    error RefundFailed();

    struct Plan {
        PoolKey key;
        uint160 sqrtP;
        int24 lo;
        int24 hi;
        address nftOwner;
        uint256 orphIn;
        uint256 cap;
    }

    event Seeded(uint256 indexed tokenId, address indexed nftOwner, uint256 orphSpent, uint256 hypeReceived);

    constructor(IPoolManager pm_, IPositionManager posm_, address permit2_) {
        pm = pm_;
        posm = posm_;
        permit2 = permit2_;
    }

    receive() external payable {}

    function seed(PoolKey calldata key, uint160 sqrtP, int24 lo, int24 hi, uint256 orphIn, uint256 cap, address nftOwner)
        external
        returns (uint256 tokenId, uint256 orphSpent, uint256 hypeReceived)
    {
        if (Currency.unwrap(key.currency0) != address(0)) revert NotNativePair();
        if (cap > orphIn) revert CapAboveInput();
        address orph = Currency.unwrap(key.currency1);
        IERC20(orph).transferFrom(msg.sender, address(this), orphIn);
        IERC20(orph).approve(permit2, orphIn);
        IAllowanceTransfer(permit2).approve(orph, address(posm), uint160(orphIn), uint48(block.timestamp + 1 hours));
        tokenId = posm.nextTokenId();
        bytes memory ret = pm.unlock(abi.encode(Plan(key, sqrtP, lo, hi, nftOwner, orphIn, cap)));
        (orphSpent, hypeReceived) = abi.decode(ret, (uint256, uint256));
        uint256 left = IERC20(orph).balanceOf(address(this));
        if (left != 0) IERC20(orph).transfer(msg.sender, left);
        if (address(this).balance != 0) {
            (bool ok,) = msg.sender.call{value: address(this).balance}("");
            if (!ok) revert RefundFailed();
        }
        emit Seeded(tokenId, nftOwner, orphSpent, hypeReceived);
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(pm)) revert NotPoolManager();
        Plan memory p = abi.decode(data, (Plan));
        uint256 spent;
        uint256 hype;
        (uint160 cur,,,) = pm.getSlot0(p.key.toId());
        if (cur == 0) {
            pm.initialize(p.key, p.sqrtP);
        } else if (cur != p.sqrtP) {
            // price too high: sell HYPE (zeroForOne), takes 1 wei at most and only an empty gap lets it through;
            // price too low: sell ORPH (oneForZero) up to the cap (at least 1 wei: v4 refuses a zero amount)
            bool zeroForOne = cur > p.sqrtP;
            uint256 amountIn = zeroForOne ? 1 : (p.cap == 0 ? 1 : p.cap);
            BalanceDelta d = pm.swap(p.key, SwapParams(zeroForOne, -int256(amountIn), p.sqrtP), "");
            (uint160 after_,,,) = pm.getSlot0(p.key.toId());
            if (zeroForOne) {
                // the launcher holds no HYPE and takes no ORPH out of the pool: any trade here is liquidity in the way
                if (after_ != p.sqrtP || d.amount0() != 0 || d.amount1() != 0) revert PriceBlockedAbove();
            } else {
                if (after_ != p.sqrtP) revert CapExceeded(p.cap);
                if (d.amount1() < 0) spent = uint256(uint128(-d.amount1()));
                if (spent > p.cap) revert CapExceeded(p.cap);
                if (d.amount0() > 0) hype = uint256(uint128(d.amount0()));
            }
            if (spent != 0) {
                pm.sync(p.key.currency1);
                IERC20(Currency.unwrap(p.key.currency1)).transfer(address(pm), spent);
                pm.settle();
            }
            if (hype != 0) pm.take(p.key.currency0, address(this), hype);
        }
        address orph = Currency.unwrap(p.key.currency1);
        uint256 bal = p.orphIn - spent;
        uint128 liq = LiquidityAmounts.getLiquidityForAmount1(
            TickMath.getSqrtPriceAtTick(p.lo), TickMath.getSqrtPriceAtTick(p.hi), bal
        );
        bytes memory actions = abi.encodePacked(uint8(Actions.MINT_POSITION), uint8(Actions.SETTLE_PAIR));
        bytes[] memory params = new bytes[](2);
        params[0] = abi.encode(p.key, p.lo, p.hi, liq, uint128(0), uint128(bal), p.nftOwner, "");
        params[1] = abi.encode(p.key.currency0, p.key.currency1);
        posm.modifyLiquiditiesWithoutUnlock(actions, params);
        return abi.encode(spent, hype);
    }
}
