// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// Second-pass proof-of-concept tests. See REVIEW.md "Second pass".

import "../Base.t.sol";
import {IMorphoBase} from "morpho-blue/interfaces/IMorpho.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {MarketParamsLib} from "morpho-blue/libraries/MarketParamsLib.sol";

contract EvilOracle {
    function price() external pure returns (uint256) {
        return 1e60; // 1 wei of collateral is worth more than all the USDC on the chain
    }
}

contract Review2Test is Base {
    using MarketParamsLib for MarketParams;
    address carol = makeAddr("carol");

    function _forceSeniorLoss(uint256 lossAssets) internal {
        uint256 adapterShares = IERC4626(FELIX_USDC_V1).balanceOf(felixAdapter);
        uint256 lossShares = IERC4626(FELIX_USDC_V1).convertToShares(lossAssets);
        deal(FELIX_USDC_V1, felixAdapter, adapterShares - lossShares, true);
    }

    /* S-1: execute checks target + selector + receiver but never the MarketParams. The agent can supply junior's
       USDC to any Morpho market, including one nobody allowlisted, with an oracle the attacker controls. */
    function test_S1_agentSuppliesToUnlistedMarketAndAttackerBorrowsItAll() public {
        _juniorDeposit(alice, 50_000e6);
        // attacker creates a USDC market with worthless collateral and a rigged oracle (permissionless on Morpho)
        MockORPH junk = new MockORPH();
        MarketParams memory evil = MarketParams({
            loanToken: address(USDC),
            collateralToken: address(junk),
            oracle: address(new EvilOracle()),
            irm: mpKhype.irm,
            lltv: mpKhype.lltv
        });
        vm.prank(carol);
        MORPHO.createMarket(evil);
        assertFalse(junior.isMarket(evil.id()));
        // compromised agent key: both calls pass the allowlist exactly as the legitimate ones do
        // FIXED: execute decodes MarketParams and refuses any market not registered by the owner
        vm.startPrank(agent);
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (address(MORPHO), 50_000e6)));
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.execute(address(MORPHO), abi.encodeCall(IMorphoBase.supply, (evil, 50_000e6, 0, address(junior), "")));
        vm.stopPrank();
        assertApproxEqAbs(junior.totalAssets(), 50_001e6, 1);
        assertEq(USDC.balanceOf(carol), 0);
    }

    /* S-2: _seniorRealPrice uses senior.totalSupply(), which excludes management-fee shares not yet minted. A sync
       taken while senior has a fee backlog sets the baseline too high; the next settle mints the backlog and junior
       pays its own fee as "cover". */
    function test_S2_feeBacklogReadAsLossAfterSync() public {
        _seniorDeposit(alice, 100_000e6);
        _juniorDeposit(bob, 20_000e6);
        // nobody touches senior for 30 days: no accrueInterest, no fee shares minted
        vm.warp(block.timestamp + 30 days);
        junior.syncSenior(); // keeper's hourly sync: baseline = price without the 30 days of fee dilution
        vm.warp(block.timestamp + 1 hours);
        uint256 idleBefore = USDC.balanceOf(address(junior));
        vm.recordLogs();
        junior.settle(); // accrueInterest mints 30 days of fee shares, real price drops ~410 ppm
        uint256 paid = idleBefore - USDC.balanceOf(address(junior));
        console2.log("spurious cover paid (no loss happened)", paid);
        assertEq(paid, 0); // FIXED: pending fee shares are in the baseline denominator
    }

    /* Verified fine: refreshing the snapshot right before a loss does not help an attacker. Shares deposited before
       the loss really did take it, and the bill is the absolute loss (2,000 less a week of Felix yield), not a
       multiple of it. Only post-loss deposits were the problem (C-1) and sync refuses those. */
    function test_OK_snapshotRefreshBeforeLossBillsOnlyTheRealLoss() public {
        _seniorDeposit(alice, 100_000e6);
        _juniorDeposit(bob, 20_000e6);
        vm.warp(block.timestamp + 7 days);
        deal(address(USDC), carol, 1_000_000e6);
        _seniorDeposit(carol, 1_000_000e6);
        junior.syncSenior();
        _forceSeniorLoss(2_000e6);
        uint256 idleBefore = USDC.balanceOf(address(junior));
        junior.settle();
        uint256 paid = idleBefore - USDC.balanceOf(address(junior));
        console2.log("real loss 2,000; junior paid", paid);
        assertLe(paid, 2_000e6);
        assertGt(paid, 1_000e6);
    }

    /* S-4: rules and approvals survive removeVault, so a removed venue stays reachable by the agent while its
       balance is no longer valued. */
    function test_S4_removedVaultStillCallable() public {
        _juniorDeposit(alice, 10_000e6);
        uint256 idx;
        for (uint256 i = 0; i < junior.vaultsLength(); i++) {
            if (junior.vaults(i) == FELIX_USDC_V1) idx = i;
        }
        vm.prank(owner);
        junior.removeVault(idx);
        assertFalse(junior.isVault(FELIX_USDC_V1));
        // FIXED: a removed venue is refused at call time, approvals included
        vm.startPrank(agent);
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (FELIX_USDC_V1, 5_000e6)));
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.execute(FELIX_USDC_V1, abi.encodeCall(IERC4626.deposit, (5_000e6, address(junior))));
        vm.stopPrank();
        assertEq(IERC4626(FELIX_USDC_V1).balanceOf(address(junior)), 0);
        assertApproxEqAbs(junior.totalAssets(), 10_001e6, 1);
    }

    /* Verified fine: removal is blocked while a position exists, swap-and-pop keeps the mappings honest, and the
       idle floor holds across a supply that would dip under reservedAssets. */
    function test_OK_removalAndIdleFloor() public {
        _juniorDeposit(alice, 10_000e6);
        _agentSupply(mpKhype, 1_000e6);
        vm.prank(owner);
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.removeMarket(0);
        // remove the second market (index 1, whype) and check khype is still listed at index 0
        vm.prank(owner);
        junior.removeMarket(1);
        assertEq(junior.marketsLength(), 1);
        assertTrue(junior.isMarket(mpKhype.id()));
        assertFalse(junior.isMarket(mpWhype.id()));
        // idle floor: price 5k of exits, then try to deploy below it
        vm.prank(alice);
        junior.requestExit(5_000e18);
        vm.warp(block.timestamp + 8 days);
        junior.settle();
        uint256 idle = USDC.balanceOf(address(junior));
        uint256 reserved = junior.reservedAssets();
        vm.startPrank(agent);
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (address(MORPHO), idle)));
        vm.expectRevert(JuniorVault.InsufficientLiquidity.selector);
        junior.execute(address(MORPHO), abi.encodeCall(IMorphoBase.supply, (mpKhype, idle - reserved + 1, 0, address(junior), "")));
        junior.execute(address(MORPHO), abi.encodeCall(IMorphoBase.supply, (mpKhype, idle - reserved, 0, address(junior), "")));
        vm.stopPrank();
        assertEq(USDC.balanceOf(address(junior)), reserved);
    }

    /* Verified fine: stake release follows shares through transfers and merged requests. */
    function test_OK_stakeFollowsSharesThroughTransferAndMerge() public {
        vm.prank(owner);
        junior.setStakeToken(IERC20(address(orph)), 0.2e18);
        _juniorDeposit(bob, 1_000e6); // 200 ORPH, 1,000 shares
        vm.prank(bob);
        junior.transfer(carol, 400e18);
        // carol exits without stake: nothing released, nothing stuck on her side
        vm.prank(carol);
        junior.requestExit(400e18);
        // bob: two requests merged, 300 + 300
        vm.startPrank(bob);
        junior.requestExit(300e18);
        junior.requestExit(300e18);
        vm.stopPrank();
        vm.warp(block.timestamp + 8 days);
        junior.settle();
        vm.prank(carol);
        junior.claimExit();
        assertEq(orph.balanceOf(carol), 0);
        vm.prank(bob);
        junior.claimExit();
        assertEq(orph.balanceOf(bob), 120e18); // 600 of 1,000 staked shares burned
        assertEq(junior.stakedShares(bob), 400e18);
        assertEq(junior.stakeOf(bob), 80e18);
        // bob buys carol's shares back later: not needed; he can only free the last 80 ORPH by burning 400 more shares
    }
}
