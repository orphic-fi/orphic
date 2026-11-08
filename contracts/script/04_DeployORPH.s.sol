// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {ORPH} from "../src/ORPH.sol";
import {TeamVesting} from "../src/TeamVesting.sol";

/// Monday. ORPH: 1,000,000,000 fixed supply, no owner, no mint.
///   60% pool seed        -> POOL_SEEDER (the address that mints the ORPH/HYPE position; your EOA or Safe)
///   15% treasury         -> TimelockController (3-day delay; proposer/executor = TREASURY_ADMIN)
///   15% team             -> TeamVesting: 2-year linear vest from launch, 6-month cliff, beneficiary TEAM
///   10% agent and school -> a second TimelockController (same delay), for incentives
/// Env: DEPLOYER (the broadcaster), POOL_SEEDER, TREASURY_ADMIN, TEAM, DELAY (default 3 days).
contract DeployORPH is Script {
    uint256 constant SUPPLY = 1_000_000_000e18;

    function run() external {
        address deployer = vm.envAddress("DEPLOYER");
        address poolSeeder = vm.envAddress("POOL_SEEDER");
        address treasuryAdmin = vm.envAddress("TREASURY_ADMIN");
        address team = vm.envAddress("TEAM");
        uint256 delay = vm.envOr("DELAY", uint256(3 days));

        address[] memory admins = new address[](1);
        admins[0] = treasuryAdmin;

        vm.startBroadcast(deployer);
        ORPH orph = new ORPH(deployer, SUPPLY);
        TimelockController treasury = new TimelockController(delay, admins, admins, address(0));
        TimelockController incentives = new TimelockController(delay, admins, admins, address(0));
        TeamVesting vesting = new TeamVesting(team, uint64(block.timestamp), 730 days, 182 days);

        orph.transfer(poolSeeder, SUPPLY * 60 / 100);
        orph.transfer(address(treasury), SUPPLY * 15 / 100);
        orph.transfer(address(vesting), SUPPLY * 15 / 100);
        orph.transfer(address(incentives), SUPPLY * 10 / 100);
        vm.stopBroadcast();

        console2.log("ORPH       ", address(orph));
        console2.log("TREASURY   ", address(treasury));
        console2.log("INCENTIVES ", address(incentives));
        console2.log("VESTING    ", address(vesting));

        require(orph.totalSupply() == SUPPLY, "supply");
        require(orph.balanceOf(deployer) == 0, "deployer kept ORPH");
        require(orph.balanceOf(poolSeeder) == SUPPLY * 60 / 100, "pool");
        require(orph.balanceOf(address(treasury)) == SUPPLY * 15 / 100, "treasury");
        require(orph.balanceOf(address(vesting)) == SUPPLY * 15 / 100, "vesting");
        require(orph.balanceOf(address(incentives)) == SUPPLY * 10 / 100, "incentives");
        require(vesting.owner() == team && vesting.cliff() == block.timestamp + 182 days, "vesting terms");
        require(treasury.getMinDelay() == delay, "delay");
        console2.log("verify: ok");
    }
}
