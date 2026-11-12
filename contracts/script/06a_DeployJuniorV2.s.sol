// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IMorpho} from "morpho-blue/interfaces/IMorpho.sol";
import {IOracle} from "morpho-blue/interfaces/IOracle.sol";
import {IVaultV2} from "vault-v2/interfaces/IVaultV2.sol";
import {JuniorVault} from "../src/JuniorVault.sol";
import {FeeRouter} from "../src/FeeRouter.sol";
import {SeniorReceiveGate, IJuniorGateView} from "../src/SeniorReceiveGate.sol";
import {Addresses} from "./Addresses.sol";

/// Migration phase A (audit fixes 7/8). Signer: JUNIOR_OWNER. RUNS ONLY AFTER the old junior's first settle S1 (OLD_SETTLE_DUE, the
/// second it is due: old lastSettle + 6 d 23 h = 1794774420, Sun 15 Nov 20:27:00 UTC): v2's own first settle is due 6 d 23 h after this
/// phase, and v2 must hold the holders' capital before it (they redeposit right after the old junior's second settle S2 = S1 + 6 d 23 h). Deploys everything the fixed system needs beside the live
/// senior, wires NOTHING on senior (that is phases B and C) and leaves v2 deposits paused (opened in phase D).
///   1. JuniorVault v2 (forge links the external library VenueAdmin: a CREATE2 through 0x4e59..956C, skipped if the library
///      already exists), seeded with 1 USDC, deposits paused, agent set.
///   2. v2 universe = Felix + the senior vault. No Morpho markets and no Morpho rules (the shipped keeper only uses Felix;
///      adding a market later is an owner step: addMarket, setRule, setApprovalRule).
///   3. FeeRouter v2 (recipients senior / v2 / treasury, keeper = AGENT). The setup order setRouter -> setFloor -> seedPrice
///      runs only when SWEEP_TOKEN is given (no sweep token or oracle exists yet).
///   4. SeniorReceiveGate(senior, v2, owner = SENIOR_SAFE). Not wired here.
/// Big blocks: JuniorVault is ~24 kB (above the 2M small-block gas); the signer turns big blocks on before and off after.
///
/// Env: SENIOR, OLD_JUNIOR, OLD_SETTLE_DUE, DEPLOYER (= JUNIOR_OWNER), AGENT, TREASURY, JUNIOR_CAP (default 5_000e6, the live cap), WALLET_CAP (default 10_000e6),
///      optional SWEEP_TOKEN, SWEEP_ROUTER, SWEEP_ORACLE, SWEEP_SLIPPAGE_BPS, SWEEP_SEED_PRICE (1e36 scale).
/// The deployer must hold at least 1 USDC (the seed) and gas.
contract DeployJuniorV2 is Script, Addresses {
    // set by run(), for a test that drives this script in-process
    JuniorVault public junior;
    FeeRouter public router;
    SeniorReceiveGate public gate;

    function run() external {
        IVaultV2 senior = IVaultV2(vm.envAddress("SENIOR"));
        address deployer = vm.envAddress("DEPLOYER");
        require(deployer == JUNIOR_OWNER, "phase A must be broadcast by the junior owner");
        address agent = vm.envAddress("AGENT");
        address treasury = vm.envAddress("TREASURY");
        uint256 juniorCap = vm.envOr("JUNIOR_CAP", uint256(5_000e6));
        uint256 walletCap = vm.envOr("WALLET_CAP", uint256(10_000e6));
        require(IOldJuniorA(vm.envAddress("OLD_JUNIOR")).lastSettle() >= vm.envUint("OLD_SETTLE_DUE"), "the old junior has not settled yet (S1): deploy v2 after it");
        require(IERC20(USDC).balanceOf(deployer) >= 1e6, "deployer holds under 1 USDC: the seed needs it");
        require(senior.curator() == SENIOR_SAFE && senior.owner() == SENIOR_SAFE, "senior is not handed to the Safe: run 01-03 first");

        vm.startBroadcast(deployer);
        junior = new JuniorVault(IERC20(USDC), senior, IMorpho(MORPHO), deployer, juniorCap);
        IERC20(USDC).approve(address(junior), junior.SEED_ASSETS());
        junior.seed();
        junior.setDepositsPaused(true); // opened in phase D, after the checklist
        junior.setWalletCap(walletCap);
        junior.setAgent(agent);
        junior.addVault(FELIX_USDC_V1);
        junior.addVault(address(senior)); // management-fee shares arrive here
        bytes4 dep = bytes4(keccak256("deposit(uint256,address)"));
        bytes4 red = bytes4(keccak256("redeem(uint256,address,address)"));
        bytes4 wd = bytes4(keccak256("withdraw(uint256,address,address)"));
        junior.setRule(FELIX_USDC_V1, dep, true, 32);
        junior.setRule(FELIX_USDC_V1, red, true, 32);
        junior.setRule(FELIX_USDC_V1, wd, true, 32);
        junior.setRule(address(senior), red, true, 32);
        junior.setRule(address(senior), wd, true, 32);
        junior.setApprovalRule(USDC, FELIX_USDC_V1, true);

        router = new FeeRouter(IERC20(USDC), deployer, address(senior), address(junior), treasury);
        router.setKeeper(agent);
        address sweepToken = vm.envOr("SWEEP_TOKEN", address(0));
        if (sweepToken != address(0)) {
            router.setRouter(vm.envAddress("SWEEP_ROUTER"), true);
            router.setFloor(sweepToken, IOracle(vm.envAddress("SWEEP_ORACLE")), uint16(vm.envUint("SWEEP_SLIPPAGE_BPS")));
            router.seedPrice(sweepToken, vm.envUint("SWEEP_SEED_PRICE"));
        }

        gate = new SeniorReceiveGate(senior, IJuniorGateView(address(junior)), SENIOR_SAFE);
        vm.stopBroadcast();

        console2.log("JUNIOR_V2 ", address(junior));
        console2.log("ROUTER_V2 ", address(router));
        console2.log("GATE      ", address(gate));

        require(junior.seeded() && junior.depositsPaused() && junior.walletCap() == walletCap, "junior state");
        require(junior.depositCap() == juniorCap, "junior cap");
        require(junior.agent() == agent && junior.owner() == JUNIOR_OWNER && router.owner() == JUNIOR_OWNER, "roles");
        require(junior.marketsLength() == 0 && junior.vaultsLength() == 2, "junior universe");
        require(address(junior.senior()) == address(senior), "junior senior");
        (address felixV,,,) = junior.felixExp(0); // reverts if the constructor's Felix snapshot is empty
        require(felixV == FELIX_USDC_V1, "felix exposure snapshot");
        require(router.senior() == address(senior) && router.junior() == address(junior) && router.treasury() == treasury, "router recipients");
        require(router.keeper() == agent, "router keeper");
        require(address(gate.junior()) == address(junior) && address(gate.senior()) == address(senior), "gate pair");
        require(gate.owner() == SENIOR_SAFE && gate.maxUnrecognised() == 10e6, "gate owner");
        require(gate.canReceiveShares(address(junior)), "gate refuses junior");
        require(senior.receiveSharesGate() == address(0), "phase A must not wire the gate");
        require(senior.managementFeeRecipient() != address(junior), "phase A must not flip the recipient");
        console2.log("verify: ok");
    }
}

interface IOldJuniorA {
    function lastSettle() external view returns (uint256);
}
