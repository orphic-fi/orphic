// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, Vm} from "forge-std/Test.sol";
import {DeployORPH} from "../script/04_DeployORPH.s.sol";
import {ORPH} from "../src/ORPH.sol";
import {TeamVesting} from "../src/TeamVesting.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

contract ORPHTest is Test {
    address deployer = 0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38;
    address seeder = makeAddr("seeder");
    address admin = makeAddr("admin");
    address team = makeAddr("team");

    ORPH orph;
    TeamVesting vesting;
    TimelockController treasury;

    function setUp() public {
        vm.setEnv("DEPLOYER", vm.toString(deployer));
        vm.setEnv("POOL_SEEDER", vm.toString(seeder));
        vm.setEnv("TREASURY_ADMIN", vm.toString(admin));
        vm.setEnv("TEAM", vm.toString(team));
        vm.recordLogs();
        new DeployORPH().run();
        Vm.Log[] memory logs = vm.getRecordedLogs();
        // Transfer logs from the token, in order: mint, pool, treasury, vesting, incentives
        uint256 n;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] != keccak256("Transfer(address,address,uint256)")) continue;
            if (n == 0) orph = ORPH(logs[i].emitter);
            address to = address(uint160(uint256(logs[i].topics[2])));
            if (n == 2) treasury = TimelockController(payable(to));
            if (n == 3) vesting = TeamVesting(payable(to));
            n++;
        }
    }

    function test_distributionAndNoOwner() public view {
        assertEq(orph.totalSupply(), 1_000_000_000e18);
        assertEq(orph.balanceOf(seeder), 600_000_000e18);
        assertEq(orph.balanceOf(address(vesting)), 150_000_000e18);
        assertEq(orph.balanceOf(deployer), 0);
        // no owner(), no mint(): the selectors do not exist
        (bool ok,) = address(orph).staticcall(abi.encodeWithSignature("owner()"));
        assertFalse(ok);
    }

    function test_cliffThenLinear() public {
        uint256 start = block.timestamp;
        vm.warp(start + 181 days);
        assertEq(vesting.releasable(address(orph)), 0);
        vm.warp(start + 182 days);
        assertApproxEqRel(vesting.releasable(address(orph)), uint256(150_000_000e18) * 182 / 730, 1e12);
        vm.warp(start + 730 days);
        assertEq(vesting.releasable(address(orph)), 150_000_000e18);
        vm.prank(team);
        vesting.release(address(orph));
        assertEq(orph.balanceOf(team), 150_000_000e18);
    }

    function test_treasuryIsTimelocked() public {
        bytes memory data = abi.encodeWithSelector(orph.transfer.selector, team, 1e18);
        vm.prank(admin);
        treasury.schedule(address(orph), 0, data, bytes32(0), bytes32(0), 3 days);
        vm.prank(admin);
        vm.expectRevert();
        treasury.execute(address(orph), 0, data, bytes32(0), bytes32(0));
        vm.warp(block.timestamp + 3 days);
        vm.prank(admin);
        treasury.execute(address(orph), 0, data, bytes32(0), bytes32(0));
        assertEq(orph.balanceOf(team), 1e18);
    }
}
