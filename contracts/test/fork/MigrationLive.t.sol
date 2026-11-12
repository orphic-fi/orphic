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

/// LIVE-STATE rehearsal of the migration (audit fixes 7/8) against the real pre-fix old junior, senior and old router: forge test
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
    }

    DeployJuniorV2 a;
    JuniorVault v2;
    SeniorReceiveGate gate;
    uint256 bAt;
    uint256 due1;

    function test_liveStateMigration_endState_phaseE_and_gate() public {
        _setUp();
        _phaseAB();
        _phaseC();
        _gateWhileLoss();
        _phaseD();
        _phaseE();
    }

    function _phaseAB() internal {
        due1 = oldJ.lastSettle() + oldJ.SETTLE_INTERVAL();
        uint256 holderShares = oldJ.balanceOf(JUNIOR_OWNER);
        assertGt(holderShares, 0, "0x2DBE holds the old junior");
        vm.setEnv("DEPLOYER", vm.toString(JUNIOR_OWNER));
        a = DeployJuniorV2(deployCode("06a_DeployJuniorV2.s.sol:DeployJuniorV2"));
        a.run();
        v2 = a.junior();
        gate = a.gate();
        vm.setEnv("JUNIOR", vm.toString(address(v2)));
        vm.setEnv("GATE", vm.toString(address(gate)));
        assertEq(senior.managementFeeRecipient(), address(oldJ), "A moved nothing on senior");
        assertTrue(v2.depositsPaused());
        // B, and the holder's exit request (12 Nov: priced at the settle after 20 Nov 00:00, i.e. ~22 Nov)
        vm.setEnv("DEPLOYER", vm.toString(SENIOR_SAFE));
        new SubmitSenior().run();
        bAt = block.timestamp;
        vm.prank(JUNIOR_OWNER);
        oldJ.requestExit(holderShares);
    }

    function _phaseC() internal {
        // C is refused until the old junior has settled, even after the timelock
        vm.warp(bAt + 3 days);
        vm.setEnv("OLD_SETTLE_DUE", vm.toString(due1));
        ExecuteSenior c = new ExecuteSenior();
        vm.expectRevert(bytes("the old junior has not settled yet: do not flip the fee recipient"));
        c.run();
        // the old junior's real settle (keeper: accrueInterest + settle) at its due second
        vm.warp(due1);
        senior.accrueInterest();
        oldJ.settle();
        assertGe(oldJ.lastSettle(), due1);
        c.run();
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
        vm.expectRevert();
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
    }
}

interface IVaultLike {
    function convertToAssets(uint256) external view returns (uint256);
}
