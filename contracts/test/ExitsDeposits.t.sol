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
}
