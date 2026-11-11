// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// Regression tests for the cover-math fixes (audit findings C6, C3b, C9). Each test measures its numbers on the fork
// and prints them; tolerances are stated next to the assertion that uses them.

import "./Base.t.sol";
import {Vm} from "forge-std/Vm.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IOracle} from "morpho-blue/interfaces/IOracle.sol";
import {MorphoBalancesLib} from "morpho-blue/libraries/periphery/MorphoBalancesLib.sol";

interface IFelixLike is IERC4626 {
    function withdrawQueue(uint256) external view returns (bytes32);
    function withdrawQueueLength() external view returns (uint256);
    function lostAssets() external view returns (uint256);
}

contract CoverFixesTest is Base {
    using MorphoBalancesLib for IMorpho;

    address carol = makeAddr("carol");

    /* helpers */

    /// @dev A real loss on senior: shrink the Felix adapter's shares by `lossAssets` worth (same trick as Review.t.sol).
    function _forceSeniorLoss(uint256 lossAssets) internal {
        uint256 adapterShares = IERC4626(FELIX_USDC_V1).balanceOf(felixAdapter);
        uint256 lossShares = IERC4626(FELIX_USDC_V1).convertToShares(lossAssets);
        deal(FELIX_USDC_V1, felixAdapter, adapterShares - lossShares, true);
    }

    /// @dev Senior real assets (idle + Felix adapter), what junior's price reads.
    function _seniorReal() internal view returns (uint256) {
        return USDC.balanceOf(address(senior))
            + IERC4626(FELIX_USDC_V1).convertToAssets(IERC4626(FELIX_USDC_V1).balanceOf(felixAdapter));
    }

    /// @dev settle() and read back (shortfall, paid) of its Cover event and the unpaid amount of CoverShortfallCarried.
    function _settle() internal returns (bool covered, uint256 shortfall, uint256 paid, uint256 carried) {
        vm.recordLogs();
        junior.settle();
        Vm.Log[] memory ls = vm.getRecordedLogs();
        for (uint256 i = 0; i < ls.length; i++) {
            if (ls[i].emitter != address(junior) || ls[i].topics.length == 0) continue;
            if (ls[i].topics[0] == keccak256("Cover(uint256,uint256)")) {
                covered = true;
                (shortfall, paid) = abi.decode(ls[i].data, (uint256, uint256));
            } else if (ls[i].topics[0] == keccak256("CoverShortfallCarried(uint256)")) {
                carried = abi.decode(ls[i].data, (uint256));
            }
        }
    }

    function _nextSettle() internal {
        vm.warp(junior.lastSettle() + junior.SETTLE_INTERVAL());
    }

    /// @dev Senior with alice holding everything, a small junior (bob) that cannot pay a 5k loss, baseline synced.
    function _smallJuniorBigLoss() internal {
        _seniorDeposit(alice, 100_000e6);
        _juniorDeposit(bob, 1_000e6);
        junior.syncSenior();
        _forceSeniorLoss(5_000e6);
    }

    function _topUpJunior(uint256 amount) internal {
        deal(address(USDC), address(junior), USDC.balanceOf(address(junior)) + amount);
    }

    /* T001, C6: a partial cover carries the remainder */

    /// (a) settle 2 pays what idle has, settle 3 bills the remainder once junior has funds again.
    ///     Tolerance: the remainder shrinks by the Felix yield senior earned in the week (measured) and 1 USDC of rounding.
    function test_C6_partialCoverRemainderIsBilledAtNextSettle() public {
        _smallJuniorBigLoss();
        _nextSettle();
        (bool c2, uint256 short2, uint256 paid2, uint256 carried2) = _settle();
        assertTrue(c2);
        assertEq(paid2, 1_001e6, "idle (deposit + seed) paid");
        assertEq(carried2, short2 - paid2);
        assertGt(carried2, 3_500e6, "most of the loss is unpaid");
        console2.log("settle 2: shortfall / paid / carried", short2, paid2, carried2);

        _topUpJunior(20_000e6);
        uint256 realAfter2 = _seniorReal();
        _nextSettle();
        senior.accrueInterest();
        uint256 yield3 = _seniorReal() - realAfter2; // Felix yield on senior during the week, shrinks the bill
        (bool c3, uint256 short3, uint256 paid3, uint256 carried3) = _settle();
        console2.log("settle 3: shortfall / paid / yield", short3, paid3, yield3);
        assertTrue(c3);
        assertEq(carried3, 0, "fully paid now");
        assertApproxEqAbs(paid3, carried2 - yield3, 1e6, "remainder billed at settle 3");
    }

    /// (b) a buyer enters senior after the loss, once the cover is recognised (no recognition-lag dilution): settle 3 bills
    ///     no more than the unpaid remainder. Tolerance: the Felix yield makes the bill smaller; 1 USDC rounding up.
    function test_C6_buyerBetweenSettlesDoesNotEnlargeTheBill() public {
        _smallJuniorBigLoss();
        _nextSettle();
        (,, uint256 paid2, uint256 carried2) = _settle();
        console2.log("settle 2 paid / carried", paid2, carried2);
        _topUpJunior(20_000e6);
        vm.warp(block.timestamp + 5 days); // maxRate recognises the 1k transfer within 2 days
        senior.accrueInterest();
        deal(address(USDC), carol, 1_000_000e6);
        _seniorDeposit(carol, 1_000_000e6);
        junior.syncSenior(); // still below the carried baseline: refused, carol stays uncovered
        _nextSettle();
        (bool c3,, uint256 paid3, uint256 carried3) = _settle();
        console2.log("settle 3 paid (buyer of 1M entered)", paid3);
        assertTrue(c3);
        assertEq(carried3, 0);
        assertLe(paid3, carried2 + 1e6, "bill bounded by the unpaid remainder");
        assertGt(paid3, carried2 / 2, "and the remainder is really billed");
    }

    /// (b2) the same buyer entering right after settle 2, while senior's price still recognises the 1k transfer: the
    ///      pre-existing recognition-lag dilution (LIMITATIONS L1) can re-bill part of what was just paid. Printed, bounded
    ///      by remainder + what settle 2 paid.
    function test_C6_buyerRightAfterSettleTwoBoundedByRemainderPlusPaid() public {
        _smallJuniorBigLoss();
        _nextSettle();
        (,, uint256 paid2, uint256 carried2) = _settle();
        _topUpJunior(20_000e6);
        deal(address(USDC), carol, 1_000_000e6);
        _seniorDeposit(carol, 1_000_000e6);
        _nextSettle();
        (,, uint256 paid3,) = _settle();
        console2.log("buyer right after settle 2: carried / paid2 / paid3", carried2, paid2, paid3);
        assertLe(paid3, carried2 + paid2 + 1e6);
    }

    /// (c) junior idle 0 at settle 2 and 3: settle never reverts, the whole bill is carried twice, paid when idle returns.
    function test_C6_idleZeroCarriesTwiceThenPays() public {
        _smallJuniorBigLoss();
        // park all junior idle USDC in Felix through the agent
        uint256 idle = USDC.balanceOf(address(junior));
        vm.startPrank(agent);
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (FELIX_USDC_V1, idle)));
        junior.execute(FELIX_USDC_V1, abi.encodeWithSignature("deposit(uint256,address)", idle, address(junior)));
        vm.stopPrank();
        assertEq(USDC.balanceOf(address(junior)), 0);

        _nextSettle();
        (bool c2, uint256 short2, uint256 paid2, uint256 carried2) = _settle();
        assertTrue(c2);
        assertEq(paid2, 0);
        assertEq(carried2, short2);
        _nextSettle();
        (bool c3, uint256 short3, uint256 paid3, uint256 carried3) = _settle();
        console2.log("idle 0: carried at settle 2 / 3", carried2, carried3);
        assertTrue(c3);
        assertEq(paid3, 0);
        assertEq(carried3, short3);
        // the carry shrinks only by a week of Felix yield (measured below 2% of the bill on 100k senior)
        assertApproxEqRel(short3, carried2, 0.03e18);

        _topUpJunior(20_000e6);
        _nextSettle();
        (bool c4,, uint256 paid4, uint256 carried4) = _settle();
        assertTrue(c4);
        assertEq(carried4, 0);
        assertApproxEqRel(paid4, carried3, 0.03e18);
        console2.log("idle back: paid at settle 4", paid4);
    }

    /// (d) once the carry is paid, a loss-free sync and a later settle bill nothing more.
    function test_C6_remainderIsBilledExactlyOnce() public {
        _smallJuniorBigLoss();
        _nextSettle();
        _settle(); // partial
        _topUpJunior(20_000e6);
        _nextSettle();
        (, , uint256 paid3, uint256 carried3) = _settle(); // pays the remainder
        assertGt(paid3, 0);
        assertEq(carried3, 0);
        uint256 seniorUsdc = USDC.balanceOf(address(senior));
        vm.warp(block.timestamp + 1 hours);
        junior.syncSenior(); // loss-free: baseline moves to the whole supply
        assertEq(junior.seniorSupplyBase(), senior.totalSupply());
        _nextSettle();
        (bool c4, , uint256 paid4,) = _settle();
        assertFalse(c4, "no Cover event: nothing more to bill");
        assertEq(paid4, 0);
        assertEq(USDC.balanceOf(address(senior)), seniorUsdc);
        // and one more, still nothing
        _nextSettle();
        (bool c5,,,) = _settle();
        assertFalse(c5);
    }

    /* T002, C3b: exposure is the minimum senior supply seen since the baseline */

    enum Watch {
        NONE, // nobody observes between the exit and the buy: the documented residual
        OBSERVE, // the keeper's observeSenior() lands between exit and buy
        NO_BUYER // control: the same exit, no buyer
    }

    /// @dev Senior loss, a holder exits half of senior, a buyer enters with the same USDC, settle. Returns the Cover shortfall.
    function _exitThenBuy(Watch w) internal returns (uint256 shortfall, uint256 paid) {
        _seniorDeposit(alice, 100_000e6);
        _juniorDeposit(bob, 20_000e6);
        junior.syncSenior();
        _forceSeniorLoss(2_000e6);
        vm.warp(block.timestamp + 1 hours);
        vm.startPrank(alice);
        uint256 out = senior.redeem(senior.balanceOf(alice) / 2, alice, alice);
        vm.stopPrank();
        if (w == Watch.OBSERVE) junior.observeSenior();
        if (w != Watch.NO_BUYER) {
            deal(address(USDC), carol, out);
            _seniorDeposit(carol, out);
        }
        _nextSettle();
        (, shortfall, paid,) = _settle();
    }

    /// Tolerance: the buyer's presence may move the bill by at most 1 USDC (fee-share and rounding noise) vs the control.
    function test_C3b_observeBetweenExitAndBuyKeepsCoverAtControl() public {
        uint256 snap = vm.snapshotState();
        (uint256 ctlShort, uint256 ctlPaid) = _exitThenBuy(Watch.NO_BUYER);
        vm.revertToState(snap);
        (uint256 obsShort, uint256 obsPaid) = _exitThenBuy(Watch.OBSERVE);
        console2.log("control (no buyer) shortfall / paid", ctlShort, ctlPaid);
        console2.log("observed exit-then-buy shortfall / paid", obsShort, obsPaid);
        assertGt(ctlShort, 500e6, "the control really bills the loss on the remaining half");
        assertApproxEqAbs(obsShort, ctlShort, 1e6);
        assertApproxEqAbs(obsPaid, ctlPaid, 1e6);
    }

    /// The residual, still landing: no observation between the exit and the buy, so the bill covers the exited shares too.
    /// Printed so it is documented; closed later by the senior receive-shares gate.
    function test_C3b_residualWithoutObservationStillOverBills() public {
        uint256 snap = vm.snapshotState();
        (uint256 ctlShort,) = _exitThenBuy(Watch.NO_BUYER);
        vm.revertToState(snap);
        (uint256 noObsShort, uint256 noObsPaid) = _exitThenBuy(Watch.NONE);
        console2.log("residual: control shortfall", ctlShort);
        console2.log("residual: shortfall / paid without observation", noObsShort, noObsPaid);
        console2.log("residual: extra cover vs control", noObsShort - ctlShort);
        assertGt(noObsShort, ctlShort + 500e6, "residual: exited shares still billed when nobody observed");
    }

    /// observeSenior only ever lowers the minimum; syncSenior also observes while senior sits below its baseline.
    function test_C3b_observeOnlyLowersAndSyncObservesBelowBaseline() public {
        _seniorDeposit(alice, 100_000e6);
        _juniorDeposit(bob, 20_000e6);
        junior.syncSenior();
        uint256 full = senior.totalSupply();
        assertEq(junior.seniorSupplyMin(), full);
        _forceSeniorLoss(2_000e6);
        vm.warp(block.timestamp + 1 hours);
        uint256 half = senior.balanceOf(alice) / 2;
        vm.prank(alice);
        senior.redeem(half, alice, alice);
        junior.syncSenior(); // below baseline: baseline stays, minimum is lowered
        assertEq(junior.seniorSupplyBase(), full);
        assertEq(junior.seniorSupplyMin(), senior.totalSupply());
        uint256 low = senior.totalSupply();
        deal(address(USDC), carol, 10_000e6);
        _seniorDeposit(carol, 10_000e6);
        junior.observeSenior();
        assertEq(junior.seniorSupplyMin(), low, "a larger supply never raises the minimum");
    }

    /* T003, C9: Felix bad debt reaches the cover */

    struct BadDebt {
        MarketParams mp;
        address borrower;
        uint256 collateral;
        uint256 debt;
        uint256 price;
    }

    BadDebt internal bd;

    /// @dev A real position in the Felix-supplied USDC market where Felix's supply is largest (oracle fresh, as at the fork
    ///      block): collateral dealt to a borrower, `supplyCollateral`, `borrow`. Same mechanism as the audit's C9 test.
    function _openFelixBorrower(uint256 maxDebt) internal {
        IFelixLike felix = IFelixLike(FELIX_USDC_V1);
        Id best;
        uint256 bestSupply;
        for (uint256 i = 0; i < felix.withdrawQueueLength(); i++) {
            Id id = Id.wrap(felix.withdrawQueue(i));
            MarketParams memory q = MORPHO.idToMarketParams(id);
            if (q.loanToken != address(USDC) || q.collateralToken == address(0) || q.oracle == address(0)) continue;
            (bool ok,) = q.oracle.staticcall(abi.encodeCall(IOracle.price, ()));
            if (!ok) continue;
            uint256 mine = MORPHO.expectedSupplyAssets(q, FELIX_USDC_V1);
            if (mine > bestSupply) {
                bestSupply = mine;
                best = id;
            }
        }
        require(bestSupply != 0, "no Felix USDC market with collateral");
        MarketParams memory mp = MORPHO.idToMarketParams(best);
        MORPHO.accrueInterest(mp);
        uint256 free = MORPHO.market(best).totalSupplyAssets - MORPHO.market(best).totalBorrowAssets;
        uint256 debt = maxDebt < free * 8 / 10 ? maxDebt : free * 8 / 10;
        uint256 price = IOracle(mp.oracle).price();
        uint256 collateral = debt * 1e36 / price * 1e18 / mp.lltv * 102 / 100 + 1;
        address borrower = makeAddr("badDebtBorrower");
        deal(mp.collateralToken, borrower, collateral);
        vm.startPrank(borrower);
        IERC20(mp.collateralToken).approve(address(MORPHO), collateral);
        MORPHO.supplyCollateral(mp, collateral, borrower, "");
        MORPHO.borrow(mp, debt, 0, borrower, borrower);
        vm.stopPrank();
        bd = BadDebt(mp, borrower, collateral, debt, price);
    }

    /// @dev Another Felix depositor touches Felix, which books its accrued interest and (after a bad debt) `lostAssets`.
    function _felixTouch() internal {
        address t = makeAddr("felixToucher");
        deal(address(USDC), t, 1e6);
        vm.startPrank(t);
        USDC.approve(FELIX_USDC_V1, 1e6);
        IERC4626(FELIX_USDC_V1).deposit(1e6, t);
        vm.stopPrank();
    }

    /// @dev The oracle price is ASSUMED to fall 99%; the liquidation itself is the real `Morpho.liquidate`, and Morpho
    ///      socialises the rest of the debt over the suppliers.
    function _liquidateWithBadDebt() internal returns (uint256 badDebt) {
        MORPHO.accrueInterest(bd.mp);
        uint256 supply0 = MORPHO.market(Id.wrap(keccak256(abi.encode(bd.mp)))).totalSupplyAssets;
        vm.mockCall(bd.mp.oracle, abi.encodeCall(IOracle.price, ()), abi.encode(bd.price / 100));
        address liq = makeAddr("badDebtLiquidator");
        deal(address(USDC), liq, bd.debt);
        vm.startPrank(liq);
        USDC.approve(address(MORPHO), bd.debt);
        MORPHO.liquidate(bd.mp, bd.borrower, bd.collateral, 0, "");
        vm.stopPrank();
        vm.clearMockedCalls();
        badDebt = supply0 - MORPHO.market(Id.wrap(keccak256(abi.encode(bd.mp)))).totalSupplyAssets;
    }

    uint256 internal constant SENIOR_SIZE = 1_000_000e6;

    /// @dev Senior 1M (all in Felix), junior 50k, borrower in Felix's largest USDC market; a week later: Felix touch, optional
    ///      bad debt, Felix touch (books lostAssets), settle. Returns what the settle billed and the latent senior deficit.
    function _felixWeek(bool bad)
        internal
        returns (bool covered, uint256 shortfall, uint256 paid, uint256 deficit, uint256 badDebt)
    {
        vm.warp(block.timestamp + 7 days - 3 hours);
        junior.syncSenior();
        _felixTouch(); // books Felix's interest first, so it cannot absorb the bad debt
        if (bad) badDebt = _liquidateWithBadDebt();
        _felixTouch();
        vm.warp(block.timestamp + 3 hours);
        IFelixLike f = IFelixLike(FELIX_USDC_V1);
        uint256 seniorFelix = f.convertToAssets(f.balanceOf(felixAdapter));
        deficit = f.totalAssets() == 0 ? 0 : f.lostAssets() * seniorFelix / f.totalAssets();
        senior.accrueInterest();
        (covered, shortfall, paid,) = _settle();
    }

    function _felixSetup() internal {
        _seniorDeposit(alice, SENIOR_SIZE);
        _juniorDeposit(bob, 50_000e6);
        junior.syncSenior();
        _openFelixBorrower(1_000_000e6);
    }

    /// Tolerance: the bill differs from the pro rata deficit by at most 1% of it plus 1 USDC (Felix yield accrued between
    /// the two touches and 1 ppm guard); measured against the same week without the bad debt.
    function test_C9_felixBadDebtReachesTheCover() public {
        _felixSetup();
        uint256 snap = vm.snapshotState();
        (bool cCtl, uint256 shortCtl,,,) = _felixWeek(false);
        vm.revertToState(snap);
        (bool covered, uint256 shortfall, uint256 paid, uint256 deficit, uint256 badDebt) = _felixWeek(true);
        console2.log("bad debt booked by Morpho", badDebt);
        console2.log("senior pro rata Felix deficit", deficit);
        console2.log("control shortfall (no bad debt, covered?)", shortCtl, cCtl ? 1 : 0);
        console2.log("shortfall / paid with bad debt", shortfall, paid);
        assertGt(badDebt, 100_000e6, "scenario: a real bad debt");
        assertGt(deficit, 1_000e6, "scenario: senior carries a measurable share");
        assertTrue(covered);
        assertGt(paid, 0);
        uint256 idle = 50_001e6;
        uint256 expected = deficit < idle ? deficit : idle;
        assertEq(paid, shortfall < idle ? shortfall : idle);
        assertApproxEqAbs(paid, expected, expected / 100 + 1e6);
    }

    /// Recovery: after the cover, a later settle with no new loss bills 0 more; a later "recovery" (assets flowing back
    /// into senior, simulated by a USDC transfer) lifts the price above the baseline and still bills nothing.
    function test_C9_laterSettleBillsNothingMoreAndRecoveryDoesNotDoubleBill() public {
        _felixSetup();
        (bool c2,, uint256 paid2,,) = _felixWeek(true);
        assertTrue(c2);
        assertGt(paid2, 0);
        uint256 seniorUsdc = USDC.balanceOf(address(senior));
        _nextSettle();
        (bool c3,, uint256 paid3,) = _settle();
        console2.log("covered at settle 2 / bills at settle 3", paid2, paid3);
        assertFalse(c3, "no Cover event at the next settle");
        deal(address(USDC), address(senior), USDC.balanceOf(address(senior)) + paid2); // a recovery of the booked deficit
        _nextSettle();
        (bool c4,,,) = _settle();
        assertFalse(c4, "a recovery never reads as a loss");
        assertGe(USDC.balanceOf(address(senior)), seniorUsdc);
    }

    /// Control: the same week without the bad debt bills nothing (no Cover event).
    function test_C9_controlWithoutBadDebtBillsNothing() public {
        _felixSetup();
        (bool covered,,,,) = _felixWeek(false);
        assertFalse(covered, "a Cover event without any loss");
    }
}
