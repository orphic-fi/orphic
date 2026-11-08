// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IVaultV2} from "vault-v2/interfaces/IVaultV2.sol";
import {IVaultV2Factory} from "vault-v2/interfaces/IVaultV2Factory.sol";
import {IMorphoMarketV1AdapterV2Factory} from "vault-v2/adapters/interfaces/IMorphoMarketV1AdapterV2Factory.sol";
import {IMorphoVaultV1AdapterFactory} from "vault-v2/adapters/interfaces/IMorphoVaultV1AdapterFactory.sol";
import {IMorpho, MarketParams, Id} from "morpho-blue/interfaces/IMorpho.sol";
import {Addresses} from "./Addresses.sol";

/// Step 1 of 3. Creates the senior Vault V2 and its two adapters, sets allocators and caps.
/// Fees, liquidity adapter, maxRate and timelock are step 3 (they need the junior address).
/// Timelocks are all 0 on a fresh vault, so submit + execute happen in the same transaction batch.
///
/// Env: DEPLOYER (address that broadcasts; owner and curator at first), AGENT (Rotator key, allocator),
///      CAP_TOTAL (USDC, 6 dec, default 425_000e6), SALT (bytes32, default "orphic-senior-1").
/// Requires the deployer to be on HyperEVM big blocks (vault creation is above the small-block gas limit).
contract DeploySenior is Script, Addresses {
    function run() external {
        address deployer = vm.envAddress("DEPLOYER");
        address agent = vm.envAddress("AGENT");
        uint256 capTotal = vm.envOr("CAP_TOTAL", uint256(425_000e6));
        bytes32 salt = vm.envOr("SALT", bytes32("orphic-senior-1"));

        IMorpho morpho = IMorpho(MORPHO);
        MarketParams memory khype625 = morpho.idToMarketParams(MKT_KHYPE_625);
        MarketParams memory khype77 = morpho.idToMarketParams(MKT_KHYPE_77);
        MarketParams memory whype77 = morpho.idToMarketParams(MKT_WHYPE_77);
        MarketParams memory ubtc77 = morpho.idToMarketParams(MKT_UBTC_77);

        vm.startBroadcast(deployer);
        IVaultV2 senior = IVaultV2(IVaultV2Factory(V2_FACTORY).createVaultV2(deployer, USDC, salt));
        senior.setCurator(deployer);
        senior.setName("Orphic Senior USDC");
        senior.setSymbol("osUSDC");

        address marketAdapter = IMorphoMarketV1AdapterV2Factory(MARKET_ADAPTER_FACTORY)
            .createMorphoMarketV1AdapterV2(address(senior));
        address felixAdapter =
            IMorphoVaultV1AdapterFactory(VAULT_ADAPTER_FACTORY).createMorphoVaultV1Adapter(address(senior), FELIX_USDC_V1);

        _exec(senior, abi.encodeCall(IVaultV2.setIsAllocator, (deployer, true)));
        _exec(senior, abi.encodeCall(IVaultV2.setIsAllocator, (agent, true)));
        _exec(senior, abi.encodeCall(IVaultV2.addAdapter, (marketAdapter)));
        _exec(senior, abi.encodeCall(IVaultV2.addAdapter, (felixAdapter)));

        // Caps are ceilings above the Rotator's targets (targets: kHYPE/62.5 48%, kHYPE/77 10%, WHYPE/77 20%,
        // UBTC/77 5%, Felix 15%, idle 2%, confirmed by Cashout 7 Nov 18:17). Relative caps are 100%
        // everywhere at launch: with a vault this small a relative cap would block the first deposits. Felix is the
        // liquidity adapter and must be able to absorb any deposit, so it carries the full cap.
        _cap(senior, abi.encode("this", marketAdapter), capTotal);
        _cap(senior, abi.encode("this", felixAdapter), capTotal);
        _cap(senior, abi.encode("collateralToken", khype625.collateralToken), capTotal * 80 / 100);
        _cap(senior, abi.encode("collateralToken", whype77.collateralToken), capTotal * 30 / 100);
        _cap(senior, abi.encode("collateralToken", ubtc77.collateralToken), capTotal * 10 / 100);
        _cap(senior, abi.encode("this/marketParams", marketAdapter, khype625), capTotal * 60 / 100);
        _cap(senior, abi.encode("this/marketParams", marketAdapter, khype77), capTotal * 20 / 100);
        _cap(senior, abi.encode("this/marketParams", marketAdapter, whype77), capTotal * 30 / 100);
        _cap(senior, abi.encode("this/marketParams", marketAdapter, ubtc77), capTotal * 10 / 100);
        vm.stopBroadcast();

        console2.log("SENIOR          ", address(senior));
        console2.log("MARKET_ADAPTER  ", marketAdapter);
        console2.log("FELIX_ADAPTER   ", felixAdapter);
        _verify(senior, marketAdapter, felixAdapter, deployer, agent);
    }

    function _exec(IVaultV2 v, bytes memory data) internal {
        v.submit(data);
        (bool ok, bytes memory ret) = address(v).call(data);
        require(ok, string(ret));
    }

    function _cap(IVaultV2 v, bytes memory idData, uint256 absCap) internal {
        _exec(v, abi.encodeCall(IVaultV2.increaseAbsoluteCap, (idData, absCap)));
        _exec(v, abi.encodeCall(IVaultV2.increaseRelativeCap, (idData, 1e18)));
    }

    /// Read back on-chain state. Nothing is "live" until this passes.
    function _verify(IVaultV2 v, address ma, address fa, address deployer, address agent) internal view {
        require(IVaultV2Factory(V2_FACTORY).isVaultV2(address(v)), "not a V2 vault");
        require(v.owner() == deployer && v.curator() == deployer, "owner/curator");
        require(v.asset() == USDC, "asset");
        require(v.isAdapter(ma) && v.isAdapter(fa), "adapters");
        require(v.isAllocator(deployer) && v.isAllocator(agent), "allocators");
        require(v.absoluteCap(keccak256(abi.encode("this", fa))) > 0, "felix cap");
        require(v.relativeCap(keccak256(abi.encode("this", fa))) == 1e18, "felix relative cap");
        console2.log("verify: ok");
    }
}
