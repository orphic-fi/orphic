// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVaultV2} from "vault-v2/interfaces/IVaultV2.sol";
import {IMorphoBase} from "morpho-blue/interfaces/IMorpho.sol";
import {SubmitSenior} from "../../script/06b_SubmitSenior.s.sol";
import {ExecuteSenior} from "../../script/06c_ExecuteSenior.s.sol";
import {CutOver} from "../../script/06d_CutOver.s.sol";
import {DeployJuniorV2} from "../../script/06a_DeployJuniorV2.s.sol";
import {JuniorVault} from "../../src/JuniorVault.sol";
import {FeeRouter} from "../../src/FeeRouter.sol";
import {SeniorReceiveGate} from "../../src/SeniorReceiveGate.sol";
import {Addresses} from "../../script/Addresses.sol";

interface IPreFixJunior {
    function lastSettle() external view returns (uint256);
    function SETTLE_INTERVAL() external view returns (uint256);
    function settle() external;
    function requestExit(uint256) external;
    function claimExit() external;
    function exitOf(address) external view returns (uint128 shares, uint64 readyAt, uint32 hint);
    function balanceOf(address) external view returns (uint256);
    function pricePerShare() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function depositsPaused() external view returns (bool);
    function rules(address, bytes4) external view returns (bool, uint256);
    function execute(address, bytes calldata) external returns (bytes memory);
}

/// LIVE-STATE rehearsal of the migration (audit fixes 7/8) with the DATED calendar encoded from chain state. A and B run only after the old
/// junior's first settle S1; C is 3 days after B; the holder claims and redeposits right after S2 = S1 + interval, which must come BEFORE
/// v2's own first settle (A + interval, v2's constructor sets lastSettle = block.timestamp): see test_calendar_*. Gas metering is paused
/// (the flow exceeds the block cap): this test proves no gas figure; the anvil replay does.
/// Against the real pre-fix old junior, senior and old router: forge test
/// --fork-url / HYPEREVM_RPC at a recent block (LIVE_FORK_BLOCK pins one). Valid only while the migration has not been signed: if
/// senior already has a receive gate it skips. Role holders are pranked, the timelock and the old settle are warped, in this TEST only.
/// Funding 0x2DBE with USDC is prerequisite 0 (a fork cheat here). The old junior is the live pre-fix bytecode; v2, router v2 and
/// the gate come from the 06a script.
contract MigrationLiveTest is Test, Addresses {
    IVaultV2 constant senior = IVaultV2(0x3F7382bd8BFC6C548CAa2D7B4dfCe628B12A9759);
    IPreFixJunior constant oldJ = IPreFixJunior(0x20D5F4f78858D257eA047EB5F47773E361697F2E);
    address constant oldRouter = 0xC2d2C5e56798Bfd0EEc67EEC12ddC2b521b1aA37;
    address constant FELIX = 0x8A862fD6c12f9ad34C9c2ff45AB2b6712e8CEa27;
    address constant AGENT = 0xC772F0ea992236dA71Fa30b8899D71B680866956;
    address constant TREASURY = 0xba08A51bb1BB49E9840Eb55511E8880F95306A40;
    address fresh = makeAddr("freshDepositor");

    function _setUp() internal {
        string memory rpc = vm.envString("HYPEREVM_RPC");
        uint256 blk = vm.envOr("LIVE_FORK_BLOCK", uint256(0));
        if (blk == 0) vm.createSelectFork(rpc);
        else vm.createSelectFork(rpc, blk);
        if (senior.receiveSharesGate() != address(0)) vm.skip(true); // already migrated: this rehearsal no longer applies
        vm.pauseGasMetering();
        deal(USDC, JUNIOR_OWNER, 5e6); // prerequisite 0
        vm.deal(JUNIOR_OWNER, 10 ether);
        vm.deal(SENIOR_SAFE, 1 ether);
        vm.setEnv("SENIOR", vm.toString(address(senior)));
        vm.setEnv("AGENT", vm.toString(AGENT));
        vm.setEnv("TREASURY", vm.toString(TREASURY));
        vm.setEnv("OLD_JUNIOR", vm.toString(address(oldJ)));
        vm.setEnv("OLD_ROUTER", vm.toString(oldRouter));
        due1 = oldJ.lastSettle() + oldJ.SETTLE_INTERVAL();
        vm.setEnv("OLD_SETTLE_DUE", vm.toString(due1));
    }

    /// The calendar from chain state. FAILS if the redeposit after S2 would land after v2's first settle for A = the first UTC midnight
    /// after S1, and prints the boundaries: the EARLIEST A that still works (A + interval > S2 + window; later A only widens the margin)
    /// and the LATEST A (B + 3 d <= S2, so C and D are done and v2 is open for the redeposit).
    function test_calendar_fromChainState() public {
        _setUp();
        uint256 interval = oldJ.SETTLE_INTERVAL();
        uint256 s1 = due1;
        uint256 s2 = s1 + interval;
        uint256 a0 = (s1 / DAY + 1) * DAY; // Mon 16 Nov 00:00 UTC when S1 is Sun 15 Nov 20:27
        uint256 v2Due = a0 + interval; // v2's constructor: lastSettle = block.timestamp
        console2.log("S1", s1);
        console2.log("S2", s2);
        console2.log("A (next UTC midnight after S1)", a0);
        console2.log("v2 first settle due", v2Due);
        console2.log("margin over S2 (seconds)", v2Due - s2);
        assertGt(v2Due, s2 + WINDOW, "the redeposit after S2 would land after v2's first settle: A is too early");
        uint256 aMin = s2 + WINDOW - interval;
        uint256 aMax = s2 - 3 days;
        console2.log("earliest A that works", aMin);
        console2.log("latest A that works (C and D by S2)", aMax);
        assertTrue(a0 >= aMin && a0 <= aMax, "A inside its window");
        assertFalse(aMin - 1 + interval > s2 + WINDOW, "one second earlier than the earliest A fails");
        assertFalse(aMax + 1 + 3 days <= s2, "one second later than the latest A fails");
        // the holder's deadline from the CONTRACT's own formula: the latest request priced at S2 (readyAt <= S2), one second later is not
        uint256 deadline = (s2 / DAY) * DAY - oldJ_NOTICE();
        uint256 snap = vm.snapshotState();
        vm.warp(deadline);
        vm.prank(JUNIOR_OWNER);
        oldJ.requestExit(1e6);
        (, uint64 r1,) = oldJ.exitOf(JUNIOR_OWNER);
        assertLe(uint256(r1), s2, "a request at the deadline is priced at S2");
        vm.revertToState(snap);
        vm.warp(deadline + 1);
        vm.prank(JUNIOR_OWNER);
        oldJ.requestExit(1e6);
        (, uint64 r2,) = oldJ.exitOf(JUNIOR_OWNER);
        assertGt(uint256(r2), s2, "one second later is priced at the settle after S2");
        console2.log("holder deadline (UTC unix)", deadline);
    }

    function oldJ_NOTICE() internal view returns (uint256) {
        (bool ok, bytes memory r) = address(oldJ).staticcall(abi.encodeWithSignature("NOTICE()"));
        require(ok, "NOTICE");
        return abi.decode(r, (uint256));
    }

    DeployJuniorV2 a;
    JuniorVault v2;
    SeniorReceiveGate gate;
    uint256 bAt;
    uint256 due1;
    uint256 constant DAY = 1 days;
    uint256 constant WINDOW = 2 hours; // the claim + redeposit are done within this long after S2

    function test_liveStateMigration_endState_phaseE_and_gate() public {
        _setUp();
        _phaseAB();
        _phaseC();
        _gateWhileLoss();
        _phaseD();
        _phaseE();
    }

    function _phaseAB() internal {
        uint256 holderShares = oldJ.balanceOf(JUNIOR_OWNER);
        assertGt(holderShares, 0, "0x2DBE holds the old junior");
        // the holder's exit request, now (before Sun 15 Nov 00:00 UTC): priced at S2
        vm.prank(JUNIOR_OWNER);
        oldJ.requestExit(holderShares);
        // A and B are REFUSED before S1
        vm.setEnv("DEPLOYER", vm.toString(JUNIOR_OWNER));
        DeployJuniorV2 early = DeployJuniorV2(deployCode("06a_DeployJuniorV2.s.sol:DeployJuniorV2"));
        vm.expectRevert(bytes("the old junior has not settled yet (S1): deploy v2 after it"));
        early.run();
        // S1: the old junior's real first settle (keeper: accrueInterest + settle) at its due second
        vm.warp(due1);
        senior.accrueInterest();
        oldJ.settle();
        assertGe(oldJ.lastSettle(), due1);
        // A = the first UTC midnight after S1
        vm.warp((due1 / DAY + 1) * DAY);
        a = DeployJuniorV2(deployCode("06a_DeployJuniorV2.s.sol:DeployJuniorV2"));
        a.run();
        v2 = a.junior();
        gate = a.gate();
        vm.setEnv("JUNIOR", vm.toString(address(v2)));
        vm.setEnv("GATE", vm.toString(address(gate)));
        assertEq(senior.managementFeeRecipient(), address(oldJ), "A moved nothing on senior");
        assertTrue(v2.depositsPaused());
        vm.setEnv("DEPLOYER", vm.toString(SENIOR_SAFE));
        new SubmitSenior().run();
        bAt = block.timestamp;
    }

    function _phaseC() internal {
        // C: permissionless once B matures; B ran after S1, so any caller's C is after S1 + 3 days
        vm.warp(bAt + 3 days);
        new ExecuteSenior().run();
        assertEq(senior.managementFeeRecipient(), address(v2), "fee recipient is v2");
        assertEq(senior.receiveSharesGate(), address(gate), "gate wired");
    }

    /// a fresh depositor is accepted in normal times and refused ONLY while a loss is outstanding
    function _gateWhileLoss() internal {
        assertTrue(gate.canReceiveShares(fresh), "fresh account accepted with no loss");
        vm.mockCall(FELIX, abi.encodeWithSignature("lostAssets()"), abi.encode(uint256(1e18))); // a booked Felix bad debt
        assertFalse(gate.canReceiveShares(fresh), "fresh account refused while a Felix loss is booked");
        deal(USDC, fresh, 100e6);
        vm.startPrank(fresh);
        IERC20(USDC).approve(address(senior), 100e6);
        vm.expectRevert(abi.encodeWithSignature("CannotReceiveShares()"));
        senior.deposit(100e6, fresh);
        vm.stopPrank();
        vm.clearMockedCalls();
        assertTrue(gate.canReceiveShares(fresh), "accepted again once the loss is gone");
    }

    /// D: senior is unaffected by the cut-over (same block: price and total assets within 1 USDC)
    function _phaseD() internal {
        vm.setEnv("DEPLOYER", vm.toString(JUNIOR_OWNER));
        uint256 ta0 = senior.totalAssets();
        uint256 p0 = senior.convertToAssets(1e18);
        new CutOver().run();
        assertApproxEqAbs(senior.totalAssets(), ta0, 1e6, "senior totalAssets unchanged by D");
        assertApproxEqAbs(senior.convertToAssets(1e18), p0, 1e6, "senior price unchanged by D");
        assertFalse(v2.depositsPaused(), "v2 open after D");
        assertTrue(oldJ.depositsPaused(), "old junior paused");
        (bool s1,) = oldJ.rules(MORPHO, IMorphoBase.supply.selector);
        (bool s2,) = oldJ.rules(MORPHO, IMorphoBase.withdraw.selector);
        assertFalse(s1 || s2, "old Morpho rules off");
        assertEq(FeeRouter(oldRouter).junior(), address(v2));
        assertEq(a.router().junior(), address(v2));
        assertEq(a.router().keeper(), AGENT);
    }

    /// E: the old junior's next settle prices the exit; the agent recalls Felix and redeems the senior fee shares first
    function _phaseE() internal {
        uint256 due2 = oldJ.lastSettle() + oldJ.SETTLE_INTERVAL();
        vm.warp(due2 - 600);
        senior.accrueInterest();
        uint256 fAssets = IVaultLike(FELIX).convertToAssets(IERC20(FELIX).balanceOf(address(oldJ)));
        vm.startPrank(AGENT);
        oldJ.execute(FELIX, abi.encodeWithSignature("withdraw(uint256,address,address)", fAssets, address(oldJ), address(oldJ)));
        oldJ.execute(address(senior), abi.encodeWithSignature("redeem(uint256,address,address)", IERC20(address(senior)).balanceOf(address(oldJ)), address(oldJ), address(oldJ)));
        vm.stopPrank();
        vm.warp(due2);
        senior.accrueInterest();
        oldJ.settle();
        (uint128 exShares,,) = oldJ.exitOf(JUNIOR_OWNER);
        uint256 expected = uint256(exShares) * oldJ.pricePerShare() / 1e18 / 1e12;
        uint256 before_ = IERC20(USDC).balanceOf(JUNIOR_OWNER);
        vm.prank(JUNIOR_OWNER);
        oldJ.claimExit();
        uint256 got = IERC20(USDC).balanceOf(JUNIOR_OWNER) - before_;
        assertEq(got, expected, "0x2DBE is paid shares x price");
        assertGe(got, 80e6 - 1e6, "about its 80 USDC NAV or more");
        assertLe(IERC20(USDC).balanceOf(address(oldJ)), 2e6, "only the dead seed's share stays in the old junior");
        console2.log("0x2DBE claimed (USDC units)", got);
        console2.log("left in the old junior (USDC units)", IERC20(USDC).balanceOf(address(oldJ)));
        // redeposit into v2 the same day
        uint256 amt = IERC20(USDC).balanceOf(JUNIOR_OWNER);
        vm.startPrank(JUNIOR_OWNER);
        IERC20(USDC).approve(address(v2), amt);
        v2.deposit(amt, JUNIOR_OWNER);
        vm.stopPrank();
        assertGt(v2.balanceOf(JUNIOR_OWNER), 0, "redeposited into v2");
        console2.log("deposited into v2 (USDC units)", amt);
        console2.log("v2 shares", v2.balanceOf(JUNIOR_OWNER));
        // the redeposit (right after S2) landed BEFORE v2's own first settle, which now runs on a funded v2
        uint256 v2Due = v2.lastSettle() + v2.SETTLE_INTERVAL();
        assertLt(block.timestamp, v2Due, "v2's first settle must come after the redeposit");
        console2.log("hours between S2 and v2's first settle", (v2Due - due2) / 3600);
        vm.warp(v2Due);
        senior.accrueInterest();
        v2.settle();
        assertGt(v2.pricePerShare(), 0, "v2 settled with funds: price > 0");
        assertGe(v2.totalAssets(), amt, "v2 holds the redeposit");
    }
}

interface IVaultLike {
    function convertToAssets(uint256) external view returns (uint256);
}
