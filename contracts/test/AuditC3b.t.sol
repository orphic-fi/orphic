// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Base, IERC20, IVaultV2} from "./Base.t.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {SeniorShareGate} from "../src/SeniorShareGate.sol";

/// @notice Audit C3b (exit then buy between two observations of senior's supply) against the live design: junior
///         v1.1/v1.2 with SeniorShareGate. Retargeted from the fix-branch's own seniorSupplyMin test: here the gate
///         is what closes it, so the scenario must end with junior paying no more than the loss.
contract AuditC3bTest is Base {
    address carol = makeAddr("carol");

    function setUp() public override {
        super.setUp();
        vm.warp(block.timestamp + 30 days);
    }

    function _seniorLoss(uint256 usdc) internal {
        uint256 shares = IERC4626(FELIX_USDC_V1).balanceOf(felixAdapter);
        deal(FELIX_USDC_V1, felixAdapter, shares - IERC4626(FELIX_USDC_V1).convertToShares(usdc), true);
    }

    function test_c3b_exitThenBuyIsRefusedAndCoverStaysAtTheLoss() public {
        SeniorShareGate gate = new SeniorShareGate(address(junior));
        vm.startPrank(owner);
        _curate(abi.encodeCall(IVaultV2.setReceiveSharesGate, (address(gate))));
        vm.stopPrank();
        _seniorDeposit(alice, 100_000e6);
        _juniorDeposit(bob, 20_000e6);
        junior.syncSenior();
        _seniorLoss(2_000e6);
        assertGt(junior.coverPending(), 0, "loss is open");

        // half of senior exits at the depressed price, then the same money (and a stranger's) tries to come back in
        vm.startPrank(alice);
        senior.redeem(senior.balanceOf(alice) / 2, alice, alice);
        USDC.approve(address(senior), type(uint256).max);
        vm.expectRevert();
        senior.deposit(40_000e6, alice);
        vm.stopPrank();
        deal(address(USDC), carol, 1_000_000e6);
        vm.startPrank(carol);
        USDC.approve(address(senior), type(uint256).max);
        vm.expectRevert();
        senior.deposit(1_000_000e6, carol);
        vm.stopPrank();

        vm.warp(block.timestamp + 7 days);
        uint256 before = USDC.balanceOf(address(junior));
        junior.settle();
        uint256 paid = before - USDC.balanceOf(address(junior));
        // the exiter left with its share of the loss; only the remaining half is billed
        assertLe(paid, 2_000e6, "never more than the loss");
        assertApproxEqRel(paid, 1_000e6, 0.1e18, "about the half that stayed");
    }
}
