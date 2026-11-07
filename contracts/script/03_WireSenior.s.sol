// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IVaultV2} from "vault-v2/interfaces/IVaultV2.sol";
import {Addresses} from "./Addresses.sol";

/// Step 3 of 3. Points senior's management fee at junior, sets maxRate, sets Felix as the liquidity adapter,
/// then raises the timelock on everything that changes risk. After this, cap and adapter changes wait 3 days.
///
/// Env: SENIOR, JUNIOR, FELIX_ADAPTER, OWNER_FINAL (optional: Safe to hand owner and curator to at the end).
contract WireSenior is Script, Addresses {
    function run() external {
        IVaultV2 senior = IVaultV2(vm.envAddress("SENIOR"));
        address junior = vm.envAddress("JUNIOR");
        address felixAdapter = vm.envAddress("FELIX_ADAPTER");
        address ownerFinal = vm.envOr("OWNER_FINAL", address(0));

        vm.startBroadcast();
        _exec(senior, abi.encodeCall(IVaultV2.setManagementFeeRecipient, (junior)));
        _exec(senior, abi.encodeCall(IVaultV2.setManagementFee, (MGMT_FEE_PER_SEC)));
        _exec(senior, abi.encodeCall(IVaultV2.setMaxRate, (MAX_RATE_PER_SEC)));
        senior.setLiquidityAdapterAndData(felixAdapter, "");

        // Timelocks last: everything that can add risk waits 3 days from now on.
        _exec(senior, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.addAdapter.selector, TIMELOCK)));
        _exec(senior, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.increaseAbsoluteCap.selector, TIMELOCK)));
        _exec(senior, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.increaseRelativeCap.selector, TIMELOCK)));
        _exec(senior, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.setPerformanceFee.selector, TIMELOCK)));
        _exec(senior, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.setManagementFee.selector, TIMELOCK)));
        _exec(senior, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.setPerformanceFeeRecipient.selector, TIMELOCK)));
        _exec(senior, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.setManagementFeeRecipient.selector, TIMELOCK)));
        _exec(senior, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.setIsAllocator.selector, TIMELOCK)));
        _exec(senior, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.setReceiveSharesGate.selector, TIMELOCK)));
        _exec(senior, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.setSendSharesGate.selector, TIMELOCK)));
        _exec(senior, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.setReceiveAssetsGate.selector, TIMELOCK)));
        _exec(senior, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.setSendAssetsGate.selector, TIMELOCK)));
        _exec(senior, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.setAdapterRegistry.selector, TIMELOCK)));

        if (ownerFinal != address(0)) {
            senior.setCurator(ownerFinal);
            senior.setOwner(ownerFinal);
        }
        vm.stopBroadcast();

        require(senior.managementFeeRecipient() == junior, "fee recipient");
        require(senior.managementFee() == MGMT_FEE_PER_SEC, "fee");
        require(senior.maxRate() == MAX_RATE_PER_SEC, "maxRate");
        require(senior.liquidityAdapter() == felixAdapter, "liquidity adapter");
        require(senior.timelock(IVaultV2.addAdapter.selector) == TIMELOCK, "timelock");
        console2.log("verify: ok");
    }

    function _exec(IVaultV2 v, bytes memory data) internal {
        v.submit(data);
        (bool ok, bytes memory ret) = address(v).call(data);
        require(ok, string(ret));
    }
}
