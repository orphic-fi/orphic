// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, Vm, console2} from "forge-std/Test.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {SwapParams, ModifyLiquidityParams} from "v4-core/types/PoolOperation.sol";
import {PoolSwapTest} from "v4-core/test/PoolSwapTest.sol";
import {PoolModifyLiquidityTest} from "v4-core/test/PoolModifyLiquidityTest.sol";
import {IPositionManager} from "v4-periphery/interfaces/IPositionManager.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {SeedPool} from "../script/05_SeedPool.s.sol";
import {SeedLauncher} from "../src/SeedLauncher.sol";
import {ORPH} from "../src/ORPH.sol";
import {Addresses} from "../script/Addresses.sol";

/// Runs the pool script against HyperEVM's live Uniswap v4, then buys ORPH with HYPE and checks the price.
/// The launcher cases pre-initialise the pool key like an outsider would (PoolManager.initialize is permissionless) and
/// check that 05 still seeds at the planned price, or reverts with nothing minted when the cap says so.
contract SeedPoolTest is Test, Addresses {
    address deployer = 0x2DBE1Ba83084dAF698Acea79CBAfe0493f42FecC;
    uint256 constant HYPE_USD_E8 = 38_00000000; // $38.00, placeholder; the real run reads it live
    address constant POSM = 0x0d7Ab5B3db668128Aff6F70C4eBC71D7d4DA9bf9;
    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    uint256 constant POOL_ORPH = 600_000_000e18;
    bytes32 constant SEEDED = keccak256("Seeded(uint256,address,uint256,uint256)");

    ORPH orph;
    SeedPool s;
    PoolKey key;
    uint160 sqrtP;
    int24 lo;
    int24 hi;
    uint128 planLiq;
    PoolModifyLiquidityTest mlr;

    receive() external payable {} // the liquidity router refunds the HYPE it did not need

    /// Fork, a fresh ORPH held by the deployer, SENIOR_SAFE turned into a (labelled) contract so 05's NFT owner check passes.
    function setUp() public {
        vm.createSelectFork(vm.envOr("HYPEREVM_RPC", string("https://rpc.hyperliquid.xyz/evm")), vm.envOr("FORK_BLOCK", uint256(50666000)));
        vm.deal(deployer, 10 ether);
        orph = new ORPH(deployer, 1_000_000_000e18);
        vm.etch(SENIOR_SAFE, hex"00");
        vm.label(SENIOR_SAFE, "SENIOR_SAFE (test stand-in contract; the real one is an EOA today)");
        s = new SeedPool();
        mlr = new PoolModifyLiquidityTest(IPoolManager(s.POOL_MANAGER()));
        (key, sqrtP, lo, hi, planLiq) = s.plan(address(orph), HYPE_USD_E8, 5_000);
    }

    /// forge's env is process-wide and tests interleave: every test calls this first, setting every var 05 reads.
    function _env(uint256 cap) internal {
        vm.setEnv("DEPLOYER", vm.toString(deployer));
        vm.setEnv("ORPH", vm.toString(address(orph)));
        vm.setEnv("HYPE_USD_E8", vm.toString(HYPE_USD_E8));
        vm.setEnv("HYPE_USD_REF_E8", vm.toString(HYPE_USD_E8));
        vm.setEnv("FDV_USD", "5000");
        vm.setEnv("NFT_OWNER", vm.toString(SENIOR_SAFE));
        vm.setEnv("SEED_CAP_ORPH", vm.toString(cap));
    }

    function _slot0() internal view returns (uint160 sqrtNow) {
        (bool ok, bytes memory ret) =
            s.STATE_VIEW().staticcall(abi.encodeWithSignature("getSlot0(bytes32)", keccak256(abi.encode(key))));
        require(ok);
        (sqrtNow,,,) = abi.decode(ret, (uint160, int24, uint24, uint24));
    }

    /// An outsider: initialises the key (anyone may) and, when asked, parks single-sided liquidity.
    function _attackerInit(int24 tick) internal {
        IPoolManager(s.POOL_MANAGER()).initialize(key, TickMath.getSqrtPriceAtTick(tick));
    }

    function _attackerHypeOnly(int24 a, int24 b, int256 liq) internal {
        mlr.modifyLiquidity{value: 50 ether}(key, ModifyLiquidityParams(a, b, liq, bytes32(0)), "");
    }

    /// The launcher alone, called directly, from a snapshot that is then reverted: its gas, spent ORPH and HYPE received.
    function _launcherAlone(uint256 cap) internal returns (uint256 gas, uint256 spent, uint256 hype) {
        uint256 snap = vm.snapshotState();
        vm.startPrank(deployer);
        SeedLauncher l = new SeedLauncher(IPoolManager(s.POOL_MANAGER()), IPositionManager(POSM), PERMIT2);
        orph.approve(address(l), POOL_ORPH);
        gas = gasleft();
        (, spent, hype) = l.seed(key, sqrtP, lo, hi, POOL_ORPH, cap, SENIOR_SAFE);
        gas -= gasleft();
        vm.stopPrank();
        assertEq(uint256(_slot0()), uint256(sqrtP), "launcher: price at the plan");
        vm.revertToState(snap);
    }

    function _assertSeededAtPlan(uint256 tokenId) internal view {
        assertEq(uint256(_slot0()), uint256(sqrtP), "price");
        assertEq(IERC721(POSM).ownerOf(tokenId), SENIOR_SAFE, "NFT owner");
    }

    function _liq(uint256 tokenId) internal view returns (uint128) {
        return IPositionManager(POSM).getPositionLiquidity(tokenId);
    }

    function _nothingMinted(uint256 nextId) internal view {
        assertEq(IPositionManager(POSM).nextTokenId(), nextId, "an NFT was minted");
        assertEq(orph.balanceOf(deployer), 1_000_000_000e18, "the seeder's ORPH moved");
        assertEq(orph.balanceOf(s.POOL_MANAGER()), 0, "ORPH reached the pool");
    }

    function test_seedPoolAndBuy() public {
        _env(0);
        s.run();
        uint256 tokenId = IPositionManager(POSM).nextTokenId() - 1;
        _assertSeededAtPlan(tokenId);
        assertEq(_liq(tokenId), planLiq);
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
        assertLt(_slot0(), sqrtP);
    }

    /// O1(a): pre-initialised 2,000 ticks below the opening tick, inside the range. The old multicall reverted here.
    function test_O1_preInitInsideRangeSeedsAtPlan() public {
        _env(0);
        _attackerInit(hi - 2000);
        (uint256 gas, uint256 spent, uint256 hype) = _launcherAlone(0);
        s.run();
        uint256 tokenId = IPositionManager(POSM).nextTokenId() - 1;
        _assertSeededAtPlan(tokenId);
        assertEq(_liq(tokenId), planLiq, "liquidity = plan");
        assertEq(spent, 0);
        assertEq(hype, 0);
        console2.log("O1 inside range: launcher.seed gas", gas);
    }

    /// O1(b): pre-initialised ABOVE the opening tick (ORPH cheaper). The empty gap is crossed for free.
    function test_O1_preInitAboveSeedsAtPlan() public {
        _env(0);
        _attackerInit(hi + 2000);
        (uint256 gas, uint256 spent, uint256 hype) = _launcherAlone(0);
        s.run();
        uint256 tokenId = IPositionManager(POSM).nextTokenId() - 1;
        _assertSeededAtPlan(tokenId);
        assertEq(_liq(tokenId), planLiq, "liquidity = plan");
        assertEq(spent + hype, 0);
        console2.log("O1 above: launcher.seed gas", gas);
    }

    /// 1 wei of HYPE-only liquidity in the way: with the default cap 0 05 reverts and mints nothing; a deliberate cap seeds.
    function test_O1_tinyGapWithCapZeroRevertsThenCapSeeds() public {
        _env(0);
        _attackerInit(hi - 2000);
        _attackerHypeOnly(hi - 1800, hi - 1600, 1); // liquidity 1: costs the attacker 1 wei of HYPE
        uint256 nextId = IPositionManager(POSM).nextTokenId();
        uint160 attackerSqrt = _slot0();

        vm.expectRevert(abi.encodeWithSelector(SeedLauncher.CapExceeded.selector, uint256(0)));
        s.run();
        vm.stopBroadcast(); // the reverted run never reached its own stopBroadcast
        assertEq(uint256(_slot0()), uint256(attackerSqrt), "price moved");
        _nothingMinted(nextId);

        _env(POOL_ORPH / 20);
        (uint256 gas, uint256 spent, uint256 hype) = _launcherAlone(POOL_ORPH / 20);
        s.run();
        uint256 tokenId = IPositionManager(POSM).nextTokenId() - 1;
        _assertSeededAtPlan(tokenId);
        assertGt(_liq(tokenId), 0);
        assertLe(_liq(tokenId), planLiq);
        assertGt(spent, 0);
        console2.log("O1 1-wei gap, cap 5%: ORPH spent (wei)", spent, "HYPE received (wei)", hype);
        console2.log("launcher.seed gas", gas);
    }

    /// O1(e): HYPE-only liquidity 1e24 in [hi-1800, hi-1600) after init at hi-2000. The launcher sells ORPH into it ABOVE the launch price.
    function test_O1_attackerGapIsPaidAboveLaunchPriceWithinFivePercentCap() public {
        _env(POOL_ORPH / 20);
        _attackerInit(hi - 2000);
        _attackerHypeOnly(hi - 1800, hi - 1600, 1e24);
        (uint256 gas,,) = _launcherAlone(POOL_ORPH / 20);

        vm.recordLogs();
        s.run();
        Vm.Log[] memory logs = vm.getRecordedLogs();
        uint256 spent;
        uint256 hype;
        for (uint256 i; i < logs.length; i++) {
            if (logs[i].topics[0] == SEEDED) (spent, hype) = abi.decode(logs[i].data, (uint256, uint256));
        }
        uint256 tokenId = IPositionManager(POSM).nextTokenId() - 1;
        _assertSeededAtPlan(tokenId);
        assertGt(spent, 0);
        assertLe(spent, POOL_ORPH / 20, "within the cap");
        assertGt(hype, 0);
        assertLt(_liq(tokenId), planLiq, "ORPH sold, so less to mint");
        // average FDV of the ORPH sold: 1e9 tokens * (HYPE per ORPH) * HYPE price in USD
        uint256 avgFdvUsdCents = 1e9 * hype * (HYPE_USD_E8 / 1e6) / spent; // USD cents
        console2.log("O1 attacker gap: ORPH spent (whole)", spent / 1e18, "HYPE received (1e-3)", hype / 1e15);
        console2.log("average FDV of the ORPH sold, USD cents", avgFdvUsdCents, "(launch FDV 500000)");
        console2.log("launcher.seed gas", gas);
        assertGt(avgFdvUsdCents, 5_000 * 100, "sold above the launch price");
    }

    /// A re-price that needs more than the cap reverts and mints nothing: the pool stays at the attacker's price.
    function test_O1_repriceAboveCapRevertsWithNothingMinted() public {
        _env(10_000_000e18);
        _attackerInit(hi - 2000);
        _attackerHypeOnly(hi - 1800, hi - 1600, 1e24); // needs well over 10M ORPH
        uint256 nextId = IPositionManager(POSM).nextTokenId();
        uint160 attackerSqrt = _slot0();
        vm.expectRevert(abi.encodeWithSelector(SeedLauncher.CapExceeded.selector, uint256(10_000_000e18)));
        s.run();
        vm.stopBroadcast();
        assertEq(uint256(_slot0()), uint256(attackerSqrt), "pool still at the attacker's price");
        _nothingMinted(nextId);
    }

    /// Initialised ABOVE the planned price with ORPH liquidity in the gap: the price must fall, which needs HYPE the
    /// launcher does not hold. A clean revert, nothing settled.
    function test_O1_hypeInDirectionWithLiquidityRevertsCleanly() public {
        _env(0);
        _attackerInit(hi + 2000);
        deal(address(orph), address(this), 100_000_000e18);
        orph.approve(address(mlr), type(uint256).max);
        mlr.modifyLiquidity(key, ModifyLiquidityParams(hi + 400, hi + 600, 1e22, bytes32(0)), ""); // ORPH only: below x's price
        uint256 nextId = IPositionManager(POSM).nextTokenId();
        vm.expectRevert(SeedLauncher.PriceBlockedAbove.selector);
        s.run();
        assertEq(IPositionManager(POSM).nextTokenId(), nextId);
        assertEq(orph.balanceOf(deployer), 1_000_000_000e18);
    }

    /// O4(d): the position NFT must sit in a contract. An EOA (today's SENIOR_SAFE on mainnet) is refused before anything is broadcast.
    function test_O4d_eoaNftOwnerReverts() public {
        _env(0);
        vm.setEnv("NFT_OWNER", vm.toString(makeAddr("an EOA")));
        uint256 nextId = IPositionManager(POSM).nextTokenId();
        vm.expectRevert(bytes("NFT_OWNER has no code: the position NFT must sit in a Safe or timelock"));
        s.run();
        // the default owner (SENIOR_SAFE) without code is refused the same way
        vm.etch(SENIOR_SAFE, "");
        vm.setEnv("NFT_OWNER", vm.toString(SENIOR_SAFE));
        vm.expectRevert(bytes("NFT_OWNER has no code: the position NFT must sit in a Safe or timelock"));
        s.run();
        assertEq(IPositionManager(POSM).nextTokenId(), nextId, "nothing was minted");
        assertEq(orph.balanceOf(deployer), 1_000_000_000e18, "nothing moved");
    }

    /// Review 1 (L3): an EIP-7702 delegated EOA (code = 0xef0100 || address) is still an EOA.
    function test_O4d_eip7702DelegatedOwnerReverts() public {
        _env(0);
        address delegated = makeAddr("7702 EOA");
        vm.etch(delegated, abi.encodePacked(hex"ef0100", address(mlr)));
        assertEq(delegated.code.length, 23);
        vm.setEnv("NFT_OWNER", vm.toString(delegated));
        vm.expectRevert(bytes("NFT_OWNER is an EIP-7702 delegated EOA, not a contract"));
        s.run();
    }

    /// O4(d): a contract owner other than SENIOR_SAFE works and receives the NFT.
    function test_O4d_contractNftOwnerReceivesTheNft() public {
        _env(0);
        address safe = address(mlr); // any contract: stands in for a Safe or a timelock
        vm.setEnv("NFT_OWNER", vm.toString(safe));
        s.run();
        assertEq(IERC721(POSM).ownerOf(IPositionManager(POSM).nextTokenId() - 1), safe);
    }

    function _price(uint256 price, uint256 ref) internal {
        _env(0);
        vm.setEnv("HYPE_USD_E8", vm.toString(price));
        vm.setEnv("HYPE_USD_REF_E8", vm.toString(ref));
    }

    /// O2(c): HYPE_USD_E8 must be within 20% of the independent reference.
    function test_O2c_priceBand() public {
        uint256 ref = HYPE_USD_E8;
        bytes memory band = bytes("HYPE_USD_E8 is more than 20% from HYPE_USD_REF_E8");
        uint256[4] memory bad = [ref * 10, ref / 10, ref * 121 / 100, ref * 79 / 100]; // x10, /10, +21%, -21%
        for (uint256 i; i < bad.length; i++) {
            _price(bad[i], ref);
            vm.expectRevert(band);
            s.run();
        }
        uint256[2] memory edge = [ref * 120 / 100, ref * 80 / 100]; // +20%, -20%: pass and seed
        for (uint256 i; i < edge.length; i++) {
            uint256 snap = vm.snapshotState();
            _price(edge[i], ref);
            s.run();
            assertEq(IERC721(POSM).ownerOf(IPositionManager(POSM).nextTokenId() - 1), SENIOR_SAFE);
            vm.revertToState(snap);
        }
    }

    function test_planIsDeterministic() public {
        (, uint160 sqrtP0, int24 lo0, int24 hi0, uint128 liq) = s.plan(address(0xBEEF), HYPE_USD_E8, 5_000);
        // 1 HYPE = 7.6M ORPH -> sqrt(7.6e6) * 2^96 is about 2.18e32
        assertApproxEqRel(uint256(sqrtP0), 2.184e32, 0.01e18);
        assertEq(lo0, TickMath.minUsableTick(200));
        assertLt(hi0, TickMath.getTickAtSqrtPrice(sqrtP0));
        assertGt(liq, 0);
    }
}
