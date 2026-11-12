// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IVaultV2} from "vault-v2/interfaces/IVaultV2.sol";
import {IMorphoBase} from "morpho-blue/interfaces/IMorpho.sol";
import {Addresses} from "./Addresses.sol";

interface IJuniorOps {
    function owner() external view returns (address);
    function setDepositsPaused(bool) external;
    function depositsPaused() external view returns (bool);
    function setRule(address target, bytes4 selector, bool allowed, uint256 receiverOffset) external;
    function rules(address target, bytes4 selector) external view returns (bool allowed, uint256 receiverOffset);
    function marketsLength() external view returns (uint256);
    function marketAssets(uint256 i) external view returns (uint256);
    function snapFelixExposure() external;
    function felixExp(uint256 i) external view returns (address vault, uint96 lostBase, uint128 fraction, uint128 assetsRef);
}

interface IRouterOps {
    function owner() external view returns (address);
    function setRecipients(address senior, address junior, address treasury) external;
    function senior() external view returns (address);
    function junior() external view returns (address);
    function treasury() external view returns (address);
}

interface IGateView {
    function canReceiveShares(address) external view returns (bool);
}

/// Migration phase D (audit fixes 7/8), the cut-over. Signer: JUNIOR_OWNER. Runs only after phase C, and only passes when the
/// checklist holds (each item is a `require` here and a `precheck` in the plan JSON):
///   - senior's fee recipient is v2 and its receive-shares gate is the new gate, a fresh account can receive shares;
///   - the old junior has no Morpho market position (RUNBOOK 8a).
/// Then: old router -> recipients (senior, v2, treasury); old junior deposits paused; the two Morpho rules removed on the OLD
/// junior (supply 0xa99aad89, withdraw 0x5c2bea49); v2 Felix exposure snapshot; v2 deposits opened (last).
/// Rollback: old `setDepositsPaused(false)`, v2 `setDepositsPaused(true)`, old router `setRecipients(senior, oldJunior, treasury)`,
/// old `setRule(..., true, 224/256)`. Undoing the fee recipient is a new 3-day timelock (phase B/C reversed).
///
/// Env: DEPLOYER (= JUNIOR_OWNER), SENIOR, JUNIOR (v2), GATE, OLD_JUNIOR, OLD_ROUTER, TREASURY.
contract CutOver is Script, Addresses {
    function run() external {
        IVaultV2 senior = IVaultV2(vm.envAddress("SENIOR"));
        IJuniorOps v2 = IJuniorOps(vm.envAddress("JUNIOR"));
        IJuniorOps old = IJuniorOps(vm.envAddress("OLD_JUNIOR"));
        IRouterOps oldRouter = IRouterOps(vm.envAddress("OLD_ROUTER"));
        address gate = vm.envAddress("GATE");
        address treasury = vm.envAddress("TREASURY");
        address signer = vm.envAddress("DEPLOYER");
        require(signer == JUNIOR_OWNER, "phase D must be signed by the junior owner");

        // checklist
        require(senior.managementFeeRecipient() == address(v2), "checklist: senior fee recipient is not v2 (phase C)");
        require(senior.receiveSharesGate() == gate && IGateView(gate).canReceiveShares(address(0xBEEF)), "checklist: gate not wired or refusing");
        uint256 n = old.marketsLength();
        for (uint256 i = 0; i < n; i++) {
            require(old.marketAssets(i) == 0, "checklist: the old junior holds a Morpho market position, keep its rules (RUNBOOK 8a)");
        }
        require(old.owner() == signer && v2.owner() == signer && oldRouter.owner() == signer, "checklist: owner");

        bytes4 supply = IMorphoBase.supply.selector;
        bytes4 withdraw = IMorphoBase.withdraw.selector;
        vm.startBroadcast(signer);
        oldRouter.setRecipients(address(senior), address(v2), treasury);
        old.setDepositsPaused(true);
        old.setRule(MORPHO, supply, false, 224);
        old.setRule(MORPHO, withdraw, false, 256);
        v2.snapFelixExposure();
        v2.setDepositsPaused(false);
        vm.stopBroadcast();

        require(oldRouter.senior() == address(senior) && oldRouter.junior() == address(v2) && oldRouter.treasury() == treasury, "old router recipients");
        require(old.depositsPaused() && !v2.depositsPaused(), "deposit switches");
        (bool a,) = old.rules(MORPHO, supply);
        (bool b,) = old.rules(MORPHO, withdraw);
        require(!a && !b, "morpho rules still allowed on the old junior");
        (address fv,,,) = v2.felixExp(0);
        require(fv == FELIX_USDC_V1, "v2 felix exposure");
        console2.log("verify: ok");
    }
}
