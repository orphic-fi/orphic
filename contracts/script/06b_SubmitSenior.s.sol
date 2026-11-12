// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IVaultV2} from "vault-v2/interfaces/IVaultV2.sol";
import {Addresses} from "./Addresses.sol";

/// Migration phase B (audit fixes 7/8). Signer: SENIOR_SAFE (the senior curator). Submits the two timelocked senior
/// changes; they become executable 3 days later (phase C). Submit on or after Fri 13 Nov 00:00 UTC so the earliest execution
/// is after the old junior's first settle (Sun 15 Nov 20:27 UTC). Rollback before phase C: `senior.revoke(data)` for each.
///
/// Env: DEPLOYER (= SENIOR_SAFE), SENIOR, JUNIOR (v2), GATE.
contract SubmitSenior is Script, Addresses {
    function run() external {
        IVaultV2 senior = IVaultV2(vm.envAddress("SENIOR"));
        address junior = vm.envAddress("JUNIOR");
        address gate = vm.envAddress("GATE");
        address signer = vm.envAddress("DEPLOYER");
        require(signer == SENIOR_SAFE && senior.curator() == signer, "phase B must be signed by the senior curator");
        require(junior.code.length > 0 && gate.code.length > 0, "v2 junior or gate not deployed: run phase A first");

        bytes memory recipient = abi.encodeCall(IVaultV2.setManagementFeeRecipient, (junior));
        bytes memory gateSet = abi.encodeCall(IVaultV2.setReceiveSharesGate, (gate));
        vm.startBroadcast(signer);
        senior.submit(recipient);
        senior.submit(gateSet);
        vm.stopBroadcast();

        uint256 eta = block.timestamp + senior.timelock(IVaultV2.setManagementFeeRecipient.selector);
        require(senior.executableAt(recipient) == eta, "recipient eta");
        require(senior.executableAt(gateSet) == block.timestamp + senior.timelock(IVaultV2.setReceiveSharesGate.selector), "gate eta");
        require(senior.managementFeeRecipient() != junior && senior.receiveSharesGate() == address(0), "nothing may be wired in phase B");
        console2.log("executable at", eta);
        console2.log("verify: ok");
    }
}
