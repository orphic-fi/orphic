// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {SwapParams} from "v4-core/types/PoolOperation.sol";
import {PoolSwapTest} from "v4-core/test/PoolSwapTest.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {SeedPool} from "../script/05_SeedPool.s.sol";
import {ORPH} from "../src/ORPH.sol";
import {Addresses} from "../script/Addresses.sol";

/// Runs the pool script against HyperEVM's live Uniswap v4, then buys ORPH with HYPE and checks the price.
contract SeedPoolTest is Test, Addresses {
    address deployer = 0x2DBE1Ba83084dAF698Acea79CBAfe0493f42FecC;
    uint256 constant HYPE_USD_E8 = 38_00000000; // $38.00, placeholder; the real run reads it live

    function test_seedPoolAndBuy() public {
        vm.createSelectFork(vm.envOr("HYPEREVM_RPC", string("https://rpc.hyperliquid.xyz/evm")), vm.envOr("FORK_BLOCK", uint256(50666000)));
        vm.deal(deployer, 10 ether);
        ORPH orph = new ORPH(deployer, 1_000_000_000e18);
        vm.setEnv("DEPLOYER", vm.toString(deployer));
        vm.setEnv("ORPH", vm.toString(address(orph)));
        vm.setEnv("HYPE_USD_E8", vm.toString(HYPE_USD_E8));

        SeedPool s = new SeedPool();
        s.run();

        (PoolKey memory key, uint160 sqrtP,,,) = s.plan(address(orph), HYPE_USD_E8, 5_000);
        // 400M ORPH stayed with the deployer (treasury, team, incentives in the real flow)
        assertApproxEqAbs(orph.balanceOf(deployer), 400_000_000e18, 1e6); // liquidity rounding leaves dust

        // buy ORPH with 1 HYPE through a plain swap router deployed for the test
        PoolSwapTest swapper = new PoolSwapTest(IPoolManager(s.POOL_MANAGER()));
        address buyer = makeAddr("buyer");
        vm.deal(buyer, 5 ether);
        vm.prank(buyer);
        swapper.swap{value: 1 ether}(
            key,
            SwapParams({zeroForOne: true, amountSpecified: -1 ether, sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1}),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );
        uint256 got = orph.balanceOf(buyer);
        // at $5k FDV and $38 HYPE, 1 HYPE buys about 7.6M ORPH before the 1% fee and price impact
        uint256 ideal = uint256(HYPE_USD_E8) * 1e9 * 1e18 / 5_000 / 1e8;
        console2.log("ORPH per 1 HYPE", got / 1e18, "ideal", ideal / 1e18);
        assertGt(got, ideal * 90 / 100);
        assertLt(got, ideal);
        // price moved up for ORPH (tick went down)
        (bool ok, bytes memory ret) =
            s.STATE_VIEW().staticcall(abi.encodeWithSignature("getSlot0(bytes32)", keccak256(abi.encode(key))));
        require(ok);
        (uint160 sqrtAfter,,,) = abi.decode(ret, (uint160, int24, uint24, uint24));
        assertLt(sqrtAfter, sqrtP);
    }

    function test_planIsDeterministic() public {
        SeedPool s = new SeedPool();
        (, uint160 sqrtP, int24 lo, int24 hi, uint128 liq) = s.plan(address(0xBEEF), HYPE_USD_E8, 5_000);
        // 1 HYPE = 7.6M ORPH -> sqrt(7.6e6) * 2^96 is about 2.18e32
        assertApproxEqRel(uint256(sqrtP), 2.184e32, 0.01e18);
        assertEq(lo, TickMath.minUsableTick(200));
        assertLt(hi, TickMath.getTickAtSqrtPrice(sqrtP));
        assertGt(liq, 0);
    }
}
