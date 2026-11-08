// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console2, Vm} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVaultV2} from "vault-v2/interfaces/IVaultV2.sol";
import {DeploySenior} from "../script/01_DeploySenior.s.sol";
import {DeployJuniorRouter} from "../script/02_DeployJuniorRouter.s.sol";
import {WireSenior} from "../script/03_WireSenior.s.sol";
import {JuniorVault} from "../src/JuniorVault.sol";
import {Addresses} from "../script/Addresses.sol";

/// Runs Sunday's three deploy scripts exactly as written against a HyperEVM fork, then exercises the result.
contract DeployTest is Test, Addresses {
    address deployer = 0x2DBE1Ba83084dAF698Acea79CBAfe0493f42FecC; // JUNIOR_OWNER, the hardware wallet
    address agent = makeAddr("agent");
    address treasury = makeAddr("treasury");
    address alice = makeAddr("alice");

    function test_fullDeploySequence() public {
        vm.createSelectFork(vm.envOr("HYPEREVM_RPC", string("https://rpc.hyperliquid.xyz/evm")), vm.envOr("FORK_BLOCK", uint256(50666000)));
        deal(address(USDC), deployer, 10e6);
        vm.deal(deployer, 10 ether);
        vm.setEnv("DEPLOYER", vm.toString(deployer));
        vm.setEnv("AGENT", vm.toString(agent));
        vm.setEnv("TREASURY", vm.toString(treasury));

        // step 1
        DeploySenior s1 = new DeploySenior();
        vm.recordLogs();
        s1.run();
        // find the vault: the only V2 created by deployer in this run
        address senior = _findSenior();
        address felixAdapter = IVaultV2(senior).adapters(1);
        vm.setEnv("SENIOR", vm.toString(senior));
        vm.setEnv("FELIX_ADAPTER", vm.toString(felixAdapter));

        // step 2
        DeployJuniorRouter s2 = new DeployJuniorRouter();
        vm.recordLogs();
        s2.run();
        address junior = _findJunior();
        vm.setEnv("JUNIOR", vm.toString(junior));

        // step 3
        WireSenior s3 = new WireSenior();
        s3.run();

        assertEq(IVaultV2(senior).owner(), SENIOR_SAFE);
        assertEq(IVaultV2(senior).curator(), SENIOR_SAFE);
        assertEq(JuniorVault(junior).owner(), deployer);
        // the result works: a deposit lands in Felix, a timelocked change now waits 3 days
        deal(address(USDC), alice, 1_000e6);
        vm.startPrank(alice);
        IERC20(USDC).approve(senior, 1_000e6);
        IVaultV2(senior).deposit(1_000e6, alice);
        vm.stopPrank();
        assertApproxEqAbs(IVaultV2(senior).totalAssets(), 1_000e6, 2);
        vm.prank(SENIOR_SAFE);
        IVaultV2(senior).submit(abi.encodeCall(IVaultV2.increaseAbsoluteCap, (abi.encode("this", felixAdapter), 1e12)));
        vm.expectRevert();
        IVaultV2(senior).increaseAbsoluteCap(abi.encode("this", felixAdapter), 1e12);
        // junior is paused until Monday
        assertTrue(JuniorVault(junior).depositsPaused());
        console2.log("deploy sequence ok", senior, junior);
    }

    function _findSenior() internal returns (address) {
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 topic = keccak256("CreateVaultV2(address,address,bytes32,address)");
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == topic) return address(uint160(uint256(logs[i].topics[3])));
        }
        revert("no vault");
    }

    function _findJunior() internal returns (address) {
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 topic = keccak256("AgentSet(address)");
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == topic) return logs[i].emitter;
        }
        revert("no junior");
    }
}
