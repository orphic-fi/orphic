// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVaultV2} from "vault-v2/interfaces/IVaultV2.sol";
import {IMorpho} from "morpho-blue/interfaces/IMorpho.sol";
import {JuniorVault} from "../src/JuniorVault.sol";
import {SeniorShareGate} from "../src/SeniorShareGate.sol";
import {Addresses} from "./Addresses.sol";

/// Junior v1.1 after the 11 Nov 2026 security review. Deploys the new JuniorVault and its SeniorShareGate against
/// the live senior, seeds junior, wires the venue list and the agent allowlist (no direct Morpho market rules:
/// review M-2, M-3), pauses deposits, and hands ownership to the hardware wallet, which accepts in one transaction.
///
/// Broadcast by a throwaway deployer that holds gas and 1 USDC for the seed. Nothing of value stays with it: the
/// owner is JUNIOR_OWNER after acceptOwnership, the agent is AGENT, and the router is unchanged.
///
/// Env: SENIOR, DEPLOYER (throwaway), AGENT, JUNIOR_CAP (default 5_000e6), WALLET_CAP (default 5_000e6).
/// Senior side, by the curator, timelocked 3 days each: setManagementFeeRecipient(new junior) and
/// setReceiveSharesGate(gate). Printed at the end.
contract DeployJuniorV11 is Script, Addresses {
    function run() external {
        IVaultV2 senior = IVaultV2(vm.envAddress("SENIOR"));
        address deployer = vm.envAddress("DEPLOYER");
        address agent = vm.envAddress("AGENT");
        uint256 juniorCap = vm.envOr("JUNIOR_CAP", uint256(5_000e6));
        uint256 walletCap = vm.envOr("WALLET_CAP", uint256(5_000e6));
        IMorpho morpho = IMorpho(MORPHO);

        vm.startBroadcast(deployer);
        JuniorVault junior = new JuniorVault(IERC20(USDC), senior, morpho, deployer, juniorCap);
        SeniorShareGate gate = new SeniorShareGate(address(junior));
        IERC20(USDC).approve(address(junior), junior.SEED_ASSETS());
        junior.seed();
        junior.setDepositsPaused(true); // opened by the owner once the senior switch has landed
        junior.setWalletCap(walletCap);
        junior.setAgent(agent);

        // valuation universe = agent venues (markets are valued, never allocated to, until rules say otherwise)
        junior.addMarket(morpho.idToMarketParams(MKT_KHYPE_625));
        junior.addMarket(morpho.idToMarketParams(MKT_KHYPE_77));
        junior.addMarket(morpho.idToMarketParams(MKT_WHYPE_77));
        junior.addMarket(morpho.idToMarketParams(MKT_UBTC_77));
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

        if (deployer != JUNIOR_OWNER) junior.transferOwnership(JUNIOR_OWNER); // two-step: the hardware wallet accepts
        vm.stopBroadcast();

        console2.log("JUNIOR v1.1", address(junior));
        console2.log("GATE       ", address(gate));

        require(junior.seeded() && junior.depositsPaused() && junior.walletCap() == walletCap, "junior state");
        require(junior.agent() == agent && (junior.owner() == JUNIOR_OWNER || junior.pendingOwner() == JUNIOR_OWNER), "roles");
        require(junior.marketsLength() == 4 && junior.vaultsLength() == 2, "junior universe");
        (bool supplyAllowed,) = junior.rules(MORPHO, bytes4(0xa99aad89));
        require(!supplyAllowed, "no Morpho market rules");
        require(gate.junior() == address(junior) && gate.canReceiveShares(address(0xBEEF)), "gate open while no loss");
        console2.log("verify: ok");
        if (deployer != JUNIOR_OWNER) console2.log("owner next: junior.acceptOwnership() from", JUNIOR_OWNER);
        console2.log("curator next (submit, then call after 3 days): setManagementFeeRecipient(junior), setReceiveSharesGate(gate)");
    }
}
