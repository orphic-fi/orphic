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
    function lastTotalAssets() external view returns (uint256);
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

    /* T001, C6 v2: a partial cover becomes an explicit carried debt */

    /// (1) Partial cover, a week of senior yield, the next settle bills the full carry: senior ends within 2 USDC of the
    ///     honest control that paid everything at settle 2 (tolerance: rounding of per-share units and the 1 ppm guard).
    function test_C6_carryIsBilledInFullAndSeniorEndsAtTheControl() public {
        _smallJuniorBigLoss();
        uint256 snap = vm.snapshotState();
        // control: junior has the money at settle 2
        _topUpJunior(20_000e6);
        _nextSettle();
        (, uint256 ctlOwed, uint256 ctlPaid, uint256 ctlCarried) = _settle();
        assertEq(ctlCarried, 0);
        _nextSettle();
        _settle();
        uint256 ctlSenior = _seniorReal();
        uint256 ctlJunior = junior.totalAssets();
        vm.revertToState(snap);
        // carry world: settle 2 pays idle only, the money comes back, settle 3 bills the carry
        _nextSettle();
        (, uint256 owed2, uint256 paid2, uint256 carried2) = _settle();
        assertEq(paid2, 1_001e6, "idle (deposit + seed) paid");
        assertEq(carried2, owed2 - paid2);
        assertEq(junior.carryOwed(), carried2, "carryOwed is the unpaid part");
        _topUpJunior(20_000e6);
        _nextSettle();
        (, uint256 owed3, uint256 paid3, uint256 carried3) = _settle();
        console2.log("control owed / paid", ctlOwed, ctlPaid);
        console2.log("carry world settle 2 owed / paid / carried", owed2, paid2, carried2);
        console2.log("carry world settle 3 owed / paid", owed3, paid3);
        assertEq(carried3, 0);
        assertApproxEqAbs(paid3, carried2, 2, "the full carry is billed, a week of yield does not net it");
        assertApproxEqAbs(_seniorReal(), ctlSenior, 2e6, "senior ends at the control");
        assertApproxEqAbs(junior.totalAssets(), ctlJunior, 2e6, "junior ends at the control");
        assertEq(junior.carryPerShare(), 0);
    }

    /// (2) An exiter priced at the partial-cover settle bears its share of the unpaid debt: the settle price equals the NAV
    ///     before the cover less the WHOLE owed amount, per share (tolerance 2 USDC for the whole supply: rounding, 1 ppm).
    function test_C6_exiterPricedAtThePartialCoverSettleBearsItsShare() public {
        _seniorDeposit(alice, 100_000e6);
        _juniorDeposit(bob, 10_000e6); // stayer
        address dave = makeAddr("dave");
        deal(address(USDC), dave, 10_000e6);
        vm.startPrank(dave);
        USDC.approve(address(junior), 10_000e6);
        uint256 dShares = junior.deposit(10_000e6, dave);
        junior.requestExit(dShares);
        vm.stopPrank();
        junior.syncSenior();
        // keep most of junior's money in Felix, so idle (about 1,001) cannot pay the cover
        vm.startPrank(agent);
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (FELIX_USDC_V1, 19_000e6)));
        junior.execute(FELIX_USDC_V1, abi.encodeWithSignature("deposit(uint256,address)", 19_000e6, address(junior)));
        vm.stopPrank();
        _forceSeniorLoss(5_000e6);
        vm.warp(junior.lastSettle() + 8 days); // past the exit's notice
        senior.accrueInterest();
        uint256 navBefore = junior.totalAssets();
        uint256 supply = junior.totalSupply();
        (, uint256 owed, uint256 paid, uint256 carried) = _settle();
        assertGt(carried, 3_000e6, "scenario: most of the bill is unpaid");
        uint256 expectedPrice = (navBefore - owed) * 1e12 * WAD / supply;
        console2.log("settle 2 price / expected (NAV before less the whole bill)", junior.pricePerShare(), expectedPrice);
        uint256 exiterValue = dShares * junior.pricePerShare() / WAD / 1e12;
        uint256 exiterExpected = dShares * expectedPrice / WAD / 1e12;
        uint256 stayerValue = junior.balanceOf(bob) * junior.pricePerShare() / WAD / 1e12;
        uint256 stayerExpected = junior.balanceOf(bob) * expectedPrice / WAD / 1e12;
        assertApproxEqAbs(exiterValue, exiterExpected, 2e6, "exiter bears its share of the unpaid debt");
        assertApproxEqAbs(stayerValue, stayerExpected, 2e6, "stayer bears its share");
        assertGt(paid, 0);
    }

    /// (3) Idle 0 at settle 2 and 3: no revert, the debt is carried twice (same amount, no growth), billed once on return.
    function test_C6_idleZeroCarriesTwiceAndBillsOnce() public {
        _smallJuniorBigLoss();
        uint256 idle = USDC.balanceOf(address(junior));
        vm.startPrank(agent);
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (FELIX_USDC_V1, idle)));
        junior.execute(FELIX_USDC_V1, abi.encodeWithSignature("deposit(uint256,address)", idle, address(junior)));
        vm.stopPrank();
        assertEq(USDC.balanceOf(address(junior)), 0);
        _nextSettle();
        (bool c2, uint256 owed2, uint256 paid2, uint256 carried2) = _settle();
        _nextSettle();
        (bool c3, uint256 owed3, uint256 paid3, uint256 carried3) = _settle();
        console2.log("idle 0: carried at settle 2 / 3", carried2, carried3);
        assertTrue(c2 && c3);
        assertEq(paid2 + paid3, 0);
        assertEq(carried2, owed2);
        assertApproxEqAbs(owed3, owed2, 2, "the debt neither grows with yield nor shrinks");
        assertApproxEqAbs(carried3, carried2, 2);
        _topUpJunior(20_000e6);
        _nextSettle();
        (bool c4,, uint256 paid4, uint256 carried4) = _settle();
        assertTrue(c4);
        assertEq(carried4, 0);
        assertApproxEqAbs(paid4, carried2, 2, "billed once, in full");
        _nextSettle();
        (bool c5,,,) = _settle();
        assertFalse(c5, "and never again");
    }

    /// (4) A buyer into senior between the settles (once the small settle-2 transfer is recognised, so the pre-existing
    ///     recognition-lag dilution of L1 is out of the picture): the bill is the carry, not more (tolerance 1 USDC).
    function test_C6_buyerBetweenSettlesDoesNotEnlargeTheBill() public {
        _smallJuniorBigLoss();
        _nextSettle();
        (,,, uint256 carried2) = _settle();
        _topUpJunior(20_000e6);
        vm.warp(block.timestamp + 5 days);
        senior.accrueInterest();
        deal(address(USDC), carol, 1_000_000e6);
        _seniorDeposit(carol, 1_000_000e6);
        junior.syncSenior(); // observe only: carol stays uncovered
        assertGt(junior.carryPerShare(), 0);
        _nextSettle();
        (bool c3,, uint256 paid3, uint256 carried3) = _settle();
        console2.log("carry / settle 3 bill with a 1M buyer", carried2, paid3);
        assertTrue(c3);
        assertEq(carried3, 0);
        assertApproxEqAbs(paid3, carried2, 1e6);
    }

    /// (5) A junior deposit while a debt is outstanding mints at the debt-net price.
    function test_C6_depositWhileCarryMintsAtTheDebtNetPrice() public {
        _seniorDeposit(alice, 100_000e6);
        _juniorDeposit(bob, 10_000e6);
        junior.syncSenior();
        vm.startPrank(agent);
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (FELIX_USDC_V1, 9_000e6)));
        junior.execute(FELIX_USDC_V1, abi.encodeWithSignature("deposit(uint256,address)", 9_000e6, address(junior)));
        vm.stopPrank();
        _forceSeniorLoss(5_000e6);
        _nextSettle();
        senior.accrueInterest();
        uint256 navBefore = junior.totalAssets();
        (, uint256 owed2,, uint256 carried2) = _settle();
        assertGt(carried2, 3_000e6);
        assertEq(junior.carryOwed(), carried2);
        uint256 netNav = junior.totalAssets();
        assertApproxEqAbs(netNav, navBefore - owed2, 1e6, "NAV is net of the whole bill, independently of the contract's own view");
        netNav = navBefore - owed2;
        uint256 supply = junior.totalSupply() - junior.pricedExitShares();
        uint256 netLive = netNav * 1e12 * WAD / supply;
        uint256 grossLive = (netNav + carried2) * 1e12 * WAD / supply;
        uint256 p = netLive > junior.pricePerShare() ? netLive : junior.pricePerShare();
        deal(address(USDC), carol, 1_000e6);
        uint256 shares = _juniorDeposit(carol, 1_000e6);
        console2.log("shares for 1,000 USDC at the net / gross price", shares, 1_000e6 * 1e12 * WAD / grossLive);
        assertApproxEqRel(shares, 1_000e6 * 1e12 * WAD / p, 1e12);
        assertGt(shares, 1_000e6 * 1e12 * WAD / grossLive, "a gross price would mint fewer shares");
    }

    /// (6) Billed exactly once: after the debt clears, a loss-free sync and later settles bill nothing more.
    function test_C6_remainderIsBilledExactlyOnce() public {
        _smallJuniorBigLoss();
        _nextSettle();
        _settle();
        _topUpJunior(20_000e6);
        _nextSettle();
        (, , uint256 paid3, uint256 carried3) = _settle();
        assertGt(paid3, 0);
        assertEq(carried3, 0);
        assertEq(junior.carryPerShare(), 0);
        uint256 seniorUsdc = USDC.balanceOf(address(senior));
        vm.warp(block.timestamp + 1 hours);
        junior.syncSenior(); // loss-free again: baseline moves to the whole supply
        assertEq(junior.seniorSupplyBase(), senior.totalSupply());
        _nextSettle();
        (bool c4,,,) = _settle();
        assertFalse(c4, "no Cover event: nothing more to bill");
        _nextSettle();
        (bool c5,,,) = _settle();
        assertFalse(c5);
        assertEq(USDC.balanceOf(address(senior)), seniorUsdc);
    }

    /// (7) A carry with exposed < supply: a buyer enters after the loss and before the partial-cover settle; the debt is
    ///     held on the shares that were exposed and billed at the next settle (tolerance 1 USDC).
    function test_C6_carryWithExposedBelowSupply() public {
        _smallJuniorBigLoss();
        vm.warp(block.timestamp + 1 hours);
        deal(address(USDC), carol, 100_000e6);
        _seniorDeposit(carol, 100_000e6); // doubles senior supply after the loss
        _nextSettle();
        (, uint256 owed2,, uint256 carried2) = _settle();
        assertGt(carried2, 3_000e6);
        assertLt(junior.seniorSupplyBase(), senior.totalSupply(), "baseline holds the exposed shares only");
        assertEq(junior.seniorSupplyBase(), junior.seniorSupplyMin());
        console2.log("exposed below supply: owed / carried", owed2, carried2);
        _topUpJunior(20_000e6);
        _nextSettle();
        (, , uint256 paid3, uint256 carried3) = _settle();
        assertEq(carried3, 0);
        assertApproxEqAbs(paid3, carried2, 1e6);
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
    IFelixLike internal felix = IFelixLike(FELIX_USDC_V1);

    function _felixSetup() internal {
        _seniorDeposit(alice, SENIOR_SIZE);
        _juniorDeposit(bob, 50_000e6);
        junior.syncSenior();
        _openFelixBorrower(1_000_000e6);
    }

    /// @dev Baseline sync, then Felix books a real bad debt (touch, liquidation, touch), then three hours pass: the settle is
    ///      due. Every C9 case books its Felix loss FIRST and plays its flows afterwards.
    function _lossBooked() internal returns (uint256 badDebt) {
        vm.warp(block.timestamp + 7 days - 3 hours);
        junior.syncSenior();
        _felixTouch(); // books Felix's interest first, so it cannot absorb the loss
        badDebt = _liquidateWithBadDebt();
        _felixTouch(); // books lostAssets
        vm.warp(block.timestamp + 3 hours);
        senior.accrueInterest();
    }

    /// @dev What the snapshot math says junior owes for the Felix term right now: assetsBase * (lost - lostBase) / totalBase,
    ///      per baseline share, times the exposed shares.
    function _snapshotBill() internal view returns (uint256) {
        (, uint96 lostBase, uint128 assetsBase, uint128 totalBase) = junior.felixSnaps(0);
        uint256 lost = felix.lostAssets();
        if (lost <= lostBase) return 0;
        uint256 exposed = senior.totalSupply();
        if (junior.seniorSupplyBase() < exposed) exposed = junior.seniorSupplyBase();
        if (junior.seniorSupplyMin() < exposed) exposed = junior.seniorSupplyMin();
        return uint256(assetsBase) * (lost - lostBase) / totalBase * exposed / junior.felixSnapSupply();
    }

    /// (1) Real borrow + real `Morpho.liquidate`: the Cover is the snapshot math. Tolerance 1 USDC (rounding only: the formula
    ///     is the contract's own, on state read before the settle); also printed against senior's live pro rata deficit.
    function test_C9_felixBadDebtCoverIsTheSnapshotMath() public {
        _felixSetup();
        uint256 snap = vm.snapshotState();
        vm.warp(block.timestamp + 7 days);
        (bool cCtl,,,) = _settle();
        assertFalse(cCtl, "control week without bad debt: no Cover");
        vm.revertToState(snap);
        uint256 badDebt = _lossBooked();
        assertEq(junior.felixSnapsLength(), 1);
        uint256 expected = _snapshotBill();
        uint256 live = felix.lostAssets() * (felix.convertToAssets(felix.balanceOf(felixAdapter))) / felix.lastTotalAssets();
        (bool covered, uint256 owed, uint256 paid,) = _settle();
        console2.log("bad debt booked by Morpho", badDebt);
        console2.log("snapshot bill / owed / paid", expected, owed, paid);
        console2.log("senior live pro rata share of lostAssets (printed only)", live);
        assertGt(badDebt, 100_000e6);
        assertGt(expected, 1_000e6, "scenario: a measurable bill");
        assertTrue(covered);
        assertApproxEqAbs(owed, expected, 1e6);
        assertEq(paid, owed < 50_001e6 ? owed : 50_001e6);
        (, uint96 lostBase,,) = junior.felixSnaps(0);
        assertEq(lostBase, felix.lostAssets(), "baseline re-took lostAssets");
    }

    function _bill() internal returns (uint256 owed) {
        (, owed,,) = _settle();
    }

    /// (2) Loss booked; an outsider flash-sized deposit into FELIX right before the settle: the bill is the no-flow control
    ///     (tolerance 1 USDC).
    function test_C9_flashDepositIntoFelixDoesNotShrinkTheBill() public {
        _felixSetup();
        _lossBooked();
        uint256 snap = vm.snapshotState();
        uint256 ctl = _bill();
        vm.revertToState(snap);
        address whale = makeAddr("flash");
        deal(address(USDC), whale, 10_000_000e6);
        vm.startPrank(whale);
        USDC.approve(FELIX_USDC_V1, type(uint256).max);
        uint256 sh = felix.deposit(10_000_000e6, whale);
        vm.stopPrank();
        uint256 flow = _bill();
        vm.prank(whale);
        felix.redeem(sh, whale, whale);
        console2.log("control / with a 10M flash deposit into Felix", ctl, flow);
        assertGt(ctl, 1_000e6);
        assertApproxEqAbs(flow, ctl, 1e6);
    }

    /// (3) The same with the deposit into SENIOR (which routes to Felix and raises the live assets).
    function test_C9_flashDepositIntoSeniorDoesNotShrinkTheBill() public {
        _felixSetup();
        _lossBooked();
        uint256 snap = vm.snapshotState();
        uint256 ctl = _bill();
        vm.revertToState(snap);
        deal(address(USDC), carol, 5_000_000e6);
        _seniorDeposit(carol, 5_000_000e6);
        uint256 flow = _bill();
        uint256 carolShares = senior.balanceOf(carol);
        vm.prank(carol);
        senior.redeem(carolShares, carol, carol);
        console2.log("control / with a 5M flash deposit into senior", ctl, flow);
        assertApproxEqAbs(flow, ctl, 1e6);
    }

    /// (4) Loss booked; a third party withdraws a big part of Felix (lowers lastTotalAssets): the bill is the control.
    function test_C9_thirdPartyWithdrawFromFelixDoesNotChangeTheBill() public {
        address whale = makeAddr("felixWhale");
        deal(address(USDC), whale, 10_000_000e6);
        vm.startPrank(whale);
        USDC.approve(FELIX_USDC_V1, type(uint256).max);
        uint256 sh = felix.deposit(10_000_000e6, whale);
        vm.stopPrank();
        _felixSetup();
        _lossBooked();
        uint256 snap = vm.snapshotState();
        uint256 ctl = _bill();
        vm.revertToState(snap);
        vm.prank(whale);
        felix.redeem(sh, whale, whale);
        uint256 flow = _bill();
        console2.log("control / after a 10M third-party Felix withdrawal", ctl, flow);
        assertGt(ctl, 1_000e6);
        assertApproxEqAbs(flow, ctl, 1e6);
    }

    /// (5) The curator takes Felix out of senior (funds deallocated first), a baseline is taken while it is out, Felix books
    ///     a loss, the adapter is added back: nothing is billed for a loss booked while it was out of the snapshot.
    function test_C9_adapterOutOfTheSnapshotIsNotBilled() public {
        _felixSetup();
        vm.warp(block.timestamp + 7 days - 3 hours);
        vm.startPrank(owner);
        senior.deallocate(felixAdapter, "", senior.allocation(keccak256(abi.encode("this", felixAdapter))));
        senior.setLiquidityAdapterAndData(address(0), "");
        _curate(abi.encodeCall(IVaultV2.removeAdapter, (felixAdapter)));
        vm.stopPrank();
        junior.syncSenior();
        assertEq(junior.felixSnapsLength(), 0, "Felix is not in the snapshot");
        _felixTouch();
        _liquidateWithBadDebt();
        _felixTouch();
        vm.startPrank(owner);
        _curate(abi.encodeCall(IVaultV2.addAdapter, (felixAdapter)));
        vm.stopPrank();
        vm.warp(block.timestamp + 3 hours);
        (bool c,, uint256 paid,) = _settle();
        assertFalse(c, "no bill for a loss booked while the adapter was out of the snapshot");
        assertEq(paid, 0);
        assertEq(junior.felixSnapsLength(), 1, "the settle's reset picks it up");
    }

    /// (6) Residual, documented and allocator-trusted: the allocator moves senior out of Felix after the baseline, then Felix
    ///     books a loss. Senior holds nothing there, but the snapshot still bills assetsBase * delta / totalBase. Bounded by
    ///     that product (tolerance 1 USDC); printed.
    function test_C9_allocatorResidualBoundedBySnapshotProduct() public {
        _felixSetup();
        vm.warp(block.timestamp + 7 days - 3 hours);
        junior.syncSenior();
        (, uint96 lostBase, uint128 assetsBase, uint128 totalBase) = junior.felixSnaps(0);
        vm.startPrank(owner);
        senior.deallocate(felixAdapter, "", uint256(assetsBase));
        vm.stopPrank();
        _felixTouch();
        _liquidateWithBadDebt();
        _felixTouch();
        vm.warp(block.timestamp + 3 hours);
        uint256 bound = uint256(assetsBase) * (felix.lostAssets() - lostBase) / totalBase;
        (bool c, uint256 owed, uint256 paid,) = _settle();
        console2.log("allocator residual: senior holds 0 in Felix, billed / bound", owed, bound);
        assertTrue(c);
        assertApproxEqAbs(owed, bound, 1e6);
        assertLe(paid, bound + 1e6);
    }

    /// (7) syncSenior while lost_now > lostBase refuses to reset; deposit and settle still work; the Felix term is billed once.
    function test_C9_syncRefusesWhileALossIsBookedThenBillsOnce() public {
        _felixSetup();
        _lossBooked();
        (, uint96 lostBase0,,) = junior.felixSnaps(0);
        junior.syncSenior();
        (, uint96 lostBase1,,) = junior.felixSnaps(0);
        assertEq(lostBase1, lostBase0, "sync did not reset the snapshot");
        deal(address(USDC), carol, 1_000e6);
        _juniorDeposit(carol, 1_000e6); // deposit syncs too and still works
        (, uint96 lostBase2,,) = junior.felixSnaps(0);
        assertEq(lostBase2, lostBase0);
        uint256 expected = _snapshotBill();
        (bool c1, uint256 owed1,,) = _settle();
        assertTrue(c1);
        assertApproxEqAbs(owed1, expected, 1e6);
        _nextSettle();
        (bool c2,,,) = _settle();
        assertFalse(c2, "billed once");
    }

    /// (8) Senior exits after the C9 cover bill nothing more.
    function test_C9_exitsAfterTheCoverAreNotBilledAgain() public {
        _felixSetup();
        _lossBooked();
        (bool c2,, uint256 paid2,) = _settle();
        assertTrue(c2);
        uint256 half = senior.balanceOf(alice) / 2;
        vm.prank(alice);
        senior.redeem(half, alice, alice);
        _nextSettle();
        (bool c3,, uint256 paid3,) = _settle();
        console2.log("covered / billed after half of senior exited", paid2, paid3);
        assertFalse(c3);
        _nextSettle();
        (bool c4,,,) = _settle();
        assertFalse(c4);
    }

    /// (9) Hostile or odd adapters: settle, deposit and sync never revert, a real loss is still covered, and gas stays far
    ///     below the 2M small-block limit. Modes: 0 short data, 1 codeless vault, 2 dirty word, 3 31-byte lostAssets, 4 max/max,
    ///     5 gas burner, 6 100 KB returndata from the adapter, 7 100 KB returndata from the vault's lostAssets, valid at the
    ///     snapshot (so the settle-time probe meets it).
    function test_C9_garbageAdaptersNeverBrickSettleDepositOrSync_modes0to3() public {
        _garbage(0, 4);
    }

    function test_C9_garbageAdaptersNeverBrickSettleDepositOrSync_modes4to7() public {
        _garbage(4, 8);
    }

    function _garbage(uint8 from, uint8 to) internal {
        for (uint8 mode = from; mode < to; mode++) {
            uint256 snap = vm.snapshotState();
            _seniorDeposit(alice, 100_000e6);
            _juniorDeposit(bob, 20_000e6);
            GarbageAdapter ga = new GarbageAdapter(mode);
            vm.startPrank(owner);
            _curate(abi.encodeCall(IVaultV2.addAdapter, (address(ga))));
            vm.stopPrank();
            junior.syncSenior();
            if (mode == 7) assertEq(junior.felixSnapsLength(), 2, "Felix plus the adapter that is valid at the snapshot");
            ga.turnBad();
            _juniorDeposit(bob, 1_000e6);
            _forceSeniorLoss(1_000e6);
            _nextSettle();
            uint256 g = gasleft();
            (bool c,, uint256 paid,) = _settle();
            uint256 used = g - gasleft();
            _juniorDeposit(bob, 1_000e6);
            junior.syncSenior();
            console2.log("garbage mode / loss covered / settle gas", mode, paid, used);
            assertLt(used, 1_500_000, "settle gas bounded");
            assertTrue(c, "the real loss is still covered");
            assertApproxEqAbs(paid, 1_000e6, 150e6); // loss less a week of Felix yield (about 120)
            vm.revertToState(snap);
        }
    }

    /// (N-4) A wiped junior (NAV net of the debt is 0) refuses deposits with a clean error, not a division panic.
    function test_C9_wipedJuniorRefusesDepositsWithAZeroPriceError() public {
        _smallJuniorBigLoss();
        _nextSettle();
        _settle();
        assertEq(junior.totalAssets(), 0);
        deal(address(USDC), carol, 1_000e6);
        vm.startPrank(carol);
        USDC.approve(address(junior), 1_000e6);
        vm.expectRevert(JuniorVault.ZeroPrice.selector);
        junior.deposit(1_000e6, carol);
        vm.stopPrank();
    }

    /// (10) The agent's idle floor protects reservedAssets plus the carried debt: it cannot deploy idle USDC that is owed to
    ///      senior, and can once the debt is paid.
    function test_C9_agentCannotDeployBelowTheCarriedDebt() public {
        _smallJuniorBigLoss();
        _nextSettle();
        (,,, uint256 carried) = _settle();
        assertGt(carried, 3_000e6);
        _topUpJunior(1_000e6); // idle 1,000 < carried debt
        vm.startPrank(agent);
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (FELIX_USDC_V1, 500e6)));
        vm.expectRevert(JuniorVault.InsufficientLiquidity.selector);
        junior.execute(FELIX_USDC_V1, abi.encodeWithSignature("deposit(uint256,address)", 500e6, address(junior)));
        vm.stopPrank();
        _topUpJunior(20_000e6);
        _nextSettle();
        (, , , uint256 carriedAfter) = _settle();
        assertEq(carriedAfter, 0);
        vm.prank(agent);
        junior.execute(FELIX_USDC_V1, abi.encodeWithSignature("deposit(uint256,address)", 500e6, address(junior)));
    }
}

/// @dev A senior adapter that is wrong in one of several ways (see test (9)). It answers `morphoVaultV1()` well or badly;
///      `turnBad()` flips mode 7's vault from valid to a returndata bomb after the snapshot was taken.
contract GarbageAdapter {
    uint8 internal mode;
    GarbageVault internal vault;

    constructor(uint8 mode_) {
        mode = mode_;
        vault = new GarbageVault(mode_);
    }

    function realAssets() external pure returns (uint256) {
        return 0;
    }

    function turnBad() external {
        vault.turnBad();
    }

    fallback(bytes calldata) external returns (bytes memory) {
        if (mode == 0) return hex"ff";
        if (mode == 1) return abi.encode(address(0xBEEF));
        if (mode == 2) return abi.encode(type(uint256).max);
        if (mode == 6) {
            assembly {
                return(0, 100000)
            }
        }
        return abi.encode(address(vault));
    }
}

contract GarbageVault {
    uint8 internal mode;
    bool internal bad;

    constructor(uint8 mode_) {
        mode = mode_;
    }

    function turnBad() external {
        bad = true;
    }

    fallback(bytes calldata) external returns (bytes memory) {
        if (mode == 3) return new bytes(31);
        if (mode == 4) return abi.encode(type(uint256).max);
        if (mode == 7) {
            if (bad) {
                assembly {
                    return(0, 100000)
                }
            }
            return abi.encode(uint256(0));
        }
        while (true) {} // mode 5
        return "";
    }
}
