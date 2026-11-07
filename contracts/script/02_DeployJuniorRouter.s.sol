// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVaultV2} from "vault-v2/interfaces/IVaultV2.sol";
import {IMorpho, IMorphoBase, MarketParams} from "morpho-blue/interfaces/IMorpho.sol";
import {JuniorVault} from "../src/JuniorVault.sol";
import {FeeRouter} from "../src/FeeRouter.sol";
import {Addresses} from "./Addresses.sol";

/// Step 2 of 3. Deploys JuniorVault and FeeRouter against the senior from step 1, seeds junior with 1 USDC,
/// wires the agent allowlist. Deposits stay paused until step 3 has run and the Monday checklist is green.
///
/// Env: SENIOR, DEPLOYER, AGENT, TREASURY, JUNIOR_CAP (default 75_000e6).
/// The deployer must hold at least 1 USDC for the seed.
contract DeployJuniorRouter is Script, Addresses {
    function run() external {
        IVaultV2 senior = IVaultV2(vm.envAddress("SENIOR"));
        address deployer = vm.envAddress("DEPLOYER");
        address agent = vm.envAddress("AGENT");
        address treasury = vm.envAddress("TREASURY");
        uint256 juniorCap = vm.envOr("JUNIOR_CAP", uint256(75_000e6));
        IMorpho morpho = IMorpho(MORPHO);

        vm.startBroadcast();
        JuniorVault junior = new JuniorVault(IERC20(USDC), senior, morpho, deployer, juniorCap);
        IERC20(USDC).approve(address(junior), junior.SEED_ASSETS());
        junior.seed();
        junior.setDepositsPaused(true); // opened on Monday by hand, after the checklist
        junior.setWalletCap(vm.envOr("WALLET_CAP", uint256(10_000e6))); // week one only
        junior.setAgent(agent);

        // valuation universe = agent venues
        junior.addMarket(morpho.idToMarketParams(MKT_KHYPE_625));
        junior.addMarket(morpho.idToMarketParams(MKT_KHYPE_77));
        junior.addMarket(morpho.idToMarketParams(MKT_WHYPE_77));
        junior.addMarket(morpho.idToMarketParams(MKT_UBTC_77));
        junior.addVault(FELIX_USDC_V1);
        junior.addVault(address(senior)); // management-fee shares arrive here

        // agent rules: receiver word offsets are into the ABI-encoded arguments (after the selector)
        junior.setRule(MORPHO, IMorphoBase.supply.selector, true, 224); // onBehalf
        junior.setRule(MORPHO, IMorphoBase.withdraw.selector, true, 256); // receiver
        bytes4 dep = bytes4(keccak256("deposit(uint256,address)"));
        bytes4 red = bytes4(keccak256("redeem(uint256,address,address)"));
        bytes4 wd = bytes4(keccak256("withdraw(uint256,address,address)"));
        junior.setRule(FELIX_USDC_V1, dep, true, 32);
        junior.setRule(FELIX_USDC_V1, red, true, 32);
        junior.setRule(FELIX_USDC_V1, wd, true, 32);
        junior.setRule(address(senior), red, true, 32);
        junior.setRule(address(senior), wd, true, 32);
        junior.setApprovalRule(USDC, MORPHO, true);
        junior.setApprovalRule(USDC, FELIX_USDC_V1, true);

        FeeRouter router = new FeeRouter(IERC20(USDC), deployer, address(senior), address(junior), treasury);
        router.setKeeper(agent);
        vm.stopBroadcast();

        console2.log("JUNIOR ", address(junior));
        console2.log("ROUTER ", address(router));

        require(junior.seeded() && junior.depositsPaused() && junior.walletCap() == vm.envOr("WALLET_CAP", uint256(10_000e6)), "junior state");
        require(junior.agent() == agent && junior.owner() == deployer, "junior roles");
        require(junior.marketsLength() == 4 && junior.vaultsLength() == 2, "junior universe");
        require(address(junior.senior()) == address(senior), "junior senior");
        require(router.senior() == address(senior) && router.junior() == address(junior), "router recipients");
        console2.log("verify: ok");
    }
}
