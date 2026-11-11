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
    uint256 internal expSupply; // senior supply when the test took the exposure snapshot (chain read)
    uint256 internal fracAtSnap; // senior's Felix shares over Felix's supply at that moment (chain reads), PRICE_UNIT units
    uint256 internal lostPre; // Felix lostAssets right before the liquidation

    function _snapExposure() internal {
        expSupply = senior.totalSupply();
        fracAtSnap = felix.balanceOf(felixAdapter) * 1e24 / felix.totalSupply();
        vm.prank(agent);
        junior.snapFelixExposure();
    }

    function _felixSetupNoSnap() internal {
        _seniorDeposit(alice, SENIOR_SIZE);
        _juniorDeposit(bob, 50_000e6);
        junior.syncSenior();
        _openFelixBorrower(1_000_000e6);
    }

    function _felixSetup() internal {
        _felixSetupNoSnap();
        _snapExposure();
    }

    /// @dev Third-party state write (ASSUMED): find Felix's `lostAssets` storage slot by writing and reading back through the
    ///      public getter, then leave the new value in place.
    function _setFelixLost(uint256 v) internal {
        for (uint256 i = 0; i < 40; i++) {
            bytes32 orig = vm.load(FELIX_USDC_V1, bytes32(i));
            vm.store(FELIX_USDC_V1, bytes32(i), bytes32(v));
            if (felix.lostAssets() == v) return;
            vm.store(FELIX_USDC_V1, bytes32(i), orig);
        }
        revert("lostAssets slot not found");
    }

    function _hasExp(uint256 i) internal view returns (bool ok) {
        (ok,) = address(junior).staticcall(abi.encodeCall(junior.felixExp, (i)));
    }

    /// @dev Baseline sync, then Felix books a real bad debt (touch, liquidation, touch), then three hours pass: the settle is
    ///      due. Every C9 case books its Felix loss FIRST (or after a flow it wants to test) and settles afterwards.
    function _lossBooked() internal returns (uint256 badDebt) {
        vm.warp(block.timestamp + 7 days - 3 hours);
        junior.syncSenior();
        _felixTouch(); // books Felix's interest first, so it cannot absorb the loss
        lostPre = felix.lostAssets();
        badDebt = _liquidateWithBadDebt();
        _felixTouch(); // books lostAssets
        vm.warp(block.timestamp + 3 hours);
        senior.accrueInterest();
    }

    /// @dev The bill from chain reads only: Felix's booked loss times senior's share of Felix (shares over supply, read now),
    ///      times exposed over the supply at the snapshot. Independent of the contract's own snapshot values.
    function _independentBill() internal view returns (uint256) {
        uint256 delta = felix.lostAssets() - lostPre;
        uint256 frac = felix.balanceOf(felixAdapter) * 1e24 / felix.totalSupply();
        uint256 exposed = senior.totalSupply();
        if (junior.seniorSupplyBase() < exposed) exposed = junior.seniorSupplyBase();
        if (junior.seniorSupplyMin() < exposed) exposed = junior.seniorSupplyMin();
        return delta * frac / 1e24 * exposed / expSupply;
    }

    function _bill() internal returns (uint256 owed) {
        (, owed,,) = _settle();
    }

    /// (1) Real borrow + real `Morpho.liquidate`: the Cover equals the independent pro rata figure. Tolerance 0.1% of it plus
    ///     1 USDC (the supply Felix mints between the two reads: two 1 USDC touches and its fee shares).
    function test_C9_felixBadDebtCoverIsTheIndependentProRataFigure() public {
        _felixSetup();
        uint256 snap = vm.snapshotState();
        vm.warp(block.timestamp + 7 days);
        (bool cCtl,,,) = _settle();
        assertFalse(cCtl, "control week without bad debt: no Cover");
        vm.revertToState(snap);
        uint256 badDebt = _lossBooked();
        uint256 expected = _independentBill();
        (bool covered, uint256 owed, uint256 paid,) = _settle();
        console2.log("bad debt booked by Morpho", badDebt);
        console2.log("independent pro rata bill / owed / paid", expected, owed, paid);
        assertGt(badDebt, 100_000e6);
        assertGt(expected, 1_000e6, "scenario: a measurable bill");
        assertTrue(covered);
        assertApproxEqAbs(owed, expected, expected / 1000 + 1e6);
        assertEq(paid, owed < 50_001e6 ? owed : 50_001e6);
        (, uint96 lostBase,,) = junior.felixExp(0);
        assertEq(lostBase, felix.lostAssets(), "baseline re-took lostAssets");
    }

    /* flows around the PERMISSIONLESS calls: the flash wraps the LAST baseline reset before the loss (an attacker backruns the
       keeper's sync, so nothing heals it), then the loss is booked and the settle bills. */

    /// @dev kind 0 none, 1 flash X into Felix, 2 flash X into senior; op 0 around syncSenior, 1 around a junior deposit, 2 around
    ///      a quiet settle. Returns (bill, independent pro rata figure of that world).
    function _flashedBill(uint8 kind, uint8 op) internal returns (uint256 bill, uint256 expected) {
        _felixSetup();
        Flasher f = new Flasher();
        deal(address(USDC), address(f), 10_000_000e6 + 1_000e6);
        address vault = kind == 1 ? FELIX_USDC_V1 : (kind == 2 ? address(senior) : address(0));
        vm.warp(block.timestamp + (op == 2 ? 7 days : 7 days - 3 hours));
        f.flash(USDC, vault, kind == 1 ? 10_000_000e6 : 5_000_000e6, junior, op);
        if (op == 2) vm.warp(block.timestamp + 7 days - 3 hours);
        _felixTouch(); // books Felix's interest first, so it cannot absorb the loss
        lostPre = felix.lostAssets();
        _liquidateWithBadDebt();
        _felixTouch(); // books lostAssets
        vm.warp(block.timestamp + 3 hours);
        senior.accrueInterest();
        expected = _independentBill();
        bill = _bill();
    }

    /// @dev The flow reshuffles Felix's markets (a deposit and a redeem walk Felix's queues), so Felix's own loss differs
    ///      between worlds; what must hold is that the bill is the independent pro rata figure of THAT world (tolerance 0.1%
    ///      plus 1 USDC): nothing the flash did to the exposure snapshot shrinks it. The control is printed for reference.
    function _flashBillIsProRata(uint8 kind, uint8 op) internal {
        uint256 snap = vm.snapshotState();
        (uint256 ctl,) = _flashedBill(0, op);
        vm.revertToState(snap);
        (uint256 flow, uint256 expected) = _flashedBill(kind, op);
        console2.log("kind / op", kind, op);
        console2.log("control bill / flash bill / independent pro rata of the flash world", ctl, flow, expected);
        assertGt(expected, 1_000e6);
        assertApproxEqAbs(flow, expected, expected / 1000 + 1e6);
    }

    /// (a) flash X into FELIX (deposit, permissionless syncSenior, redeem in one tx), then a loss: the bill is the control.
    function test_C9_flashIntoFelixAroundPermissionlessSyncDoesNotPoisonTheBill() public {
        _flashBillIsProRata(1, 0);
    }

    /// (b) the same with the flash deposit into SENIOR.
    function test_C9_flashIntoSeniorAroundPermissionlessSyncDoesNotPoisonTheBill() public {
        _flashBillIsProRata(2, 0);
    }

    /// (c) the same around a junior deposit() and around a settle().
    function test_C9_flashAroundJuniorDepositDoesNotPoisonTheBill() public {
        _flashBillIsProRata(1, 1);
    }

    function test_C9_flashAroundSettleDoesNotPoisonTheBill() public {
        _flashBillIsProRata(1, 2);
    }

    function test_C9_flashIntoSeniorAroundSettleDoesNotPoisonTheBill() public {
        _flashBillIsProRata(2, 2);
    }

    /// Flows AFTER the loss is booked (v3's tests): still the control.
    function test_C9_flowsAfterTheLossDoNotChangeTheBill() public {
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
        deal(address(USDC), carol, 5_000_000e6);
        _seniorDeposit(carol, 5_000_000e6);
        uint256 flow = _bill();
        vm.prank(whale);
        felix.redeem(sh, whale, whale);
        console2.log("control / flash into Felix and senior after the loss", ctl, flow);
        assertApproxEqAbs(flow, ctl, 1e6);
    }

    /// (1, cap) The atomic sandwich in ONE transaction with a real Morpho flash loan. The collateral oracle has dropped
    ///     (ASSUMED, mocked) but nobody has liquidated yet, so no bad debt is realised or booked. The attacker, in one tx:
    ///     flash 3M, deposit 2M into senior (a loss-free moment, Felix has booked nothing), permissionless `syncSenior()`
    ///     (succeeds, baseline supply = the inflated supply), the real `Morpho.liquidate` (crystallises the bad debt), a Felix
    ///     touch (books it), `settle()` at the due second, redeem, repay. `exposed` is capped at the exposure snapshot's
    ///     supply, so the bill is the independent pro rata figure of senior's share when the loss happened (0.1% plus
    ///     1 USDC), not scaled by the supply inflation (here x3).
    function test_C9_atomicFlashSandwichDoesNotScaleTheBillUp() public {
        _felixSetup();
        vm.warp(block.timestamp + 7 days - 3 hours);
        junior.syncSenior();
        _felixTouch();
        lostPre = felix.lostAssets();
        vm.mockCall(bd.mp.oracle, abi.encodeCall(IOracle.price, ()), abi.encode(bd.price / 100)); // ASSUMED: collateral -99%
        vm.warp(block.timestamp + 3 hours); // the settle is due
        uint256 fracPre = felix.balanceOf(felixAdapter) * 1e24 / felix.totalSupply();
        SandwichAttacker atk = new SandwichAttacker(USDC, MORPHO, senior, junior, felix);
        deal(address(USDC), address(atk), 1_200_000e6); // what the liquidation costs the attacker, and dust
        uint256 supplyBefore = senior.totalSupply();
        vm.recordLogs();
        atk.run(3_000_000e6, bd.mp, bd.borrower, bd.collateral, bd.debt);
        vm.clearMockedCalls();
        (bool covered, uint256 owed,,) = _coverFromLogs();
        uint256 expected = (felix.lostAssets() - lostPre) * fracPre / 1e24;
        console2.log("senior supply (1e18 units) before / flash deposit 2M => x3", supplyBefore / 1e18);
        console2.log("owed (capped) / independent pro rata figure", owed, expected);
        assertTrue(covered);
        assertGt(expected, 1_000e6);
        assertApproxEqAbs(owed, expected, expected / 1000 + 1e6);
    }

    /// (3) Senior exits after the snapshot still shrink the Felix bill (the exposed < felixExpSupply path): half of senior
    ///     leaves, then the loss; the bill is the full-snapshot bill scaled by the supply left (1% plus 1 USDC). Printed
    ///     against senior's true pro rata share: the supply scaling slightly under-bills it (Felix's own supply shrank too).
    function test_C9_seniorExitsAfterTheSnapshotShrinkTheFelixBill() public {
        _felixSetup();
        uint256 half = senior.balanceOf(alice) / 2;
        vm.prank(alice);
        senior.redeem(half, alice, alice);
        junior.observeSenior();
        _lossBooked();
        uint256 full = (felix.lostAssets() - lostPre) * fracAtSnap / 1e24;
        uint256 scaled = full * senior.totalSupply() / expSupply;
        uint256 trueShare = (felix.lostAssets() - lostPre) * (felix.balanceOf(felixAdapter) * 1e24 / felix.totalSupply()) / 1e24;
        (, uint256 owed,,) = _settle();
        console2.log("full-snapshot bill / scaled by supply left / owed", full, scaled, owed);
        console2.log("senior's true pro rata share after the exit (printed)", trueShare);
        assertLt(owed, full * 6 / 10, "the exits shrank the bill");
        assertApproxEqAbs(owed, scaled, scaled / 100 + 1e6);
    }

    function _coverFromLogs() internal returns (bool covered, uint256 owed, uint256 paid, uint256 carried) {
        Vm.Log[] memory ls = vm.getRecordedLogs();
        for (uint256 i = 0; i < ls.length; i++) {
            if (ls[i].emitter != address(junior) || ls[i].topics.length == 0) continue;
            if (ls[i].topics[0] == keccak256("Cover(uint256,uint256)")) {
                covered = true;
                (owed, paid) = abi.decode(ls[i].data, (uint256, uint256));
            } else if (ls[i].topics[0] == keccak256("CoverShortfallCarried(uint256)")) {
                carried = abi.decode(ls[i].data, (uint256));
            }
        }
    }

    /// (e) Loss liquidated, a sync lands BEFORE Felix books it, then the booking touch: billed once, no double count; the
    ///     next settle bills nothing. Compared with the ordinary order.
    function test_C9_syncBeforeTheBookingTouchBillsOnce() public {
        _felixSetup();
        uint256 snap = vm.snapshotState();
        _lossBooked();
        uint256 ctl = _bill();
        vm.revertToState(snap);
        vm.warp(block.timestamp + 7 days - 3 hours);
        junior.syncSenior();
        _felixTouch();
        lostPre = felix.lostAssets();
        _liquidateWithBadDebt(); // not yet booked: Felix's stored lostAssets did not move
        assertEq(felix.lostAssets(), lostPre);
        junior.syncSenior(); // nothing booked, so this sync may reset
        _felixTouch(); // books it
        vm.warp(block.timestamp + 3 hours);
        senior.accrueInterest();
        uint256 once = _bill();
        console2.log("ordinary order / sync before booking", ctl, once);
        assertApproxEqAbs(once, ctl, 1e6);
        _nextSettle();
        (bool c2,,,) = _settle();
        assertFalse(c2, "and never again");
    }

    /// (f) Dust guard: a 1 wei bump of Felix's lostAssets never blocks syncSenior (the reset happens); a real booked loss does.
    function test_C9_dustBumpNeverBlocksSyncButARealLossDoes() public {
        _felixSetup();
        vm.warp(block.timestamp + 1 hours);
        uint256 lost = felix.lostAssets();
        _setFelixLost(lost + 1);
        junior.syncSenior();
        (, uint96 lostBase,,) = junior.felixExp(0);
        assertEq(lostBase, lost + 1, "a 1 wei bump does not block: the reset happened");
        _setFelixLost(lost + 1 + 100e6);
        vm.warp(block.timestamp + 1 hours);
        junior.syncSenior();
        (, uint96 lostBase2,,) = junior.felixExp(0);
        assertEq(lostBase2, lost + 1, "a booked loss above 1 ppm blocks the reset");
    }

    /// (g) snapFelixExposure is gated, and never forgives a booked-but-unbilled loss.
    function test_C9_snapFelixExposureIsGatedAndDoesNotForgive() public {
        _felixSetup();
        vm.prank(carol);
        vm.expectRevert(JuniorVault.NotAgent.selector);
        junior.snapFelixExposure();
        _lossBooked();
        (, uint96 lostBefore,,) = junior.felixExp(0);
        vm.prank(agent);
        junior.snapFelixExposure();
        (, uint96 lostAfter,,) = junior.felixExp(0);
        assertEq(lostAfter, lostBefore, "the agent's snapshot kept the base");
        vm.prank(owner);
        junior.snapFelixExposure(); // the owner may too
        uint256 expected = _independentBill();
        (bool c, uint256 owed,,) = _settle();
        assertTrue(c, "the booked loss is still billed");
        assertApproxEqAbs(owed, expected, expected / 1000 + 1e6);
    }

    /// (5) The curator takes Felix out of senior (funds deallocated first), the agent re-takes the exposure while it is out,
    ///     Felix books a loss, the adapter is added back: nothing is billed for a loss booked while it was out of the snapshot.
    function test_C9_adapterOutOfTheSnapshotIsNotBilled() public {
        _felixSetup();
        vm.warp(block.timestamp + 7 days - 3 hours);
        vm.startPrank(owner);
        senior.deallocate(felixAdapter, "", senior.allocation(keccak256(abi.encode("this", felixAdapter))));
        senior.setLiquidityAdapterAndData(address(0), "");
        _curate(abi.encodeCall(IVaultV2.removeAdapter, (felixAdapter)));
        vm.stopPrank();
        junior.syncSenior();
        vm.prank(agent);
        junior.snapFelixExposure();
        assertFalse(_hasExp(0), "Felix is not in the snapshot");
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
        assertFalse(_hasExp(0), "settle never re-takes the exposure; only the agent or owner does");
    }

    /// (6a) Residual, allocator OUT of Felix after the snapshot, then Felix books a loss: senior holds nothing there but is
    ///      billed fraction-at-snapshot * delta (over-bill). Bound asserted from chain reads (tolerance 0.1% + 1 USDC).
    function test_C9_allocatorOutOfFelixOverBillsBoundedBySnapshotFraction() public {
        _felixSetup();
        vm.warp(block.timestamp + 7 days - 3 hours);
        junior.syncSenior();
        uint256 inFelix = senior.allocation(keccak256(abi.encode("this", felixAdapter)));
        vm.prank(owner);
        senior.deallocate(felixAdapter, "", inFelix);
        _felixTouch();
        lostPre = felix.lostAssets();
        _liquidateWithBadDebt();
        _felixTouch();
        vm.warp(block.timestamp + 3 hours);
        uint256 bound = (felix.lostAssets() - lostPre) * fracAtSnap / 1e24;
        (bool c, uint256 owed,,) = _settle();
        console2.log("allocator OUT: senior holds 0 in Felix, billed / bound", owed, bound);
        assertTrue(c);
        assertApproxEqAbs(owed, bound, bound / 1000 + 1e6);
    }

    /// (6b) Residual, allocator INTO Felix after a snapshot taken at fraction 0: the loss is under-billed (here: not at all);
    ///      senior absorbs it. Printed with what the pro rata share would have been.
    function test_C9_allocatorIntoFelixAfterAZeroFractionSnapshotUnderBills() public {
        _felixSetupNoSnap();
        uint256 inFelix = senior.allocation(keccak256(abi.encode("this", felixAdapter)));
        vm.prank(owner);
        senior.deallocate(felixAdapter, "", inFelix);
        _snapExposure();
        assertLt(fracAtSnap, 1e12, "a dust of shares is left after the deallocation");
        vm.prank(owner);
        senior.allocate(felixAdapter, "", SENIOR_SIZE - 10);
        _lossBooked();
        uint256 wouldBe = (felix.lostAssets() - lostPre) * (felix.balanceOf(felixAdapter) * 1e24 / felix.totalSupply()) / 1e24;
        (, uint256 owed, uint256 paid,) = _settle();
        console2.log("allocator INTO Felix: billed / pro rata share senior now holds", owed, wouldBe);
        assertLt(owed, 1e6, "zero fraction at the snapshot: (almost) nothing billed");
        assertLt(paid, 1e6);
        assertGt(wouldBe, 1_000e6);
    }

    /// (7) syncSenior while lost_now > lostBase refuses to reset; deposit and settle still work; the Felix term is billed once.
    function test_C9_syncRefusesWhileALossIsBookedThenBillsOnce() public {
        _felixSetup();
        _lossBooked();
        (, uint96 lostBase0,,) = junior.felixExp(0);
        junior.syncSenior();
        (, uint96 lostBase1,,) = junior.felixExp(0);
        assertEq(lostBase1, lostBase0, "sync did not reset");
        deal(address(USDC), carol, 1_000e6);
        _juniorDeposit(carol, 1_000e6); // deposit syncs too and still works
        (, uint96 lostBase2,,) = junior.felixExp(0);
        assertEq(lostBase2, lostBase0);
        uint256 expected = _independentBill();
        (bool c1, uint256 owed1,,) = _settle();
        assertTrue(c1);
        assertApproxEqAbs(owed1, expected, expected / 1000 + 1e6);
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
    ///     below the 2M small-block limit. Modes: 0 short data, 1 codeless vault, 2 dirty word, 3 31-byte answers, 4 max/max,
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
            vm.prank(agent);
            junior.snapFelixExposure(); // all probes meet the garbage here
            if (mode == 7) assertTrue(_hasExp(1), "valid at the snapshot");
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

/// @dev Plays a flash in one transaction: deposit X into `vault` (Felix or senior; 0 = none), run a PERMISSIONLESS junior call
///      (0 syncSenior, 1 a junior deposit, 2 settle), redeem.
contract Flasher {
    function flash(IERC20 usdc, address vault, uint256 x, JuniorVault junior, uint8 op) external {
        uint256 shares;
        if (vault != address(0)) {
            usdc.approve(vault, x);
            shares = IERC4626(vault).deposit(x, address(this));
        }
        if (op == 0) junior.syncSenior();
        else if (op == 1) {
            usdc.approve(address(junior), 1_000e6);
            junior.deposit(1_000e6, address(this));
        } else junior.settle();
        if (vault != address(0)) IERC4626(vault).redeem(shares, address(this), address(this));
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

/// @dev The atomic sandwich: Morpho flash loan, deposit into senior, permissionless sync, real liquidation, Felix touch, settle,
///      redeem, repay.
contract SandwichAttacker {
    IERC20 internal usdc;
    IMorpho internal morpho;
    IVaultV2 internal senior;
    JuniorVault internal junior;
    IERC4626 internal felix;

    constructor(IERC20 usdc_, IMorpho morpho_, IVaultV2 senior_, JuniorVault junior_, IERC4626 felix_) {
        usdc = usdc_;
        morpho = morpho_;
        senior = senior_;
        junior = junior_;
        felix = felix_;
    }

    function run(uint256 x, MarketParams calldata mp, address borrower, uint256 collateral, uint256 debt) external {
        usdc.approve(address(morpho), type(uint256).max);
        morpho.flashLoan(address(usdc), x, abi.encode(mp, borrower, collateral, debt));
    }

    function onMorphoFlashLoan(uint256 assets, bytes calldata data) external {
        (MarketParams memory mp, address borrower, uint256 collateral, uint256 debt) =
            abi.decode(data, (MarketParams, address, uint256, uint256));
        usdc.approve(address(senior), assets - debt);
        uint256 shares = senior.deposit(assets - debt, address(this));
        junior.syncSenior(); // no loss is realised yet: succeeds, baseline supply = the inflated supply
        morpho.liquidate(mp, borrower, collateral, 0, ""); // crystallises the bad debt
        usdc.approve(address(felix), 1e6);
        felix.deposit(1e6, address(this)); // touches Felix: books it
        junior.settle();
        senior.redeem(shares, address(this), address(this));
    }
}
