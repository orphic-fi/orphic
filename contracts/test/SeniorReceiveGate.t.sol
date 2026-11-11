// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// Tests of the senior receive-shares gate (audit fixes 4/8: C7, C3b senior side, C3 late buyer) on a HyperEVM fork with a
// REAL Vault V2 senior and a real JuniorVault. The gate is set through the curator's submit with the 3-day timelock
// warped, as the live wiring will do it. Numbers are printed; tolerances are stated next to the assertion that uses them.

import "./Base.t.sol";
import {Vm} from "forge-std/Vm.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IOracle} from "morpho-blue/interfaces/IOracle.sol";
import {MorphoBalancesLib} from "morpho-blue/libraries/periphery/MorphoBalancesLib.sol";
import {ErrorsLib} from "vault-v2/libraries/ErrorsLib.sol";
import {SeniorReceiveGate, IJuniorGateView} from "../src/SeniorReceiveGate.sol";

interface IFelixLostView {
    function lostAssets() external view returns (uint256);
    function withdrawQueue(uint256) external view returns (bytes32);
    function withdrawQueueLength() external view returns (uint256);
}

/// @dev A dependency that burns all the gas it is given.
contract GasBurner {
    fallback() external payable {
        for (;;) {}
    }
}

/// @dev Minimal MetaMorpho-shaped vault and adapter for junior's exposure snapshot (it probes `morphoVaultV1`, `lostAssets`,
///      `totalSupply`, `balanceOf` and the adapter's `realAssets`).
contract MockFelixVault {
    uint256 public lostAssets;
    uint256 public totalSupply = 1_000e6;

    function balanceOf(address) external pure returns (uint256) {
        return 1_000e6;
    }

    function setLost(uint256 v) external {
        lostAssets = v;
    }
}

contract MockFelixAdapter {
    address public morphoVaultV1;

    constructor(address v) {
        morphoVaultV1 = v;
    }

    function realAssets() external pure returns (uint256) {
        return 1_000e6;
    }
}

contract SeniorReceiveGateTest is Base {
    using MorphoBalancesLib for IMorpho;

    SeniorReceiveGate gate;
    address carol = makeAddr("carol");
    address keeper = makeAddr("keeper");

    function setUp() public override {
        super.setUp();
        deal(address(USDC), carol, 1_000_000e6);
    }

    /* helpers */

    /// @dev The curator path of the live wiring: timelock on the setter, submit, wait 3 days, execute. Gate owner = curator.
    function _setGate() internal {
        gate = new SeniorReceiveGate(senior, IJuniorGateView(address(junior)), owner);
        vm.startPrank(owner);
        _curate(abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.setReceiveSharesGate.selector, 3 days)));
        senior.submit(abi.encodeCall(IVaultV2.setReceiveSharesGate, (address(gate))));
        vm.warp(block.timestamp + 3 days);
        senior.setReceiveSharesGate(address(gate));
        vm.stopPrank();
        assertEq(senior.receiveSharesGate(), address(gate));
    }

    /// @dev Gate set, alice in senior, bob in junior, baseline synced.
    function _world(uint256 seniorSize, uint256 juniorSize) internal {
        _setGate();
        _seniorDeposit(alice, seniorSize);
        _juniorDeposit(bob, juniorSize);
        junior.syncSenior();
    }

    /// @dev A real loss on senior: shrink the Felix adapter's shares by `lossAssets` worth (same trick as CoverFixes).
    function _forceSeniorLoss(uint256 lossAssets) internal {
        uint256 adapterShares = IERC4626(FELIX_USDC_V1).balanceOf(felixAdapter);
        uint256 lossShares = IERC4626(FELIX_USDC_V1).convertToShares(lossAssets);
        deal(FELIX_USDC_V1, felixAdapter, adapterShares - lossShares, true);
    }

    /// @dev Third-party state write (ASSUMED, as in CoverFixes): Felix's `lostAssets` slot found by write and read back.
    function _setFelixLost(uint256 v) internal {
        for (uint256 i = 0; i < 40; i++) {
            bytes32 orig = vm.load(FELIX_USDC_V1, bytes32(i));
            vm.store(FELIX_USDC_V1, bytes32(i), bytes32(v));
            if (IFelixLostView(FELIX_USDC_V1).lostAssets() == v) return;
            vm.store(FELIX_USDC_V1, bytes32(i), orig);
        }
        revert("lostAssets slot not found");
    }

    function _nextSettle() internal {
        vm.warp(junior.lastSettle() + junior.SETTLE_INTERVAL());
    }

    function _seniorValue(address who) internal view returns (uint256) {
        return senior.convertToAssets(senior.balanceOf(who));
    }

    function _ok(address who) internal view returns (bool) {
        return gate.canReceiveShares(who);
    }

    /// @dev A new depositor and a transfer receiver are both refused with Vault V2's own error.
    function _assertRefusesNewcomers() internal {
        vm.startPrank(carol);
        USDC.approve(address(senior), 1_000e6);
        vm.expectRevert(ErrorsLib.CannotReceiveShares.selector);
        senior.deposit(1_000e6, carol);
        vm.expectRevert(ErrorsLib.CannotReceiveShares.selector);
        senior.mint(1_000e6, carol);
        vm.stopPrank();
        vm.prank(alice);
        vm.expectRevert(ErrorsLib.CannotReceiveShares.selector);
        senior.transfer(carol, 1e6);
        assertFalse(_ok(carol));
    }

    /// @dev Exempt accounts still pass while the gate refuses everyone else.
    function _assertExemptsPass() internal {
        assertTrue(_ok(address(junior)), "junior");
        assertTrue(_ok(felixAdapter), "felix adapter");
        assertTrue(_ok(marketAdapter), "market adapter");
        vm.prank(owner);
        gate.setAllowed(keeper, true);
        assertTrue(_ok(keeper), "allowlisted");
        // an allowlisted account really can receive a transfer while the gate refuses others
        vm.prank(alice);
        senior.transfer(keeper, 1e6);
        vm.prank(owner);
        gate.setAllowed(keeper, false);
        assertFalse(_ok(keeper), "allowlist removed");
    }

    /* normal times */

    function test_normalTimes_depositMintTransferPassAndFeeSharesStillMint() public {
        _world(100_000e6, 20_000e6);
        assertTrue(_ok(carol));
        _seniorDeposit(carol, 5_000e6);
        vm.prank(bob);
        USDC.approve(address(senior), 1_000e6);
        vm.prank(bob);
        senior.mint(500e12, bob); // mint path
        vm.prank(alice);
        senior.transfer(carol, 1e6); // transfer path
        assertGt(senior.balanceOf(carol), 0);
        // junior's management-fee shares mint with the gate set (the fee recipient check is inside accrueInterestView)
        uint256 before_ = senior.balanceOf(address(junior));
        vm.warp(block.timestamp + 10 days);
        senior.accrueInterest();
        uint256 minted = senior.balanceOf(address(junior)) - before_;
        console2.log("fee shares minted to junior over 10 days with the gate set", minted);
        assertGt(minted, 0, "management fee shares minted");
        // a month later, still open: the fee drift and Felix yield never read as a loss
        vm.warp(block.timestamp + 30 days);
        senior.accrueInterest();
        assertTrue(_ok(carol), "still open after 40 days");
        _seniorDeposit(carol, 1_000e6);
    }

    /* each refuse condition in isolation */

    function test_refuse_realLossOutstanding() public {
        _world(100_000e6, 20_000e6);
        _forceSeniorLoss(500e6);
        // isolate: no carry, no booked Felix loss, no cover in progress
        assertEq(junior.carryPerShare(), 0);
        assertEq(junior.coverInProgress(), 0);
        assertFalse(_ok(carol), "price below the baseline");
        _assertRefusesNewcomers();
        _assertExemptsPass();
        // the settle covers it; once recognised the gate opens again
        _nextSettle();
        junior.settle();
        vm.warp(block.timestamp + 5 days);
        senior.accrueInterest();
        assertEq(junior.carryPerShare(), 0);
        assertTrue(_ok(carol), "open after cover recognised");
    }

    function test_refuse_carryOutstanding() public {
        _setGate();
        _seniorDeposit(alice, 100_000e6);
        _juniorDeposit(bob, 1_000e6);
        junior.syncSenior();
        _forceSeniorLoss(5_000e6);
        _nextSettle();
        junior.settle(); // pays idle (about 1,001) only, the rest becomes a carried debt
        assertGt(junior.carryPerShare(), 0, "carry outstanding");
        vm.warp(block.timestamp + 5 days); // cover paid is recognised by now: carry is the only reason left
        senior.accrueInterest();
        assertLe(junior.coverInProgress(), gate.maxUnrecognised(), "cover recognised");
        assertFalse(_ok(carol), "refused on carry alone");
        _assertRefusesNewcomers();
        _assertExemptsPass();
        // the debt is paid at the next settle, the gate opens after recognition
        deal(address(USDC), address(junior), USDC.balanceOf(address(junior)) + 20_000e6);
        _nextSettle();
        junior.settle();
        assertEq(junior.carryPerShare(), 0);
        vm.warp(block.timestamp + 10 days); // 4,000 USDC cover recognised at about 550 USDC a day on 100k
        senior.accrueInterest();
        assertTrue(_ok(carol), "open after the debt is paid and recognised");
    }

    struct BadDebt {
        MarketParams mp;
        address borrower;
        uint256 collateral;
        uint256 debt;
        uint256 price;
    }

    BadDebt internal bd;

    /// @dev Same mechanism as CoverFixes C9: a real borrow in the Felix-supplied USDC market where Felix's supply is largest.
    function _openFelixBorrower(uint256 maxDebt) internal {
        IFelixLostView felix = IFelixLostView(FELIX_USDC_V1);
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

    function _felixTouch() internal {
        address t = makeAddr("felixToucher");
        deal(address(USDC), t, 1e6);
        vm.startPrank(t);
        USDC.approve(FELIX_USDC_V1, 1e6);
        IERC4626(FELIX_USDC_V1).deposit(1e6, t);
        vm.stopPrank();
    }

    /// @dev The oracle price is ASSUMED to fall 99%; the liquidation itself is the real `Morpho.liquidate`.
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

    function test_refuse_bookedFelixLossNotYetBilled() public {
        _openFelixBorrower(1_000_000e6); // before any warp: the oracle must be fresh
        _setGate();
        _seniorDeposit(alice, 1_000_000e6);
        _juniorDeposit(bob, 50_000e6);
        junior.syncSenior();
        vm.prank(agent);
        junior.snapFelixExposure();
        vm.warp(junior.lastSettle() + junior.SETTLE_INTERVAL() - 3 hours);
        junior.syncSenior();
        _felixTouch(); // books Felix's interest first, so it cannot absorb the loss
        assertTrue(_ok(carol), "open before the loss");
        uint256 badDebt = _liquidateWithBadDebt(); // REAL Morpho liquidation with bad debt
        _felixTouch(); // books lostAssets
        vm.warp(block.timestamp + 3 hours); // the settle is due
        senior.accrueInterest();
        (, uint96 lostBase,,) = junior.felixExp(0);
        console2.log("bad debt booked by Morpho", badDebt);
        console2.log("Felix lostAssets vs junior's lostBase", IFelixLostView(FELIX_USDC_V1).lostAssets(), lostBase);
        assertGt(IFelixLostView(FELIX_USDC_V1).lostAssets(), lostBase, "Felix booked a loss");
        // isolate: Vault V2 never marks it, so the gross price, the carry and the cover in progress are all untouched
        assertEq(junior.carryPerShare(), 0);
        assertEq(junior.coverInProgress(), 0);
        assertFalse(_ok(carol), "booked Felix loss refuses");
        _assertRefusesNewcomers();
        _assertExemptsPass();
        // settle bills it (idle 50k pays what it can), which re-takes lostBase
        junior.settle();
        (, uint96 lostBase2,,) = junior.felixExp(0);
        assertEq(uint256(lostBase2), IFelixLostView(FELIX_USDC_V1).lostAssets(), "baseline re-taken");
        console2.log("carry left after the settle", junior.carryPerShare());
        assertFalse(_ok(carol), "still refused: cover (or carry) in progress right after the settle");
        // recognition runs, the gate opens (Felix touched on both sides of the wait, as its own users would)
        _felixTouch();
        vm.warp(block.timestamp + 10 days);
        _felixTouch();
        senior.accrueInterest();
        assertTrue(_ok(carol), "open once billed and recognised");
    }

    function test_refuse_unrecognisedCoverAboveThreshold() public {
        _world(100_000e6, 20_000e6);
        deal(address(USDC), bob, 300e6);
        vm.prank(bob);
        USDC.transfer(address(senior), 300e6); // a cover-shaped transfer into senior
        uint256 inProgress = junior.coverInProgress();
        console2.log("unrecognised after a 300 USDC push", inProgress);
        assertGt(inProgress, gate.maxUnrecognised());
        assertEq(junior.carryPerShare(), 0);
        // the gate's own replica of coverInProgress is exact: the threshold equal to junior's figure passes, one below refuses
        vm.startPrank(owner);
        gate.setMaxUnrecognised(inProgress);
        assertTrue(_ok(carol), "at the threshold");
        gate.setMaxUnrecognised(inProgress - 1);
        assertFalse(_ok(carol), "one below the threshold");
        gate.setMaxUnrecognised(10e6);
        vm.stopPrank();
        assertFalse(_ok(carol));
        _assertRefusesNewcomers();
        _assertExemptsPass();
        // owner raising the threshold above it opens the gate (setter works); back down closes it
        vm.prank(owner);
        gate.setMaxUnrecognised(400e6);
        assertTrue(_ok(carol));
        vm.prank(owner);
        gate.setMaxUnrecognised(10e6);
        assertFalse(_ok(carol));
        vm.warp(block.timestamp + 1 days);
        assertTrue(_ok(carol), "recognised within a day at 100k");
    }

    /* a FeeRouter-sized push unblocks within minutes at the live maxRate */

    function test_feeRouterSizedPushUnblocksWithinMinutes() public {
        _world(420_000e6, 20_000e6); // live senior is about 420k
        assertTrue(_ok(carol));
        uint256 snap = vm.snapshotState();
        deal(address(USDC), address(router), 12e6);
        vm.prank(address(router));
        USDC.transfer(address(senior), 12e6); // the push is a plain USDC transfer into senior
        uint256 inProgress = junior.coverInProgress();
        uint256 t0 = block.timestamp;
        uint256 waited;
        bool refusedAtStart = !_ok(carol);
        for (uint256 s = 30; s <= 3_600; s += 30) {
            vm.warp(t0 + s);
            if (_ok(carol)) {
                waited = s;
                break;
            }
        }
        console2.log("12 USDC push: unrecognised at t0", inProgress);
        console2.log("12 USDC push: seconds until deposits are accepted", waited);
        assertTrue(refusedAtStart, "12 USDC is above the 10 USDC threshold at t0");
        assertGt(waited, 0, "opened inside an hour");
        assertLe(waited, 600, "within 10 minutes");
        // a push below the threshold never blocks (fresh state)
        vm.revertToState(snap);
        deal(address(USDC), address(router), 8e6);
        vm.prank(address(router));
        USDC.transfer(address(senior), 8e6);
        assertTrue(_ok(carol), "8 USDC push never refuses");
    }

    /* a reverting or garbage dependency never reverts the gate and never blocks fee minting */

    function test_dependencyWithoutCode_neverRevertsAndFeeSharesStillMint() public {
        _world(100_000e6, 20_000e6);
        vm.warp(block.timestamp + 1 days);
        senior.accrueInterest();
        uint256 feeBefore = senior.balanceOf(address(junior));
        vm.etch(address(junior), ""); // junior is now an address without code
        assertFalse(_ok(carol), "non-exempt refused, no revert");
        assertTrue(_ok(address(junior)), "junior exempt, decided before any read");
        assertTrue(_ok(felixAdapter), "adapter exempt");
        vm.warp(block.timestamp + 1 days);
        senior.accrueInterest(); // would revert if the gate reverted for the fee recipient
        assertGt(senior.balanceOf(address(junior)), feeBefore, "fee shares still mint");
        // senior still works for exits
        vm.prank(alice);
        senior.redeem(1_000e12, alice, alice);
        vm.prank(carol);
        vm.expectRevert(ErrorsLib.CannotReceiveShares.selector);
        senior.deposit(1, carol);
    }

    function test_garbageAndRevertingDependencies_neverRevert() public {
        _world(100_000e6, 20_000e6);
        assertTrue(_ok(carol));
        // 1. a reverting adapter view
        vm.mockCallRevert(felixAdapter, abi.encodeWithSelector(bytes4(keccak256("realAssets()"))), "boom");
        assertFalse(_ok(carol), "reverting adapter view refuses");
        assertTrue(_ok(felixAdapter), "adapter stays exempt");
        vm.clearMockedCalls();
        assertTrue(_ok(carol));
        // 2. a one-byte answer where a word is expected
        vm.mockCall(address(senior), abi.encodeWithSelector(senior.adaptersLength.selector), hex"01");
        assertFalse(_ok(carol), "malformed adaptersLength");
        vm.clearMockedCalls();
        vm.mockCall(address(senior), abi.encodeWithSelector(senior.isAdapter.selector), hex"01");
        assertTrue(_ok(carol), "a malformed isAdapter answer is just not an adapter; the checks themselves pass");
        vm.clearMockedCalls();
        // 3. values that overflow the arithmetic
        vm.mockCall(address(junior), abi.encodeWithSelector(junior.seniorPriceBase.selector), abi.encode(type(uint256).max));
        assertFalse(_ok(carol), "overflow refuses, no revert");
        vm.clearMockedCalls();
        vm.mockCall(address(junior), abi.encodeWithSelector(junior.seniorBaseTime.selector), abi.encode(type(uint256).max));
        assertFalse(_ok(carol), "baseline time in the future refuses, no revert");
        vm.clearMockedCalls();
        // 4. a Felix vault entry that burns all gas: the probe is capped, the gate stays cheap and refuses
        address burner = address(new GasBurner());
        vm.mockCall(
            address(junior),
            abi.encodeWithSelector(junior.felixExp.selector, uint256(0)),
            abi.encode(burner, uint96(0), uint128(0), uint128(0))
        );
        uint256 g0 = gasleft();
        bool res = _ok(carol);
        uint256 used = g0 - gasleft();
        console2.log("gas with a gas-burning Felix vault (refused)", used);
        assertFalse(res);
        assertLt(used, 400_000);
        vm.clearMockedCalls();
        // 5. a gas-starved caller: the guarded self-call runs out, the gate returns false instead of reverting
        uint256 ok0 = _gasOf(carol);
        (bool success, bytes memory ret) = address(gate).staticcall{gas: 150_000}(abi.encodeCall(gate.canReceiveShares, (carol)));
        console2.log("normal-times gas / result at a 150k gas limit", ok0, success ? abi.decode(ret, (bool)) : false);
    }

    function test_checkClearIsNotCallableByOthers() public {
        _world(100_000e6, 20_000e6);
        vm.expectRevert();
        gate.checkClear();
    }

    /* the C3b and C7 sequences, gated vs ungated vs control */

    /// @dev Senior loss, a holder exits half of senior, a buyer tries to enter with the same USDC, settle, recognition.
    ///      Returns alice's total value (USDC in hand + senior shares at the recognised price) and whether the buyer got in.
    function _c3b(bool gated, bool buyer) internal returns (uint256 aliceTotal, bool buyerIn, uint256 juniorNav) {
        if (gated) _setGate();
        _seniorDeposit(alice, 100_000e6);
        _juniorDeposit(bob, 20_000e6);
        junior.syncSenior();
        _forceSeniorLoss(2_000e6);
        vm.warp(block.timestamp + 1 hours);
        uint256 half = senior.balanceOf(alice) / 2;
        vm.prank(alice);
        uint256 out = senior.redeem(half, alice, alice);
        if (buyer) {
            deal(address(USDC), carol, out);
            vm.startPrank(carol);
            USDC.approve(address(senior), out);
            try senior.deposit(out, carol) {
                buyerIn = true;
            } catch (bytes memory err) {
                assertEq(bytes4(err), ErrorsLib.CannotReceiveShares.selector, "refused with V2's own error");
            }
            vm.stopPrank();
        }
        _nextSettle();
        junior.settle();
        vm.warp(block.timestamp + 6 days);
        senior.accrueInterest();
        aliceTotal = USDC.balanceOf(alice) + _seniorValue(alice);
        juniorNav = junior.totalAssets();
    }

    function test_C3b_exitThenBuy_gatedBuyerRefusedHolderAtControl() public {
        uint256 snap = vm.snapshotState();
        (uint256 ctl,, uint256 ctlJ) = _c3b(true, false);
        vm.revertToState(snap);
        (uint256 gated, bool gatedIn, uint256 gatedJ) = _c3b(true, true);
        vm.revertToState(snap);
        (uint256 ungated, bool ungatedIn, uint256 ungatedJ) = _c3b(false, true);
        console2.log("alice total / junior NAV: control (gated, no buyer)", ctl, ctlJ);
        console2.log("alice total / junior NAV: gated, buyer attempts", gated, gatedJ);
        console2.log("alice total / junior NAV: UNGATED, buyer enters", ungated, ungatedJ);
        assertFalse(gatedIn, "buyer refused (CannotReceiveShares)");
        assertTrue(ungatedIn, "without the gate the buyer is in");
        assertApproxEqAbs(gated, ctl, 2e6, "senior holder within 2 USDC of the no-buyer control");
        assertApproxEqAbs(gatedJ, ctlJ, 2e6, "junior within 2 USDC of the control");
        console2.log("ungated: junior pays extra vs control", int256(ctlJ) - int256(ungatedJ));
        assertGt(ctlJ, ungatedJ + 100e6, "the ungated buyer really cost junior extra cover");
    }

    /// @dev C3 late buyer: a buyer enters AFTER the loss and BEFORE the settle, and takes a pro rata part of junior's top-up.
    function _c3late(bool gated, bool buyer) internal returns (uint256 aliceTotal, bool buyerIn, uint256 juniorNav) {
        if (gated) _setGate();
        _seniorDeposit(alice, 100_000e6);
        _juniorDeposit(bob, 20_000e6);
        junior.syncSenior();
        _forceSeniorLoss(2_000e6);
        vm.warp(block.timestamp + 1 hours);
        if (buyer) {
            vm.startPrank(carol);
            USDC.approve(address(senior), 100_000e6);
            try senior.deposit(100_000e6, carol) {
                buyerIn = true;
            } catch (bytes memory err) {
                assertEq(bytes4(err), ErrorsLib.CannotReceiveShares.selector);
            }
            vm.stopPrank();
        }
        _nextSettle();
        junior.settle();
        vm.warp(block.timestamp + 6 days);
        senior.accrueInterest();
        aliceTotal = USDC.balanceOf(alice) + _seniorValue(alice);
        juniorNav = junior.totalAssets();
    }

    function test_C3_lateBuyer_gatedRefusedHolderAtControl() public {
        uint256 snap = vm.snapshotState();
        (uint256 ctl,, uint256 ctlJ) = _c3late(true, false);
        vm.revertToState(snap);
        (uint256 gated, bool gatedIn, uint256 gatedJ) = _c3late(true, true);
        vm.revertToState(snap);
        (uint256 ungated, bool ungatedIn, uint256 ungatedJ) = _c3late(false, true);
        console2.log("alice total / junior NAV: control (gated, no buyer)", ctl, ctlJ);
        console2.log("alice total / junior NAV: gated, late buyer attempts", gated, gatedJ);
        console2.log("alice total / junior NAV: UNGATED, late buyer enters", ungated, ungatedJ);
        assertFalse(gatedIn, "late buyer refused");
        assertTrue(ungatedIn);
        assertApproxEqAbs(gated, ctl, 2e6, "senior holder within 2 USDC of the no-buyer control");
        assertApproxEqAbs(gatedJ, ctlJ, 2e6);
        console2.log("ungated: senior holder loses vs control", int256(ctl) - int256(ungated));
        assertGt(ctl, ungated + 2e6, "the ungated late buyer really took part of the top-up");
    }

    /// @dev Loss, settle pays the cover, a depositor arrives before the price has recognised it (C7), recognition runs.
    function _c7(bool gated, bool buyer) internal returns (uint256 aliceValue, bool buyerIn, uint256 carolShares) {
        if (gated) _setGate();
        _seniorDeposit(alice, 100_000e6);
        _juniorDeposit(bob, 20_000e6);
        junior.syncSenior();
        _forceSeniorLoss(2_000e6);
        _nextSettle();
        junior.settle(); // cover paid, price recognises it over days
        assertGt(junior.coverInProgress(), 1_000e6, "cover in progress");
        if (buyer) {
            deal(address(USDC), carol, 100_000e6);
            vm.startPrank(carol);
            USDC.approve(address(senior), 100_000e6);
            try senior.deposit(100_000e6, carol) {
                buyerIn = true;
            } catch (bytes memory err) {
                assertEq(bytes4(err), ErrorsLib.CannotReceiveShares.selector);
            }
            vm.stopPrank();
        }
        vm.warp(block.timestamp + 6 days);
        senior.accrueInterest();
        aliceValue = _seniorValue(alice);
        carolShares = senior.balanceOf(carol);
    }

    function test_C7_coverThenDeposit_gatedDepositorRefusedHolderAtControl() public {
        uint256 snap = vm.snapshotState();
        (uint256 ctl,,) = _c7(true, false);
        vm.revertToState(snap);
        (uint256 gated, bool gatedIn,) = _c7(true, true);
        vm.revertToState(snap);
        (uint256 ungated, bool ungatedIn,) = _c7(false, true);
        console2.log("alice senior value: control", ctl);
        console2.log("alice senior value: gated, depositor attempts", gated);
        console2.log("alice senior value: UNGATED, depositor enters", ungated);
        assertFalse(gatedIn, "depositor refused");
        assertTrue(ungatedIn);
        assertApproxEqAbs(gated, ctl, 2e6, "senior holder within 2 USDC of the no-buyer control");
        assertGt(ctl, ungated + 100e6, "the ungated depositor really captured part of the cover");
        console2.log("captured by the ungated depositor (control - ungated)", ctl - ungated);
        // liveness: once recognised the gate is open and the same deposit now goes through
        vm.revertToState(snap);
        _c7(true, false);
        assertTrue(_ok(carol), "open after recognition");
        _seniorDeposit(carol, 100_000e6);
    }

    /* owner functions */

    function test_ownerFunctions() public {
        _world(100_000e6, 20_000e6);
        vm.expectRevert();
        gate.setAllowed(keeper, true); // not the owner
        vm.expectRevert();
        gate.setMaxUnrecognised(1e6);
        vm.startPrank(owner);
        vm.expectEmit(true, false, false, true, address(gate));
        emit SeniorReceiveGate.AllowedSet(keeper, true);
        gate.setAllowed(keeper, true);
        vm.expectEmit(false, false, false, true, address(gate));
        emit SeniorReceiveGate.MaxUnrecognisedSet(25e6);
        gate.setMaxUnrecognised(25e6);
        uint256 cap = gate.MAX_UNRECOGNISED_CAP();
        vm.expectRevert(SeniorReceiveGate.AboveCap.selector);
        gate.setMaxUnrecognised(cap + 1);
        gate.setMaxUnrecognised(cap);
        // two-step ownership
        gate.transferOwnership(carol);
        assertEq(gate.owner(), owner);
        vm.stopPrank();
        vm.prank(carol);
        gate.acceptOwnership();
        assertEq(gate.owner(), carol);
        assertEq(gate.maxUnrecognised(), gate.MAX_UNRECOGNISED_CAP());
    }

    function test_defaultsAndWrongPair() public {
        _setGate();
        assertEq(gate.maxUnrecognised(), 10e6);
        assertEq(address(gate.senior()), address(senior));
        assertEq(address(gate.junior()), address(junior));
        address otherSenior = makeAddr("otherSenior");
        vm.expectRevert(SeniorReceiveGate.WrongPair.selector);
        new SeniorReceiveGate(IVaultV2(otherSenior), IJuniorGateView(address(junior)), owner);
    }

    /* gas */

    function _cool() internal {
        address[8] memory a = [
            address(gate), address(senior), address(junior), felixAdapter, marketAdapter, FELIX_USDC_V1, address(USDC), address(MORPHO)
        ];
        for (uint256 i = 0; i < a.length; i++) {
            vm.cool(a[i]);
        }
    }

    function _gasOf(address who) internal returns (uint256 used) {
        _cool();
        uint256 g0 = gasleft();
        gate.canReceiveShares(who);
        used = g0 - gasleft();
    }

    function _depositGas() internal returns (uint256) {
        deal(address(USDC), carol, 10_000e6);
        vm.prank(carol);
        USDC.approve(address(senior), 10_000e6);
        _cool();
        vm.prank(carol);
        uint256 g0 = gasleft();
        senior.deposit(10_000e6, carol);
        return g0 - gasleft();
    }

    /// @dev A senior deposit into the Felix liquidity adapter, state cold at the start, without and with the gate set.
    function test_gas_gatedDepositVsUngated() public {
        _seniorDeposit(alice, 420_000e6);
        _juniorDeposit(bob, 20_000e6);
        junior.syncSenior();
        uint256 snap = vm.snapshotState();
        uint256 without = _depositGas();
        vm.revertToState(snap);
        _setGate();
        uint256 withGate = _depositGas();
        console2.log("senior deposit gas without the gate", without);
        console2.log("senior deposit gas with the gate", withGate);
        console2.log("gate overhead", withGate - without);
        assertLt(withGate, 1_500_000, "inside HyperEVM's 2M small block");
    }

    function test_gas_perBranch() public {
        _world(420_000e6, 20_000e6);
        vm.prank(owner);
        gate.setAllowed(keeper, true);
        console2.log("gas junior (exempt)", _gasOf(address(junior)));
        console2.log("gas allowlisted (exempt)", _gasOf(keeper));
        console2.log("gas adapter (exempt)", _gasOf(felixAdapter));
        console2.log("gas normal times, full check, passes", _gasOf(carol));
        // refuse branches, each in a fresh state
        uint256 snap = vm.snapshotState();
        _forceSeniorLoss(500e6);
        console2.log("gas refuse (1) loss outstanding", _gasOf(carol));
        vm.revertToState(snap);
        vm.prank(agent);
        junior.snapFelixExposure();
        (, uint96 lostBase,,) = junior.felixExp(0);
        _setFelixLost(uint256(lostBase) + 1_000e6);
        console2.log("gas refuse (3) booked Felix loss", _gasOf(carol));
        vm.revertToState(snap);
        deal(address(USDC), bob, 300e6);
        vm.prank(bob);
        USDC.transfer(address(senior), 300e6);
        console2.log("gas refuse (4) unrecognised cover", _gasOf(carol));
        vm.revertToState(snap);
        _forceSeniorLoss(5_000e6);
        _nextSettle();
        junior.settle();
        // carry only exists if junior could not pay: here it can, so (2) is exercised in the carry test; measure the pass path again
        console2.log("gas after a fully paid cover (refused by (4))", _gasOf(carol));
    }

    /* review round 1 */

    /// B1: Felix rounding bumps `lostAssets` and anyone can book one with dust; junior forgives it at its next sync, so the
    ///     gate uses junior's own 1 ppm guard. A 1-wei bump does not refuse; a loss above the guard does.
    function test_B1_dustBumpDoesNotRefuseButRealLossDoes() public {
        _world(100_000e6, 20_000e6);
        // junior's snapshot was taken at construction with an empty senior (fraction 0, assetsRef 0: nothing billed, nothing
        // refused, as in L11 item 8); the keeper's snapshot after funds arrive is what arms the Felix term
        vm.prank(agent);
        junior.snapFelixExposure();
        (, uint96 lostBase, uint128 fraction, uint128 assetsRef) = junior.felixExp(0);
        console2.log("entry fraction / assetsRef", fraction, assetsRef);
        _setFelixLost(uint256(lostBase) + 1);
        assertTrue(_ok(carol), "a 1-wei bump never refuses");
        _seniorDeposit(carol, 1_000e6);
        // the bump at which junior's guard trips: (lost - lostBase) * fraction / 1e24 * 1e6 > assetsRef
        uint256 trip = uint256(assetsRef) * 1e18 / fraction;
        console2.log("lostAssets bump that trips the guard", trip);
        _setFelixLost(uint256(lostBase) + trip / 2);
        assertTrue(_ok(carol), "half the guard passes");
        _setFelixLost(uint256(lostBase) + trip * 2);
        assertEq(junior.carryPerShare(), 0);
        assertLe(junior.coverInProgress(), gate.maxUnrecognised(), "isolated: not the cover condition");
        assertFalse(_ok(carol), "above 1 ppm refuses");
    }

    /// S1: with a performance fee and a recipient other than junior, V2 asks the gate about that recipient from inside
    ///     `accrueInterestView`, which the gate's own checks call: the recipient is exempt before any heavy check.
    function test_S1_performanceFeeRecipientIsExemptNoRecursion() public {
        address perf = makeAddr("perfRecipient");
        vm.startPrank(owner);
        _curate(abi.encodeCall(IVaultV2.setPerformanceFeeRecipient, (perf)));
        _curate(abi.encodeCall(IVaultV2.setPerformanceFee, (0.1e18)));
        vm.stopPrank();
        _world(100_000e6, 20_000e6);
        vm.warp(block.timestamp + 10 days);
        senior.accrueInterest(); // would revert or recurse if the gate asked itself about `perf`
        console2.log("performance fee shares minted", senior.balanceOf(perf));
        assertGt(senior.balanceOf(perf), 0, "performance fee mints");
        assertGt(senior.balanceOf(address(junior)), 0, "management fee mints");
        // normal times: deposit and transfer work
        _seniorDeposit(carol, 1_000e6);
        vm.prank(alice);
        senior.transfer(carol, 1e6);
        assertLt(_gasOf(perf), 30_000, "cheap exemption");
        // during a loss the recipient stays exempt while a newcomer is refused
        _forceSeniorLoss(500e6);
        assertTrue(_ok(perf), "recipient exempt");
        assertFalse(_ok(bob), "newcomer refused");
    }

    /// S2: junior's `felixExp` can be longer than senior's adapter list (an adapter removed since the last snap keeps its
    ///     entry). A booked loss on a later entry still refuses.
    function test_S2_removedAdaptersLaterEntryStillRefuses() public {
        MockFelixVault vA = new MockFelixVault();
        MockFelixVault vB = new MockFelixVault();
        address aA = address(new MockFelixAdapter(address(vA)));
        address aB = address(new MockFelixAdapter(address(vB)));
        vm.startPrank(owner);
        _curate(abi.encodeCall(IVaultV2.addAdapter, (aA)));
        _curate(abi.encodeCall(IVaultV2.addAdapter, (aB)));
        vm.stopPrank();
        vm.prank(agent);
        junior.snapFelixExposure();
        assertTrue(_hasExp(2), "three entries: Felix, A, B");
        assertFalse(_hasExp(3));
        vm.startPrank(owner);
        senior.setLiquidityAdapterAndData(address(0), "");
        _curate(abi.encodeCall(IVaultV2.removeAdapter, (felixAdapter)));
        _curate(abi.encodeCall(IVaultV2.removeAdapter, (marketAdapter)));
        vm.stopPrank();
        assertEq(senior.adaptersLength(), 2, "two adapters left, three entries");
        _setGate();
        assertTrue(_ok(carol), "open before the loss");
        vB.setLost(100e6); // entry index 2, past senior.adaptersLength()
        assertFalse(_ok(carol), "a booked loss on the later entry refuses");
        vB.setLost(0);
        assertTrue(_ok(carol));
    }

    function _hasExp(uint256 i) internal view returns (bool ok) {
        (ok,) = address(junior).staticcall(abi.encodeCall(junior.felixExp, (i)));
    }

    /// S3: cost against Felix's withdraw-queue length (`previewRedeem` loops its markets, twice per check).
    function test_S3_gasAgainstFelixQueueLength() public {
        _world(420_000e6, 20_000e6);
        IFelixLostView felix = IFelixLostView(FELIX_USDC_V1);
        uint256 bal = IERC4626(FELIX_USDC_V1).balanceOf(felixAdapter);
        _cool();
        uint256 g0 = gasleft();
        IERC4626(FELIX_USDC_V1).previewRedeem(bal);
        uint256 preview = g0 - gasleft();
        uint256 check = _gasOf(carol);
        uint256 qlen = felix.withdrawQueueLength();
        console2.log("Felix withdraw queue length", qlen);
        console2.log("Felix previewRedeem gas (cold)", preview);
        console2.log("gate full check gas (cold)", check);
        console2.log("approx gas per Felix market per preview", preview / qlen);
        // fail closed beyond what the caller gives: a starved call refuses, a funded one passes
        (bool s1, bytes memory r1) = address(gate).staticcall{gas: 400_000}(abi.encodeCall(gate.canReceiveShares, (carol)));
        assertTrue(s1);
        assertFalse(abi.decode(r1, (bool)), "400k gas: fails closed");
        _cool();
        (bool s2, bytes memory r2) = address(gate).staticcall{gas: 1_500_000}(abi.encodeCall(gate.canReceiveShares, (carol)));
        assertTrue(s2 && abi.decode(r2, (bool)), "1.5M gas: passes");
        assertLt(check, 1_000_000, "inside the 1.0M cap");
    }
}
