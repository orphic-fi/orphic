// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {IPositionManager} from "v4-periphery/interfaces/IPositionManager.sol";
import {IPoolInitializer_v4} from "v4-periphery/interfaces/IPoolInitializer_v4.sol";
import {Actions} from "v4-periphery/libraries/Actions.sol";
import {LiquidityAmounts} from "v4-periphery/libraries/LiquidityAmounts.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";
import {Addresses} from "./Addresses.sol";

/// Step 5. One Uniswap v4 pool on HyperEVM: native HYPE / ORPH, 1% fee, tick spacing 200, no hook.
/// Single-sided ORPH position (all 600M) from the minimum tick up to the opening price, owned by the Safe.
/// Buyers push the price down in ORPH-per-HYPE terms (ORPH gets dearer) and walk into the range.
///
/// Env: DEPLOYER (holds the 600M ORPH; the hardware wallet), ORPH, HYPE_USD_E8 (HYPE price in USD with 8 decimals,
///      read from the Morpho API at deploy time), FDV_USD (default 5000). Uniswap v4 addresses verified on-chain 7 Nov.
contract SeedPool is Script, Addresses {
    address public constant POOL_MANAGER = 0x12D4Fd9C5DeDd00ab8a0bCe2CF0167bbf94b6B1F;
    address constant POSITION_MANAGER = 0x0d7Ab5B3db668128Aff6F70C4eBC71D7d4DA9bf9;
    address public constant STATE_VIEW = 0x1656326235cb9E34Cb58CaDe53AE30789AB32A1A;
    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    uint24 constant FEE = 10_000; // 1%
    int24 constant SPACING = 200;
    uint256 constant POOL_ORPH = 600_000_000e18;
    uint256 constant SUPPLY = 1_000_000_000e18;

    function run() external {
        address deployer = vm.envAddress("DEPLOYER");
        address orph = vm.envAddress("ORPH");
        uint256 hypeUsdE8 = vm.envUint("HYPE_USD_E8");
        uint256 fdvUsd = vm.envOr("FDV_USD", uint256(5_000));
        require(IERC20(orph).balanceOf(deployer) >= POOL_ORPH, "deployer lacks the pool ORPH");

        (PoolKey memory key, uint160 sqrtPriceX96, int24 tickLower, int24 tickUpper, uint128 liquidity) =
            plan(orph, hypeUsdE8, fdvUsd);

        bytes memory actions = abi.encodePacked(uint8(Actions.MINT_POSITION), uint8(Actions.SETTLE_PAIR));
        bytes[] memory params = new bytes[](2);
        params[0] = abi.encode(key, tickLower, tickUpper, liquidity, uint128(0), uint128(POOL_ORPH), SENIOR_SAFE, "");
        params[1] = abi.encode(key.currency0, key.currency1);
        bytes[] memory calls = new bytes[](2);
        calls[0] = abi.encodeWithSelector(IPoolInitializer_v4.initializePool.selector, key, sqrtPriceX96);
        calls[1] = abi.encodeWithSelector(
            IPositionManager.modifyLiquidities.selector, abi.encode(actions, params), block.timestamp + 1 hours
        );

        uint256 nextTokenId = IPositionManager(POSITION_MANAGER).nextTokenId();
        vm.startBroadcast(deployer);
        IERC20(orph).approve(PERMIT2, POOL_ORPH);
        IAllowanceTransfer(PERMIT2).approve(orph, POSITION_MANAGER, uint160(POOL_ORPH), uint48(block.timestamp + 1 hours));
        IPositionManager(POSITION_MANAGER).multicall(calls);
        vm.stopBroadcast();

        console2.log("tokenId   ", nextTokenId);
        console2.log("tickLower ", tickLower);
        console2.log("tickUpper ", tickUpper);
        console2.log("liquidity ", liquidity);
        _verify(key, orph, nextTokenId, sqrtPriceX96, liquidity);
    }

    /// Opening price: ORPH per HYPE such that SUPPLY is worth fdvUsd. Both tokens have 18 decimals.
    function plan(address orph, uint256 hypeUsdE8, uint256 fdvUsd)
        public
        pure
        returns (PoolKey memory key, uint160 sqrtPriceX96, int24 tickLower, int24 tickUpper, uint128 liquidity)
    {
        key = PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(orph),
            fee: FEE,
            tickSpacing: SPACING,
            hooks: IHooks(address(0))
        });
        // orphPerHype = hypeUsd / orphUsd = hypeUsd * SUPPLY / fdvUsd (SUPPLY in whole tokens)
        uint256 orphPerHypeE8 = hypeUsdE8 * (SUPPLY / 1e18) / fdvUsd; // 8 decimals
        // sqrtPriceX96 = sqrt(price) * 2^96 = sqrt(priceE8 * 2^192 / 1e8)
        sqrtPriceX96 = uint160(Math.sqrt(Math.mulDiv(orphPerHypeE8, 1 << 192, 1e8)));
        int24 tick = TickMath.getTickAtSqrtPrice(sqrtPriceX96);
        // all-ORPH range: tickUpper at or below the current tick, tickLower at the minimum usable tick
        tickUpper = (tick / SPACING) * SPACING;
        if (tickUpper > tick) tickUpper -= SPACING;
        if (tickUpper == tick) tickUpper -= SPACING; // strictly below, so the position holds no HYPE at all
        tickLower = TickMath.minUsableTick(SPACING);
        liquidity = LiquidityAmounts.getLiquidityForAmount1(
            TickMath.getSqrtPriceAtTick(tickLower), TickMath.getSqrtPriceAtTick(tickUpper), POOL_ORPH
        );
    }

    function _verify(PoolKey memory key, address orph, uint256 tokenId, uint160 expectedSqrt, uint128 liquidity)
        internal
        view
    {
        bytes32 poolId = keccak256(abi.encode(key));
        (bool ok, bytes memory ret) = STATE_VIEW.staticcall(abi.encodeWithSignature("getSlot0(bytes32)", poolId));
        require(ok, "pool not initialised");
        (uint160 sqrtPriceX96,,, uint24 lpFee) = abi.decode(ret, (uint160, int24, uint24, uint24));
        require(sqrtPriceX96 == expectedSqrt && lpFee == FEE, "pool state");
        (ok, ret) = POSITION_MANAGER.staticcall(abi.encodeWithSignature("ownerOf(uint256)", tokenId));
        require(ok && abi.decode(ret, (address)) == SENIOR_SAFE, "position owner");
        (ok, ret) = POSITION_MANAGER.staticcall(abi.encodeWithSignature("getPositionLiquidity(uint256)", tokenId));
        require(ok && abi.decode(ret, (uint128)) == liquidity, "position liquidity");
        uint256 inPool = IERC20(orph).balanceOf(POOL_MANAGER);
        require(inPool >= POOL_ORPH - POOL_ORPH / 1e6 && inPool <= POOL_ORPH, "ORPH in pool");
        console2.log("poolId    ", vm.toString(poolId));
        console2.log("verify: ok");
    }
}
