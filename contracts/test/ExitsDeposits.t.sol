// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// Regression tests for audit fixes 2/8: E2(e), E6(a), A4, A7, O6, O7(e)(f). Each test measures on the fork and prints
// its numbers; tolerances are stated next to the assertion that uses them.

import "./Base.t.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

contract ExitsDepositsTest is Base {
    address carol = makeAddr("carol");

    function _usdcValue(address who) internal view returns (uint256) {
        return junior.balanceOf(who) * junior.pricePerShare() / WAD / 1e12;
    }

    /* E6(a): senior's pending management-fee shares are counted in junior's NAV before they are minted */

    function test_FIXED_E6_a_pendingSeniorFeeSharesCountInNav() public {
        _seniorDeposit(alice, 200_000e6);
        _juniorDeposit(bob, 40_000e6);
        vm.warp(block.timestamp + 6 days);
        uint256 before_ = junior.totalAssets(); // fee shares not minted yet
        assertEq(senior.balanceOf(address(junior)), 0, "nothing minted yet");
        senior.accrueInterest(); // the same fee, now minted
        uint256 after_ = junior.totalAssets();
        emit log_named_decimal_uint("junior NAV, fee pending", before_, 6);
        emit log_named_decimal_uint("junior NAV, fee minted ", after_, 6);
        assertGt(after_ - 40_001e6, 5e6, "a week of fee is about 19 USDC, is in NAV");
        assertApproxEqAbs(before_, after_, 2, "pending counted: minting changes nothing");
    }

    function test_FIXED_E6_a_preSettleDepositGainsNoneOfThePendingFee() public {
        deal(address(USDC), carol, 1_000_000e6);
        _seniorDeposit(alice, 200_000e6);
        _juniorDeposit(bob, 40_000e6);
        vm.warp(junior.lastSettle() + junior.SETTLE_INTERVAL() - 10 minutes); // keeper down: no accrueInterest
        uint256 g = gasleft();
        _juniorDeposit(carol, 40_000e6);
        g -= gasleft();
        emit log_named_uint("deposit gas incl. helper approvals", g);
        vm.warp(block.timestamp + 11 minutes);
        junior.settle();
        uint256 value = _usdcValue(carol);
        emit log_named_decimal_uint("carol deposited 40000.000000, worth at settle", value, 6);
        // she joined a minute before the fee crystallised and may not take a share of the week's fee (about 9.5 USDC if she did)
        assertLe(value, 40_000e6 + 1e6, "no gain from the pending fee");
        assertGe(value, 40_000e6 - 1e6);
    }

    /* A4: revoking is always allowed; removing a venue zeroes junior's USDC allowance to it */

    function _approveAsAgent(address spender, uint256 amount) internal {
        vm.prank(agent);
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (spender, amount)));
    }

    function test_FIXED_A4_removeVaultZeroesItsAllowance() public {
        _approveAsAgent(FELIX_USDC_V1, 1_000e6);
        assertEq(USDC.allowance(address(junior), FELIX_USDC_V1), 1_000e6);
        vm.prank(owner);
        junior.removeVault(0); // Felix holds nothing
        assertEq(USDC.allowance(address(junior), FELIX_USDC_V1), 0, "allowance zeroed with the vault");
        assertFalse(junior.isVault(FELIX_USDC_V1));
    }

    function test_FIXED_A4_forceRemoveVaultZeroesItsAllowance() public {
        _approveAsAgent(FELIX_USDC_V1, 1_000e6);
        vm.prank(owner);
        junior.forceRemoveVault(0);
        assertEq(USDC.allowance(address(junior), FELIX_USDC_V1), 0);
    }

    function test_FIXED_A4_morphoAllowanceZeroedOnlyWhenTheLastMarketGoes() public {
        _approveAsAgent(address(MORPHO), 1_000e6);
        vm.prank(owner);
        junior.removeMarket(0);
        assertEq(USDC.allowance(address(junior), address(MORPHO)), 1_000e6, "one market left: Morpho allowance stays");
        vm.prank(owner);
        junior.removeMarket(0);
        assertEq(junior.marketsLength(), 0);
        assertEq(USDC.allowance(address(junior), address(MORPHO)), 0, "last market gone: allowance zeroed");
    }

    function test_FIXED_A4_forceRemoveMarketZeroesMorphoAllowanceWithTheLastMarket() public {
        _approveAsAgent(address(MORPHO), 1_000e6);
        vm.startPrank(owner);
        junior.forceRemoveMarket(0);
        assertEq(USDC.allowance(address(junior), address(MORPHO)), 1_000e6);
        junior.forceRemoveMarket(0);
        vm.stopPrank();
        assertEq(USDC.allowance(address(junior), address(MORPHO)), 0);
    }

    function test_FIXED_A4_agentCanAlwaysRevokeButNotGrantToARemovedVenue() public {
        _approveAsAgent(FELIX_USDC_V1, 1_000e6);
        vm.prank(owner);
        junior.forceRemoveVault(0);
        _approveAsAgent(FELIX_USDC_V1, 0); // allowed although the venue is gone and its rule may be off
        vm.prank(owner);
        junior.setApprovalRule(address(USDC), address(MORPHO), false);
        _approveAsAgent(address(MORPHO), 0); // revoke without a rule: allowed
        vm.prank(agent);
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (FELIX_USDC_V1, 1)));
        vm.prank(agent);
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (address(MORPHO), 1))); // no rule: grant refused
    }

    /* A7: a forced removal pauses deposits */

    function test_FIXED_A7_forceRemoveVaultPausesDeposits() public {
        _juniorDeposit(alice, 1_000e6);
        vm.expectEmit(false, false, false, true, address(junior));
        emit JuniorVault.DepositsPaused(true);
        vm.prank(owner);
        junior.forceRemoveVault(0);
        assertTrue(junior.depositsPaused());
        vm.startPrank(alice);
        USDC.approve(address(junior), 1e6);
        vm.expectRevert(JuniorVault.Paused.selector);
        junior.deposit(1e6, alice);
        vm.stopPrank();
        vm.prank(owner);
        junior.setDepositsPaused(false); // the owner unpauses after re-listing
        _juniorDeposit(alice, 1e6);
    }

    function test_FIXED_A7_forceRemoveMarketPausesDeposits() public {
        vm.prank(owner);
        junior.forceRemoveMarket(0);
        assertTrue(junior.depositsPaused());
    }

    function test_A7_plainRemoveDoesNotPause() public {
        vm.prank(owner);
        junior.removeVault(0);
        assertFalse(junior.depositsPaused());
    }
}
