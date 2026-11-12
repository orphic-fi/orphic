// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console2, Vm} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVaultV2} from "vault-v2/interfaces/IVaultV2.sol";
import {IMorphoBase} from "morpho-blue/interfaces/IMorpho.sol";
import {DeploySenior} from "../../script/01_DeploySenior.s.sol";
import {DeployJuniorRouter} from "../../script/02_DeployJuniorRouter.s.sol";
import {WireSenior} from "../../script/03_WireSenior.s.sol";
import {DeployJuniorV2} from "../../script/06a_DeployJuniorV2.s.sol";
import {SubmitSenior} from "../../script/06b_SubmitSenior.s.sol";
import {ExecuteSenior} from "../../script/06c_ExecuteSenior.s.sol";
import {CutOver} from "../../script/06d_CutOver.s.sol";
import {JuniorVault} from "../../src/JuniorVault.sol";
import {FeeRouter} from "../../src/FeeRouter.sol";
import {SeniorReceiveGate} from "../../src/SeniorReceiveGate.sol";
import {Addresses} from "../../script/Addresses.sol";

/// Fresh-fork rehearsal of the migration (audit fixes 7/8): the old system is built by scripts 01-03 on a fork BEFORE the live
/// senior (the audit's fresh mode, block 50747000, archive RPC in HYPEREVM_RPC), then phases 06a-06d run IN ORDER. The timelock
/// and the old junior's settle are crossed with vm.warp, in this TEST only; the scripts and the plan JSON carry no warps.
/// The old junior here is the fixed build (the pre-fix bytecode is not in this tree): the same migration steps and read-backs
/// apply; the live pre-fix old junior is rehearsed on a live-state fork (ops/MIGRATION.md).
/// Heavy by design: three old-system scripts, four phases and several cold gate checks (about 600k gas each) run in ONE test
/// transaction, which exceeds the 60M block cap and ran the test out of gas mid-way: gas metering is paused (the per-phase gas that
/// matters is measured by the replay on anvil, see ops/make_migration.py). The gate's own gas is covered by SeniorReceiveGate.t.sol.
contract MigrationTest is Test, Addresses {
    address constant deployer = JUNIOR_OWNER;
    address agent = makeAddr("agent");
    address treasury = makeAddr("treasury");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    address senior;
    address oldJunior;
    address oldRouter;
    DeployJuniorV2 a;
    uint256 bSubmittedAt;

    function _asOld() internal {
        vm.pauseGasMetering();
        vm.createSelectFork(vm.envOr("HYPEREVM_RPC", string("https://rpc.hyperliquid.xyz/evm")), vm.envOr("FORK_BLOCK", uint256(50747000)));
        deal(address(USDC), deployer, 10e6);
        vm.deal(deployer, 10 ether);
        vm.deal(SENIOR_SAFE, 1 ether);
        vm.setEnv("DEPLOYER", vm.toString(deployer));
        vm.setEnv("AGENT", vm.toString(agent));
        vm.setEnv("TREASURY", vm.toString(treasury));
        DeploySenior s1 = new DeploySenior();
        vm.recordLogs();
        s1.run();
        senior = _find(vm.getRecordedLogs(), "CreateVaultV2(address,address,bytes32,address)", 3);
        vm.setEnv("SENIOR", vm.toString(senior));
        vm.setEnv("FELIX_ADAPTER", vm.toString(IVaultV2(senior).adapters(1)));
        DeployJuniorRouter s2 = new DeployJuniorRouter();
        vm.recordLogs();
        s2.run();
        Vm.Log[] memory l2 = vm.getRecordedLogs();
        oldJunior = _find(l2, "AgentSet(address)", 0);
        oldRouter = _find(l2, "KeeperSet(address)", 0);
        vm.setEnv("JUNIOR", vm.toString(oldJunior));
        new WireSenior().run();
        // the live senior holds funds (316 USDC on 12 Nov): without them no fee accrues
        deal(address(USDC), bob, 500e6);
        vm.startPrank(bob);
        IERC20(USDC).approve(senior, 500e6);
        IVaultV2(senior).deposit(500e6, bob);
        vm.stopPrank();
        vm.setEnv("OLD_JUNIOR", vm.toString(oldJunior));
        vm.setEnv("OLD_ROUTER", vm.toString(oldRouter));
    }

    function _find(Vm.Log[] memory logs, string memory sig, uint256 topicIdx) internal pure returns (address) {
        bytes32 t0 = keccak256(bytes(sig));
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == t0) return topicIdx == 0 ? logs[i].emitter : address(uint160(uint256(logs[i].topics[topicIdx])));
        }
        revert("event not found");
    }

    function _phaseA() internal {
        a = DeployJuniorV2(deployCode("06a_DeployJuniorV2.s.sol:DeployJuniorV2")); // not `new`: it would embed JuniorVault twice in this test
        uint256 g = gasleft();
        a.run();
        console2.log("phase A script gas", g - gasleft());
        vm.setEnv("JUNIOR", vm.toString(address(a.junior())));
        vm.setEnv("GATE", vm.toString(address(a.gate())));
        vm.setEnv("ROUTER", vm.toString(address(a.router())));
    }

    function _phaseB() internal {
        vm.setEnv("DEPLOYER", vm.toString(SENIOR_SAFE));
        new SubmitSenior().run();
        bSubmittedAt = block.timestamp;
    }

    /// settle the old junior at its due second, then run C; returns the old junior's fee shares at that point
    function _settleOldAndExecute(ExecuteSenior c) internal returns (uint256 oldShares) {
        JuniorVault oj = JuniorVault(oldJunior);
        vm.warp(oj.lastSettle() + oj.SETTLE_INTERVAL());
        IVaultV2(senior).accrueInterest();
        oldShares = IERC20(senior).balanceOf(oldJunior);
        oj.settle();
        c.run();
    }

    function test_freshForkMigration_endState() public {
        _asOld();
        IVaultV2 s = IVaultV2(senior);
        _phaseA();
        JuniorVault v2 = a.junior();
        // after A: deployed beside the old system, nothing wired, v2 deposits closed
        assertEq(s.managementFeeRecipient(), oldJunior, "A must not move the fee recipient");
        assertEq(s.receiveSharesGate(), address(0), "A must not wire the gate");
        assertTrue(v2.depositsPaused() && v2.seeded(), "v2 seeded and paused after A");
        assertEq(v2.marketsLength(), 0, "no Morpho markets on v2");
        assertEq(v2.vaultsLength(), 2);
        (bool supplyAllowed,) = v2.rules(MORPHO, IMorphoBase.supply.selector);
        assertFalse(supplyAllowed, "no Morpho supply rule on v2");
        _phaseB();
        assertEq(s.managementFeeRecipient(), oldJunior, "B must not move the fee recipient");

        // C before the old junior's settle: REFUSED by the script (nothing is executed)
        vm.warp(bSubmittedAt + 3 days);
        JuniorVault oj = JuniorVault(oldJunior);
        vm.setEnv("OLD_SETTLE_DUE", vm.toString(oj.lastSettle() + oj.SETTLE_INTERVAL()));
        ExecuteSenior c = new ExecuteSenior();
        vm.expectRevert(bytes("the old junior has not settled yet: do not flip the fee recipient"));
        c.run();
        assertEq(s.managementFeeRecipient(), oldJunior, "refused C moved nothing");

        // the old junior's settle (keeper), then C: the old junior keeps the fee up to the flip
        uint256 oldShares = _settleOldAndExecute(c);
        assertGt(oldShares, 0, "old junior earned the fee up to the flip");
        assertEq(s.managementFeeRecipient(), address(v2), "fee recipient is v2");
        assertEq(s.receiveSharesGate(), address(a.gate()), "gate wired");
        assertEq(IERC20(senior).balanceOf(oldJunior), oldShares, "the flip minted nothing more for the old junior");
        assertTrue(v2.depositsPaused(), "v2 still closed after C: opens only in D");

        // D
        vm.setEnv("DEPLOYER", vm.toString(deployer));
        new CutOver().run();
        assertFalse(v2.depositsPaused(), "v2 deposits open after the checklist");
        assertTrue(oj.depositsPaused(), "old junior paused");
        (bool oldSupply,) = oj.rules(MORPHO, IMorphoBase.supply.selector);
        (bool oldWithdraw,) = oj.rules(MORPHO, IMorphoBase.withdraw.selector);
        assertFalse(oldSupply || oldWithdraw, "old Morpho rules removed");
        assertEq(FeeRouter(oldRouter).junior(), address(v2), "old router pays v2");
        FeeRouter r2 = a.router();
        assertEq(r2.senior(), senior);
        assertEq(r2.junior(), address(v2));
        assertEq(r2.treasury(), treasury);
        assertEq(SeniorReceiveGate(a.gate()).owner(), SENIOR_SAFE);

        // the result works: a v2 deposit, a senior deposit through the gate, fees now reach v2 and not the old junior
        deal(address(USDC), alice, 2_000e6);
        vm.startPrank(alice);
        IERC20(USDC).approve(address(v2), 100e6);
        v2.deposit(100e6, alice);
        IERC20(USDC).approve(senior, 1_000e6);
        IVaultV2(senior).deposit(1_000e6, alice);
        vm.stopPrank();
        assertGt(v2.balanceOf(alice), 0, "v2 deposit minted shares");
        assertGt(IERC20(senior).balanceOf(alice), 0, "senior deposit passed the gate");
        vm.warp(block.timestamp + 30 days);
        s.accrueInterest();
        assertGt(IERC20(senior).balanceOf(address(v2)), 0, "fees now reach v2");
        assertEq(IERC20(senior).balanceOf(oldJunior), oldShares, "and no longer the old junior");
    }

    /// D refuses before C
    function test_phaseD_refusesBeforeC() public {
        _asOld();
        _phaseA();
        _phaseB();
        vm.setEnv("DEPLOYER", vm.toString(deployer));
        CutOver d = new CutOver();
        vm.expectRevert(bytes("checklist: senior fee recipient is not v2 (phase C)"));
        d.run();
    }

    /// D refuses while the old junior holds a Morpho market position (RUNBOOK 8a): the rules stay on
    function test_phaseD_refusesWithOldMarketPosition() public {
        _asOld();
        _phaseA();
        _phaseB();
        vm.warp(bSubmittedAt + 3 days);
        JuniorVault oj = JuniorVault(oldJunior);
        vm.setEnv("OLD_SETTLE_DUE", vm.toString(oj.lastSettle() + oj.SETTLE_INTERVAL()));
        _settleOldAndExecute(new ExecuteSenior());
        vm.setEnv("DEPLOYER", vm.toString(deployer));
        vm.mockCall(oldJunior, abi.encodeCall(JuniorVault.marketAssets, (0)), abi.encode(uint256(1)));
        CutOver d = new CutOver();
        vm.expectRevert(bytes("checklist: the old junior holds a Morpho market position, keep its rules (RUNBOOK 8a)"));
        d.run();
        (bool oldSupply,) = oj.rules(MORPHO, IMorphoBase.supply.selector);
        assertTrue(oldSupply, "rules untouched");
    }
}
