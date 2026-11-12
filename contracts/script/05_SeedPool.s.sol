// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {IPositionManager} from "v4-periphery/interfaces/IPositionManager.sol";
import {LiquidityAmounts} from "v4-periphery/libraries/LiquidityAmounts.sol";
import {SeedLauncher} from "../src/SeedLauncher.sol";
import {Addresses} from "./Addresses.sol";

/// Step 5. One Uniswap v4 pool on HyperEVM: native HYPE / ORPH, 1% fee, tick spacing 200, no hook.
/// Single-sided ORPH position (all 600M) from the minimum tick up to the opening price, owned by NFT_OWNER (a contract).
/// Buyers push the price down in ORPH-per-HYPE terms (ORPH gets dearer) and walk into the range.
///
/// Three transactions: deploy the SeedLauncher, ORPH.approve(launcher, 600M), launcher.seed(...). The seed is ONE
/// PoolManager.unlock: initialise the pool, or re-price it if someone initialised it elsewhere, then mint. A pre-initialised
/// pool cannot block it. If liquidity sits in the way of the re-price the launcher sells it ORPH above the launch price, up
/// to SEED_CAP_ORPH, and reverts above that (nothing is minted).
///
/// Env: DEPLOYER (holds the 600M ORPH; the hardware wallet), ORPH, HYPE_USD_E8 (HYPE price in USD with 8 decimals,
///      read from the Morpho API at deploy time), HYPE_USD_REF_E8 (the same price from an INDEPENDENT source; the script
///      refuses a difference over 20%), FDV_USD (default 5000), NFT_OWNER (default SENIOR_SAFE; must have code: a Safe or
///      timelock, never an EOA), SEED_CAP_ORPH (wei, default 0 = refuse any re-price that sells ORPH; <= 600M ORPH).
///      Uniswap v4 addresses verified on-chain 7 Nov.
contract SeedPool is Script, Addresses {
    address public constant POOL_MANAGER = 0x12D4Fd9C5DeDd00ab8a0bCe2CF0167bbf94b6B1F;
    address constant POSITION_MANAGER = 0x0d7Ab5B3db668128Aff6F70C4eBC71D7d4DA9bf9;
    address public constant STATE_VIEW = 0x1656326235cb9E34Cb58CaDe53AE30789AB32A1A;
    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    uint24 constant FEE = 10_000; // 1%
    int24 constant SPACING = 200;
    uint256 constant POOL_ORPH = 600_000_000e18;
    uint256 constant SUPPLY = 1_000_000_000e18;

    struct Launch {
        address deployer;
        address orph;
        PoolKey key;
        uint160 sqrtP;
        int24 lo;
        int24 hi;
        uint128 liquidity;
        uint256 cap;
        address nftOwner;
    }

    struct Result {
        uint256 tokenId;
        uint256 spent;
        uint256 hype;
    }

    function run() external {
        Launch memory l;
        l.deployer = vm.envAddress("DEPLOYER");
        l.orph = vm.envAddress("ORPH");
        uint256 hypeUsdE8 = vm.envUint("HYPE_USD_E8");
        l.nftOwner = vm.envOr("NFT_OWNER", SENIOR_SAFE);
        l.cap = vm.envOr("SEED_CAP_ORPH", uint256(0));
        require(l.nftOwner.code.length > 0, "NFT_OWNER has no code: the position NFT must sit in a Safe or timelock");
        _requireBand(hypeUsdE8, vm.envUint("HYPE_USD_REF_E8"));
        require(l.cap <= POOL_ORPH, "SEED_CAP_ORPH above the pool ORPH");
        require(IERC20(l.orph).balanceOf(l.deployer) >= POOL_ORPH, "deployer lacks the pool ORPH");
        console2.log("SEED_CAP_ORPH  ", l.cap);

        (l.key, l.sqrtP, l.lo, l.hi, l.liquidity) = plan(l.orph, hypeUsdE8, vm.envOr("FDV_USD", uint256(5_000)));

        vm.startBroadcast(l.deployer);
        SeedLauncher launcher =
            new SeedLauncher(IPoolManager(POOL_MANAGER), IPositionManager(POSITION_MANAGER), PERMIT2);
        vm.stopBroadcast();

        Result memory r;
        vm.startBroadcast(l.deployer);
        IERC20(l.orph).approve(address(launcher), POOL_ORPH);
        (r.tokenId, r.spent, r.hype) = launcher.seed(l.key, l.sqrtP, l.lo, l.hi, POOL_ORPH, l.cap, l.nftOwner);
        vm.stopBroadcast();

        console2.log("launcher  ", address(launcher));
        console2.log("tokenId   ", r.tokenId);
        console2.log("tickLower ", l.lo);
        console2.log("tickUpper ", l.hi);
        console2.log("liquidity ", l.liquidity);
        console2.log("ORPH spent re-pricing", r.spent);
        console2.log("HYPE received        ", r.hype);
        _verify(l, r);
    }

    function _requireBand(uint256 hypeUsdE8, uint256 refE8) internal view {
        uint256 diff = hypeUsdE8 > refE8 ? hypeUsdE8 - refE8 : refE8 - hypeUsdE8;
        require(diff * 100 <= 20 * refE8, "HYPE_USD_E8 is more than 20% from HYPE_USD_REF_E8");
        console2.log("HYPE_USD_E8    ", hypeUsdE8);
        console2.log("HYPE_USD_REF_E8", refE8);
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

    function _verify(Launch memory l, Result memory r) internal view {
        bytes32 poolId = keccak256(abi.encode(l.key));
        (bool ok, bytes memory ret) = STATE_VIEW.staticcall(abi.encodeWithSignature("getSlot0(bytes32)", poolId));
        require(ok, "pool not initialised");
        (uint160 sqrtPriceX96,,, uint24 lpFee) = abi.decode(ret, (uint160, int24, uint24, uint24));
        require(sqrtPriceX96 == l.sqrtP && lpFee == FEE, "pool state");
        (ok, ret) = POSITION_MANAGER.staticcall(abi.encodeWithSignature("ownerOf(uint256)", r.tokenId));
        require(ok && abi.decode(ret, (address)) == l.nftOwner, "position owner");
        (ok, ret) = POSITION_MANAGER.staticcall(abi.encodeWithSignature("getPositionLiquidity(uint256)", r.tokenId));
        require(ok, "position liquidity");
        uint128 minted = abi.decode(ret, (uint128));
        if (r.spent == 0) require(minted == l.liquidity, "position liquidity");
        else require(minted > 0 && minted <= l.liquidity, "position liquidity");
        require(r.spent <= l.cap, "ORPH spent above the cap");
        uint256 inPool = IERC20(l.orph).balanceOf(POOL_MANAGER);
        require(inPool >= POOL_ORPH - POOL_ORPH / 1e6 && inPool <= POOL_ORPH, "ORPH in pool");
        console2.log("poolId    ", vm.toString(poolId));
        console2.log("verify: ok");
    }
}
