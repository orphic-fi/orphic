// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IVaultV2} from "vault-v2/interfaces/IVaultV2.sol";
import {Addresses} from "./Addresses.sol";

interface IOldJunior {
    function lastSettle() external view returns (uint256);
}

/// Migration phase C (audit fixes 7/8). Executes the two submitted senior changes: the management-fee recipient becomes the v2
/// junior (V2 accrues first, so every fee second up to now goes to the old junior), then the receive-shares gate is wired.
/// Anyone may execute (Vault V2's `timelocked()` has no caller check); the plan lists SENIOR_SAFE.
///
/// REFUSES to run before the old junior's settle: `OLD_SETTLE_DUE` is the second that settle is due (old lastSettle at
/// migration + 6 d 23 h = 1794774420, Sun 15 Nov 20:27:00 UTC) and the old junior's `lastSettle` must be at or past it.
/// Rollback after this phase is another submit + 3-day wait (setManagementFeeRecipient back to the old junior).
///
/// Env: DEPLOYER (the sender), SENIOR, JUNIOR (v2), GATE, OLD_JUNIOR, OLD_SETTLE_DUE.
contract ExecuteSenior is Script, Addresses {
    function run() external {
        IVaultV2 senior = IVaultV2(vm.envAddress("SENIOR"));
        address junior = vm.envAddress("JUNIOR");
        address gate = vm.envAddress("GATE");
        address signer = vm.envAddress("DEPLOYER");
        uint256 due = vm.envUint("OLD_SETTLE_DUE");
        require(IOldJunior(vm.envAddress("OLD_JUNIOR")).lastSettle() >= due, "the old junior has not settled yet: do not flip the fee recipient");

        vm.startBroadcast(signer);
        senior.setManagementFeeRecipient(junior);
        senior.setReceiveSharesGate(gate);
        vm.stopBroadcast();

        require(senior.managementFeeRecipient() == junior, "fee recipient");
        require(senior.receiveSharesGate() == gate, "gate");
        require(senior.canReceiveShares(address(0xBEEF)), "gate refuses a fresh account in normal times");
        require(senior.canReceiveShares(junior), "gate refuses the v2 junior");
        console2.log("verify: ok");
    }
}
