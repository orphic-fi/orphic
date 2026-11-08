// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IVaultV2} from "vault-v2/interfaces/IVaultV2.sol";
import {Addresses} from "./Addresses.sol";

/// Step 3 of 3. Points senior's management fee at junior, sets maxRate, sets Felix as the liquidity adapter,
/// then raises the timelock on everything that changes risk. After this, cap and adapter changes wait 3 days.
///
/// Env: DEPLOYER, SENIOR, JUNIOR, FELIX_ADAPTER. Ends by handing senior owner and curator to SENIOR_SAFE (EOA or Safe).
contract WireSenior is Script, Addresses {
    function run() external {
        IVaultV2 senior = IVaultV2(vm.envAddress("SENIOR"));
        address junior = vm.envAddress("JUNIOR");
        address felixAdapter = vm.envAddress("FELIX_ADAPTER");
        address deployer = vm.envAddress("DEPLOYER");
        // SENIOR_SAFE may be an EOA at launch (MetaMask account); the 3-day timelock is what protects senior. Move it to a
        // Safe later with setCurator and setOwner from that account.
        require(SENIOR_SAFE != address(0) && SENIOR_SAFE != deployer, "senior admin must be a distinct account");

        vm.startBroadcast(deployer);
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
        // setIsAllocator stays at timelock 0 on purpose: the Safe must be able to revoke a leaked Rotator key at once.
        // An allocator can allocate within caps, setMaxRate (0 to 200%) and repoint the liquidity adapter, nothing else.
        _exec(senior, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.setReceiveSharesGate.selector, TIMELOCK)));
        _exec(senior, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.setSendSharesGate.selector, TIMELOCK)));
        _exec(senior, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.setReceiveAssetsGate.selector, TIMELOCK)));
        _exec(senior, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.setSendAssetsGate.selector, TIMELOCK)));
        _exec(senior, abi.encodeCall(IVaultV2.increaseTimelock, (IVaultV2.setAdapterRegistry.selector, TIMELOCK)));

        // Hand senior to the Safe: curator (caps, adapters, fees behind the timelock) and owner (can change curator).
        senior.setCurator(SENIOR_SAFE);
        senior.setOwner(SENIOR_SAFE);
        vm.stopBroadcast();

        require(senior.managementFeeRecipient() == junior, "fee recipient");
        require(senior.managementFee() == MGMT_FEE_PER_SEC, "fee");
        require(senior.maxRate() == MAX_RATE_PER_SEC, "maxRate");
        require(senior.liquidityAdapter() == felixAdapter, "liquidity adapter");
        require(senior.timelock(IVaultV2.addAdapter.selector) == TIMELOCK, "timelock");
        require(senior.timelock(IVaultV2.setIsAllocator.selector) == 0, "allocator revoke must be instant");
        require(senior.owner() == SENIOR_SAFE && senior.curator() == SENIOR_SAFE, "senior handed to Safe");
        console2.log("verify: ok");
    }

    function _exec(IVaultV2 v, bytes memory data) internal {
        v.submit(data);
        (bool ok, bytes memory ret) = address(v).call(data);
        require(ok, string(ret));
    }
}
