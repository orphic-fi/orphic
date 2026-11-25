// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVaultV2} from "vault-v2/interfaces/IVaultV2.sol";
import {IMorpho} from "morpho-blue/interfaces/IMorpho.sol";
import {JuniorVault} from "../src/JuniorVault.sol";
import {SeniorShareGate} from "../src/SeniorShareGate.sol";
import {Addresses} from "./Addresses.sol";

/// Junior v1.2: v1.1 plus HyperLend as a lender venue. v1.1 never opened (deposits paused, 1 USDC seed), so v1.2
/// replaces it before it takes a deposit. Same wiring as 06 plus addLender(HyperLend pool, aUSDC) with supply and
/// withdraw rules (junior as receiver) and the USDC approval to the pool. Also points the FeeRouter at the new junior.
///
/// Broadcast by a throwaway deployer that holds gas and 1 USDC for the seed. Nothing of value stays with it: the
/// owner is JUNIOR_OWNER after acceptOwnership, the agent is AGENT, and the router is unchanged.
///
/// Env: SENIOR, DEPLOYER (throwaway), AGENT, JUNIOR_CAP (default 5_000e6), WALLET_CAP (default 5_000e6).
/// Senior side, by the curator, timelocked 3 days each: setManagementFeeRecipient(new junior) and
/// setReceiveSharesGate(gate). Printed at the end.
interface IFeeRouterRecipients {
    function setRecipients(address senior_, address junior_, address treasury_) external;
    function treasury() external view returns (address);
}

contract DeployJuniorV12 is Script, Addresses {
    address constant HYPERLEND_POOL = 0x00A89d7a5A02160f20150EbEA7a2b5E4879A1A8b;
    address constant HYPERLEND_AUSDC = 0x744E4f26ee30213989216E1632D9BE3547C4885b;
    address constant FEE_ROUTER = 0xC2d2C5e56798Bfd0EEc67EEC12ddC2b521b1aA37;

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

        // HyperLend: supply(asset, amount, onBehalfOf, referral) and withdraw(asset, amount, to); receiver is word 2
        junior.addLender(HYPERLEND_POOL, HYPERLEND_AUSDC);
        junior.setRule(HYPERLEND_POOL, bytes4(keccak256("supply(address,uint256,address,uint16)")), true, 64);
        junior.setRule(HYPERLEND_POOL, bytes4(keccak256("withdraw(address,uint256,address)")), true, 64);
        junior.setApprovalRule(USDC, HYPERLEND_POOL, true);

        // fee router: junior's 25% of protocol fees go to the new junior
        if (deployer == JUNIOR_OWNER) IFeeRouterRecipients(FEE_ROUTER).setRecipients(address(senior), address(junior), IFeeRouterRecipients(FEE_ROUTER).treasury());

        if (deployer != JUNIOR_OWNER) junior.transferOwnership(JUNIOR_OWNER); // two-step: the hardware wallet accepts
        vm.stopBroadcast();

        console2.log("JUNIOR v1.2", address(junior));
        console2.log("GATE       ", address(gate));

        require(junior.seeded() && junior.depositsPaused() && junior.walletCap() == walletCap, "junior state");
        require(junior.agent() == agent && (junior.owner() == JUNIOR_OWNER || junior.pendingOwner() == JUNIOR_OWNER), "roles");
        require(junior.marketsLength() == 4 && junior.vaultsLength() == 2 && junior.lendersLength() == 1, "junior universe");
        require(junior.lenderAToken(HYPERLEND_POOL) == HYPERLEND_AUSDC, "lender bound");
        (bool supplyAllowed,) = junior.rules(MORPHO, bytes4(0xa99aad89));
        require(!supplyAllowed, "no Morpho market rules");
        require(gate.junior() == address(junior) && gate.canReceiveShares(address(0xBEEF)), "gate open while no loss");
        console2.log("verify: ok");
        if (deployer != JUNIOR_OWNER) console2.log("owner next: junior.acceptOwnership() from", JUNIOR_OWNER);
        console2.log("curator next (submit, then call after 3 days): setManagementFeeRecipient(junior), setReceiveSharesGate(gate)");
    }
}
