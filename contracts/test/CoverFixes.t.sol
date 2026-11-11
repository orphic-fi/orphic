// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// Regression tests for the cover-math fixes (audit findings C6, C3b, C9). Each test measures its numbers on the fork
// and prints them; tolerances are stated next to the assertion that uses them.

import "./Base.t.sol";
import {Vm} from "forge-std/Vm.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

contract CoverFixesTest is Base {
    address carol = makeAddr("carol");

    /* helpers */

    /// @dev A real loss on senior: shrink the Felix adapter's shares by `lossAssets` worth (same trick as Review.t.sol).
    function _forceSeniorLoss(uint256 lossAssets) internal {
        uint256 adapterShares = IERC4626(FELIX_USDC_V1).balanceOf(felixAdapter);
        uint256 lossShares = IERC4626(FELIX_USDC_V1).convertToShares(lossAssets);
        deal(FELIX_USDC_V1, felixAdapter, adapterShares - lossShares, true);
    }

    /// @dev Senior real assets (idle + Felix adapter), what junior's price reads.
    function _seniorReal() internal view returns (uint256) {
        return USDC.balanceOf(address(senior))
            + IERC4626(FELIX_USDC_V1).convertToAssets(IERC4626(FELIX_USDC_V1).balanceOf(felixAdapter));
    }

    /// @dev settle() and read back (shortfall, paid) of its Cover event and the unpaid amount of CoverShortfallCarried.
    function _settle() internal returns (bool covered, uint256 shortfall, uint256 paid, uint256 carried) {
        vm.recordLogs();
        junior.settle();
        Vm.Log[] memory ls = vm.getRecordedLogs();
        for (uint256 i = 0; i < ls.length; i++) {
            if (ls[i].emitter != address(junior) || ls[i].topics.length == 0) continue;
            if (ls[i].topics[0] == keccak256("Cover(uint256,uint256)")) {
                covered = true;
                (shortfall, paid) = abi.decode(ls[i].data, (uint256, uint256));
            } else if (ls[i].topics[0] == keccak256("CoverShortfallCarried(uint256)")) {
                carried = abi.decode(ls[i].data, (uint256));
            }
        }
    }

    function _nextSettle() internal {
        vm.warp(junior.lastSettle() + junior.SETTLE_INTERVAL());
    }

    /// @dev Senior with alice holding everything, a small junior (bob) that cannot pay a 5k loss, baseline synced.
    function _smallJuniorBigLoss() internal {
        _seniorDeposit(alice, 100_000e6);
        _juniorDeposit(bob, 1_000e6);
        junior.syncSenior();
        _forceSeniorLoss(5_000e6);
    }

    function _topUpJunior(uint256 amount) internal {
        deal(address(USDC), address(junior), USDC.balanceOf(address(junior)) + amount);
    }

    /* T001, C6: a partial cover carries the remainder */

    /// (a) settle 2 pays what idle has, settle 3 bills the remainder once junior has funds again.
    ///     Tolerance: the remainder shrinks by the Felix yield senior earned in the week (measured) and 1 USDC of rounding.
    function test_C6_partialCoverRemainderIsBilledAtNextSettle() public {
        _smallJuniorBigLoss();
        _nextSettle();
        (bool c2, uint256 short2, uint256 paid2, uint256 carried2) = _settle();
        assertTrue(c2);
        assertEq(paid2, 1_001e6, "idle (deposit + seed) paid");
        assertEq(carried2, short2 - paid2);
        assertGt(carried2, 3_500e6, "most of the loss is unpaid");
        console2.log("settle 2: shortfall / paid / carried", short2, paid2, carried2);

        _topUpJunior(20_000e6);
        uint256 realAfter2 = _seniorReal();
        _nextSettle();
        senior.accrueInterest();
        uint256 yield3 = _seniorReal() - realAfter2; // Felix yield on senior during the week, shrinks the bill
        (bool c3, uint256 short3, uint256 paid3, uint256 carried3) = _settle();
        console2.log("settle 3: shortfall / paid / yield", short3, paid3, yield3);
        assertTrue(c3);
        assertEq(carried3, 0, "fully paid now");
        assertApproxEqAbs(paid3, carried2 - yield3, 1e6, "remainder billed at settle 3");
    }

    /// (b) a buyer enters senior after the loss, once the cover is recognised (no recognition-lag dilution): settle 3 bills
    ///     no more than the unpaid remainder. Tolerance: the Felix yield makes the bill smaller; 1 USDC rounding up.
    function test_C6_buyerBetweenSettlesDoesNotEnlargeTheBill() public {
        _smallJuniorBigLoss();
        _nextSettle();
        (,, uint256 paid2, uint256 carried2) = _settle();
        console2.log("settle 2 paid / carried", paid2, carried2);
        _topUpJunior(20_000e6);
        vm.warp(block.timestamp + 5 days); // maxRate recognises the 1k transfer within 2 days
        senior.accrueInterest();
        deal(address(USDC), carol, 1_000_000e6);
        _seniorDeposit(carol, 1_000_000e6);
        junior.syncSenior(); // still below the carried baseline: refused, carol stays uncovered
        _nextSettle();
        (bool c3,, uint256 paid3, uint256 carried3) = _settle();
        console2.log("settle 3 paid (buyer of 1M entered)", paid3);
        assertTrue(c3);
        assertEq(carried3, 0);
        assertLe(paid3, carried2 + 1e6, "bill bounded by the unpaid remainder");
        assertGt(paid3, carried2 / 2, "and the remainder is really billed");
    }

    /// (b2) the same buyer entering right after settle 2, while senior's price still recognises the 1k transfer: the
    ///      pre-existing recognition-lag dilution (LIMITATIONS L1) can re-bill part of what was just paid. Printed, bounded
    ///      by remainder + what settle 2 paid.
    function test_C6_buyerRightAfterSettleTwoBoundedByRemainderPlusPaid() public {
        _smallJuniorBigLoss();
        _nextSettle();
        (,, uint256 paid2, uint256 carried2) = _settle();
        _topUpJunior(20_000e6);
        deal(address(USDC), carol, 1_000_000e6);
        _seniorDeposit(carol, 1_000_000e6);
        _nextSettle();
        (,, uint256 paid3,) = _settle();
        console2.log("buyer right after settle 2: carried / paid2 / paid3", carried2, paid2, paid3);
        assertLe(paid3, carried2 + paid2 + 1e6);
    }

    /// (c) junior idle 0 at settle 2 and 3: settle never reverts, the whole bill is carried twice, paid when idle returns.
    function test_C6_idleZeroCarriesTwiceThenPays() public {
        _smallJuniorBigLoss();
        // park all junior idle USDC in Felix through the agent
        uint256 idle = USDC.balanceOf(address(junior));
        vm.startPrank(agent);
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (FELIX_USDC_V1, idle)));
        junior.execute(FELIX_USDC_V1, abi.encodeWithSignature("deposit(uint256,address)", idle, address(junior)));
        vm.stopPrank();
        assertEq(USDC.balanceOf(address(junior)), 0);

        _nextSettle();
        (bool c2, uint256 short2, uint256 paid2, uint256 carried2) = _settle();
        assertTrue(c2);
        assertEq(paid2, 0);
        assertEq(carried2, short2);
        _nextSettle();
        (bool c3, uint256 short3, uint256 paid3, uint256 carried3) = _settle();
        console2.log("idle 0: carried at settle 2 / 3", carried2, carried3);
        assertTrue(c3);
        assertEq(paid3, 0);
        assertEq(carried3, short3);
        // the carry shrinks only by a week of Felix yield (measured below 2% of the bill on 100k senior)
        assertApproxEqRel(short3, carried2, 0.03e18);

        _topUpJunior(20_000e6);
        _nextSettle();
        (bool c4,, uint256 paid4, uint256 carried4) = _settle();
        assertTrue(c4);
        assertEq(carried4, 0);
        assertApproxEqRel(paid4, carried3, 0.03e18);
        console2.log("idle back: paid at settle 4", paid4);
    }

    /// (d) once the carry is paid, a loss-free sync and a later settle bill nothing more.
    function test_C6_remainderIsBilledExactlyOnce() public {
        _smallJuniorBigLoss();
        _nextSettle();
        _settle(); // partial
        _topUpJunior(20_000e6);
        _nextSettle();
        (, , uint256 paid3, uint256 carried3) = _settle(); // pays the remainder
        assertGt(paid3, 0);
        assertEq(carried3, 0);
        uint256 seniorUsdc = USDC.balanceOf(address(senior));
        vm.warp(block.timestamp + 1 hours);
        junior.syncSenior(); // loss-free: baseline moves to the whole supply
        assertEq(junior.seniorSupplyBase(), senior.totalSupply());
        _nextSettle();
        (bool c4, , uint256 paid4,) = _settle();
        assertFalse(c4, "no Cover event: nothing more to bill");
        assertEq(paid4, 0);
        assertEq(USDC.balanceOf(address(senior)), seniorUsdc);
        // and one more, still nothing
        _nextSettle();
        (bool c5,,,) = _settle();
        assertFalse(c5);
    }
}
