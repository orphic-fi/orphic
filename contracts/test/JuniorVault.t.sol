// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./Base.t.sol";
import {IMorphoBase} from "morpho-blue/interfaces/IMorpho.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IOracle} from "morpho-blue/interfaces/IOracle.sol";

contract JuniorVaultTest is Base {
    /* 1 */
    function test_seniorIsRealVaultV2AndDepositLandsInFelix() public {
        assertTrue(V2_FACTORY.isVaultV2(address(senior)));
        _seniorDeposit(alice, 100_000e6);
        assertApproxEqAbs(senior.totalAssets(), 100_000e6, 2);
        // deposit went straight to the liquidity adapter (Felix), not idle
        assertLt(USDC.balanceOf(address(senior)), 10);
        assertGt(IERC4626(FELIX_USDC_V1).balanceOf(felixAdapter), 0);
    }

    /* 2 */
    function test_depositMintsAtFrozenPriceAndSeedExists() public {
        assertEq(junior.balanceOf(address(0xdead)), 1e18); // 1 USDC seed at price 1
        uint256 shares = _juniorDeposit(alice, 10_000e6);
        assertEq(shares, 10_000e18);
        // a donation mid-epoch raises the live price; new depositors pay it, existing holders keep the gain
        vm.prank(bob);
        USDC.transfer(address(junior), 5_000e6);
        uint256 bobShares = _juniorDeposit(bob, 1_000e6);
        assertLt(bobShares, 1_000e18);
        assertApproxEqRel(bobShares, uint256(1_000e18) * 10_001 / 15_001, 1e14);
        assertEq(junior.pricePerShare(), WAD); // frozen exit price unchanged until settle
    }

    /* 3 */
    function test_depositCapEnforced() public {
        _juniorDeposit(alice, 499_999e6);
        vm.startPrank(alice);
        USDC.approve(address(junior), 10e6);
        vm.expectRevert(JuniorVault.CapExceeded.selector);
        junior.deposit(10e6, alice);
        vm.stopPrank();
    }

    /* 3b */
    function test_walletCapPerReceiver() public {
        vm.prank(owner);
        junior.setWalletCap(10_000e6);
        _juniorDeposit(alice, 9_000e6);
        vm.startPrank(alice);
        USDC.approve(address(junior), 2_000e6);
        vm.expectRevert(JuniorVault.CapExceeded.selector);
        junior.deposit(1_500e6, alice);
        junior.deposit(1_000e6, alice); // exactly at the cap is fine
        // shares parked in an exit request still count
        junior.requestExit(5_000e18);
        USDC.approve(address(junior), 1e6);
        vm.expectRevert(JuniorVault.CapExceeded.selector);
        junior.deposit(1e6, alice);
        vm.stopPrank();
        _juniorDeposit(bob, 10_000e6); // other wallets unaffected
        vm.prank(owner);
        junior.setWalletCap(0); // week two: off
        _juniorDeposit(alice, 5_000e6);
    }

    /* 4 */
    function test_pauseBlocksDepositsOnly() public {
        _juniorDeposit(alice, 1_000e6);
        vm.prank(owner);
        junior.setDepositsPaused(true);
        vm.startPrank(alice);
        USDC.approve(address(junior), 1e6);
        vm.expectRevert(JuniorVault.Paused.selector);
        junior.deposit(1e6, alice);
        junior.requestExit(1_000e18); // still works
        vm.stopPrank();
        vm.warp(block.timestamp + 8 days);
        junior.settle(); // still works
        vm.prank(alice);
        junior.claimExit(); // still works
        assertEq(USDC.balanceOf(alice), 1_000_000e6);
    }

    /* 5 */
    function test_stakeGateOffThenOnOneWayAndReleased() public {
        _juniorDeposit(alice, 1_000e6); // no stake needed yet
        assertEq(junior.stakeOf(alice), 0);
        vm.prank(owner);
        junior.setStakeToken(IERC20(address(orph)), 0.2e18); // 0.2 ORPH per USDC, i.e. 20% at 1 ORPH = 1 USDC
        vm.prank(owner);
        vm.expectRevert(JuniorVault.AlreadySet.selector);
        junior.setStakeToken(IERC20(address(orph)), 1);
        // bob must stake
        vm.startPrank(bob);
        USDC.approve(address(junior), 1_000e6);
        vm.expectRevert();
        junior.deposit(1_000e6, bob);
        vm.stopPrank();
        _juniorDeposit(bob, 1_000e6);
        assertEq(junior.stakeOf(bob), 200e18);
        // full exit returns the whole stake
        vm.prank(bob);
        junior.requestExit(1_000e18);
        vm.warp(block.timestamp + 8 days);
        junior.settle();
        vm.prank(bob);
        junior.claimExit();
        assertEq(orph.balanceOf(bob), 200e18);
        assertEq(junior.stakeOf(bob), 0);
    }

    /* 5b */
    function test_stakeRateChangesWaitThreeDays() public {
        vm.prank(owner);
        junior.setStakeToken(IERC20(address(orph)), 0.2e18);
        vm.prank(owner);
        junior.proposeStakePerAsset(0.4e18);
        vm.expectRevert(JuniorVault.TooSoon.selector);
        junior.applyStakePerAsset();
        assertEq(junior.stakePerAsset(), 0.2e18); // deposits still at the old rate
        _juniorDeposit(alice, 1_000e6);
        assertEq(junior.stakeOf(alice), 200e18);
        vm.warp(block.timestamp + 3 days);
        junior.applyStakePerAsset(); // anyone
        assertEq(junior.stakePerAsset(), 0.4e18);
        _juniorDeposit(bob, 1_000e6);
        assertEq(junior.stakeOf(bob), 400e18);
        assertEq(junior.stakeOf(alice), 200e18); // never re-quoted
    }

    /* 6 */
    function test_exitNoticeThenPricedAtFirstSettleAfterReady() public {
        _juniorDeposit(alice, 10_000e6);
        vm.prank(alice);
        junior.requestExit(4_000e18);
        (, uint64 readyAt,) = junior.exitOf(alice);
        assertEq(readyAt % 1 days, 0);
        assertGe(readyAt, block.timestamp + 7 days);
        // a settle one second before the notice ends does not price it
        vm.warp(readyAt - 1);
        junior.settle();
        vm.prank(alice);
        vm.expectRevert(JuniorVault.NotReady.selector);
        junior.claimExit();
        // grow NAV by 10%, next settle prices the exit at the new price
        deal(address(USDC), address(junior), USDC.balanceOf(address(junior)) + 1_000e6 + 1e5);
        vm.warp(block.timestamp + 7 days);
        junior.settle();
        uint256 price = junior.pricePerShare();
        assertGt(price, WAD);
        assertEq(junior.pricedExitShares(), 4_000e18);
        assertEq(junior.reservedAssets(), 4_000e18 * price / WAD / 1e12);
        uint256 before = USDC.balanceOf(alice);
        vm.prank(alice);
        junior.claimExit();
        assertEq(USDC.balanceOf(alice) - before, 4_000e18 * price / WAD / 1e12);
        assertEq(junior.reservedAssets(), 0);
        assertEq(junior.balanceOf(alice), 6_000e18);
    }

    /* 7 */
    function test_pricedExitsLeaveTheLiveSupply() public {
        _juniorDeposit(alice, 10_000e6);
        _juniorDeposit(bob, 10_000e6);
        vm.prank(alice);
        junior.requestExit(10_000e18);
        vm.warp(block.timestamp + 8 days);
        junior.settle(); // alice priced at 1.0, reserved 10k
        // bob's epoch then earns 1k: all of it belongs to bob and the seed, none to alice
        deal(address(USDC), address(junior), USDC.balanceOf(address(junior)) + 1_000e6);
        vm.warp(block.timestamp + 7 days);
        junior.settle();
        uint256 expected = (10_001e6 + 1_000e6) * 1e12 * WAD / 10_001e18;
        assertApproxEqRel(junior.pricePerShare(), expected, 1e12);
        vm.prank(alice);
        junior.claimExit();
        assertEq(USDC.balanceOf(alice), 1_000_000e6); // exactly her principal back
    }

    /* 8 */
    function test_settleIsPermissionlessAndWeekly() public {
        vm.expectRevert(JuniorVault.TooSoon.selector);
        junior.settle();
        vm.warp(block.timestamp + 7 days);
        vm.prank(makeAddr("anyone"));
        junior.settle();
        assertEq(junior.settlesLength(), 2);
    }

    /* 9 */
    function test_coverSeniorLossFromIdleOnly() public {
        _seniorDeposit(alice, 100_000e6);
        _juniorDeposit(bob, 20_000e6);
        junior.syncSenior(); // keeper does this hourly: new senior shares become covered
        // force a 2,000 USDC loss on senior: shrink the Felix adapter's shares (what a bad-debt event would do)
        uint256 adapterShares = IERC4626(FELIX_USDC_V1).balanceOf(felixAdapter);
        uint256 sharesFor2k = IERC4626(FELIX_USDC_V1).convertToShares(2_000e6);
        deal(FELIX_USDC_V1, felixAdapter, adapterShares - sharesFor2k, true);
        vm.warp(block.timestamp + 7 days);
        junior.settle();
        // junior paid the shortfall into senior as idle USDC (about 2,000 less a week of Felix yield on 100k)
        uint256 paid = USDC.balanceOf(address(senior));
        assertApproxEqAbs(paid, 2_000e6, 150e6);
        // junior's NAV is principal less the cover plus a week of senior management-fee shares (about 10 USDC)
        assertApproxEqAbs(junior.totalAssets(), 20_001e6 - paid, 15e6);
        // a second settle with no new loss pays nothing more
        uint256 navBefore = junior.totalAssets();
        vm.warp(block.timestamp + 7 days);
        junior.settle();
        assertEq(USDC.balanceOf(address(senior)), paid);
        assertGe(junior.totalAssets(), navBefore);
    }

    /* 10 */
    function test_agentAllowlistOnlyAllowedCallsWithUsAsReceiver() public {
        _juniorDeposit(alice, 50_000e6);
        // not the agent
        vm.expectRevert(JuniorVault.NotAgent.selector);
        junior.execute(address(MORPHO), "");
        vm.startPrank(agent);
        // approve to an unlisted spender
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (bob, 1e6)));
        // raw transfer of USDC is not a rule and can never be one
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.execute(address(USDC), abi.encodeCall(IERC20.transfer, (bob, 1e6)));
        // supply on behalf of someone else
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (address(MORPHO), 10_000e6)));
        vm.expectRevert(JuniorVault.BadReceiver.selector);
        junior.execute(address(MORPHO), abi.encodeCall(IMorphoBase.supply, (mpKhype, 10_000e6, 0, bob, "")));
        // withdraw to someone else
        vm.expectRevert(JuniorVault.BadReceiver.selector);
        junior.execute(address(MORPHO), abi.encodeCall(IMorphoBase.withdraw, (mpKhype, 1e6, 0, address(junior), bob)));
        vm.stopPrank();
        // owner cannot allowlist the asset itself
        vm.prank(owner);
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.setRule(address(USDC), IERC20.transfer.selector, true, type(uint256).max);
        // the allowed shape works and the money is still ours
        _agentSupply(mpKhype, 10_000e6);
        assertApproxEqAbs(junior.totalAssets(), 50_001e6, 2);
    }

    /* 11 */
    function test_totalAssetsCountsMorphoFelixAndSeniorFeeShares() public {
        _seniorDeposit(alice, 200_000e6);
        _juniorDeposit(bob, 40_000e6);
        _agentSupply(mpKhype, 10_000e6);
        vm.startPrank(agent);
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (FELIX_USDC_V1, 10_000e6)));
        junior.execute(FELIX_USDC_V1, abi.encodeCall(IERC4626.deposit, (10_000e6, address(junior))));
        vm.stopPrank();
        assertApproxEqAbs(junior.totalAssets(), 40_001e6, 3);
        // a year of senior management fee: 0.5% of 200k is about 1,000 USDC of senior shares to junior
        vm.warp(block.timestamp + 365 days);
        senior.accrueInterest();
        uint256 feeShares = senior.balanceOf(address(junior));
        assertGt(feeShares, 0);
        uint256 feeAssets = senior.convertToAssets(feeShares);
        assertApproxEqRel(feeAssets, 1_000e6, 0.15e18); // Felix yield moves the base, so 15% band
        assertGe(junior.totalAssets(), 40_001e6 + feeAssets * 9 / 10);
    }

    /* 12 */
    function test_routerSplitsAndPaysSeniorByTransfer() public {
        _seniorDeposit(alice, 100_000e6);
        uint256 ppsBefore = senior.convertToAssets(1e18);
        deal(address(USDC), address(router), 10_000e6);
        vm.prank(owner);
        router.distribute();
        assertEq(USDC.balanceOf(address(senior)), 5_000e6);
        assertEq(USDC.balanceOf(address(junior)), 2_500e6 + 1e6);
        assertEq(USDC.balanceOf(treasury), 2_500e6);
        // senior's share price rises as the idle USDC is recognised, rate-capped by maxRate
        vm.warp(block.timestamp + 1 days);
        senior.accrueInterest();
        assertGt(senior.convertToAssets(1e18), ppsBefore);
    }

    /* 13 */
    function test_routerFloorRejectsBadSwapAndParksFailedSends() public {
        MockRouter dex = new MockRouter(USDC);
        MockOracle oracle = new MockOracle(2e24); // $2 per 18-decimal token in 6-decimal USDC, Morpho scale
        MockORPH tok = new MockORPH();
        vm.startPrank(owner);
        router.setRouter(address(dex), true);
        router.setFloor(address(tok), IOracle(address(oracle)), 100); // 1% slippage
        vm.stopPrank();
        tok.mint(address(router), 1_000e18);
        deal(address(USDC), address(dex), 10_000e6);
        // dex pays 1,900 USDC for 1,000 tokens worth 2,000: 5% below oracle, rejected
        bytes memory bad = abi.encodeCall(MockRouter.swap, (address(tok), 1_000e18, 1_900e6));
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(FeeRouter.BelowFloor.selector, 1_900e6, 1_980e6));
        router.sweep(address(tok), address(dex), bad, 1_000e18);
        // per-call cap: 20,000 USDC of oracle value is above a 15,000 cap
        vm.prank(owner);
        router.setMaxSweepUsdc(15_000e6);
        bytes memory good = abi.encodeCall(MockRouter.swap, (address(tok), 1_000e18, 1_990e6));
        tok.mint(address(router), 14_000e18); // router now holds 15,000 tokens worth 30,000 USDC
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(FeeRouter.SweepTooLarge.selector, 30_000e6, 15_000e6));
        router.sweep(address(tok), address(dex), good, 15_000e18);
        vm.prank(owner);
        router.sweep(address(tok), address(dex), good, 1_000e18); // 2,000 of value, under the cap, fills at 1,990
        assertEq(USDC.balanceOf(address(senior)), 995e6);
        // a failing recipient does not block the sweep: swap junior for a contract that rejects USDC
        RejectingRecipient rr = new RejectingRecipient();
        vm.prank(owner);
        router.setRecipients(address(senior), address(rr), treasury);
        // deal() cannot fake a transfer failure on real USDC, so point the router at a token that can
        FailingToken ft = new FailingToken();
        FeeRouter r2;
        vm.prank(owner);
        r2 = new FeeRouter(IERC20(address(ft)), owner, address(senior), address(rr), treasury);
        ft.mint(address(r2), 1_000e6);
        ft.setReject(address(rr), true);
        vm.prank(owner);
        r2.distribute();
        assertEq(r2.owed(address(rr), address(ft)), 250e6);
        assertEq(ft.balanceOf(treasury), 250e6);
        ft.setReject(address(rr), false);
        r2.pullOwed(address(rr), address(ft));
        assertEq(ft.balanceOf(address(rr)), 250e6);
    }
}

contract MockRouter {
    IERC20 immutable usdc;

    constructor(IERC20 u) {
        usdc = u;
    }

    function swap(address tokenIn, uint256 amountIn, uint256 payOut) external {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        usdc.transfer(msg.sender, payOut);
    }
}

contract MockOracle {
    uint256 public price;

    constructor(uint256 p) {
        price = p;
    }
}

contract RejectingRecipient {}

contract FailingToken is ERC20 {
    mapping(address => bool) public reject;

    constructor() ERC20("F", "F") {}

    function mint(address to, uint256 a) external {
        _mint(to, a);
    }

    function setReject(address who, bool r) external {
        reject[who] = r;
    }

    function transfer(address to, uint256 a) public override returns (bool) {
        if (reject[to]) return false;
        return super.transfer(to, a);
    }
}
