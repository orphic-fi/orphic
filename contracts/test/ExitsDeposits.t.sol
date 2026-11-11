// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// Regression tests for audit fixes 2/8: E2(e), E6(a), A4, A7, O6, O7(e)(f). Each test measures on the fork and prints
// its numbers; tolerances are stated next to the assertion that uses them.

import "./Base.t.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {MorphoBalancesLib} from "morpho-blue/libraries/periphery/MorphoBalancesLib.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

/// @dev A stake token that is also an ERC-4626 vault over USDC (the O7(f) shape).
contract StakeVault is ERC4626 {
    constructor(IERC20 usdc) ERC4626(usdc) ERC20("Stake vault", "sVLT") {}
}

contract ExitsDepositsTest is Base {
    using MorphoBalancesLib for IMorpho;

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

    /* O6: a stake-rate proposal moves the rate at most 2x either way */

    function test_FIXED_O6_proposalBoundedToHalfAndDouble() public {
        vm.startPrank(owner);
        junior.setStakeToken(IERC20(address(orph)), 0.2e18);
        vm.expectRevert(JuniorVault.StakeRateOutOfBounds.selector);
        junior.proposeStakePerAsset(0.4e18 + 1); // just above 2x
        vm.expectRevert(JuniorVault.StakeRateOutOfBounds.selector);
        junior.proposeStakePerAsset(0.1e18 - 1); // just below 0.5x
        vm.expectRevert(JuniorVault.StakeRateOutOfBounds.selector);
        junior.proposeStakePerAsset(0); // cannot switch the stake off or to dust in one step
        vm.expectRevert(JuniorVault.StakeRateOutOfBounds.selector);
        junior.proposeStakePerAsset(type(uint256).max);
        junior.proposeStakePerAsset(0.4e18); // exactly 2x
        junior.proposeStakePerAsset(0.1e18); // exactly 0.5x replaces it
        vm.stopPrank();
        assertEq(junior.pendingStakePerAsset(), 0.1e18);
    }

    function test_FIXED_O6_zeroRateAcceptsAnyFirstProposal() public {
        vm.startPrank(owner);
        junior.setStakeToken(IERC20(address(orph)), 0);
        junior.proposeStakePerAsset(5e18);
        vm.stopPrank();
        assertEq(junior.pendingStakePerAsset(), 5e18);
    }

    function test_FIXED_O6_boundIsFromTheAppliedRateNotThePending() public {
        vm.startPrank(owner);
        junior.setStakeToken(IERC20(address(orph)), 0.2e18);
        junior.proposeStakePerAsset(0.4e18);
        vm.stopPrank();
        vm.warp(block.timestamp + 3 days);
        junior.applyStakePerAsset();
        vm.startPrank(owner);
        vm.expectRevert(JuniorVault.StakeRateOutOfBounds.selector);
        junior.proposeStakePerAsset(0.9e18); // 2.25x of the new 0.4
        junior.proposeStakePerAsset(0.8e18);
        vm.stopPrank();
    }

    /* O7(e): becoming the stake token clears the token's allowance to Morpho and every registered vault */

    function test_FIXED_O7_e_setStakeTokenZeroesAllowancesToVenues() public {
        // before it is the stake token the token is an ordinary approvable asset: the agent can approve it to the venues
        vm.startPrank(owner);
        junior.setApprovalRule(address(orph), address(MORPHO), true);
        junior.setApprovalRule(address(orph), FELIX_USDC_V1, true);
        junior.setApprovalRule(address(orph), address(senior), true);
        vm.stopPrank();
        vm.startPrank(agent);
        junior.execute(address(orph), abi.encodeCall(IERC20.approve, (address(MORPHO), 5e18)));
        junior.execute(address(orph), abi.encodeCall(IERC20.approve, (FELIX_USDC_V1, 6e18)));
        junior.execute(address(orph), abi.encodeCall(IERC20.approve, (address(senior), 7e18)));
        vm.stopPrank();
        assertEq(orph.allowance(address(junior), address(MORPHO)), 5e18);
        vm.prank(owner);
        junior.setStakeToken(IERC20(address(orph)), 0.2e18);
        assertEq(orph.allowance(address(junior), address(MORPHO)), 0, "morpho");
        assertEq(orph.allowance(address(junior), FELIX_USDC_V1), 0, "felix");
        assertEq(orph.allowance(address(junior), address(senior)), 0, "senior");
        // and it stays that way: no new rule, no agent call on the stake token
        vm.prank(owner);
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.setApprovalRule(address(orph), address(MORPHO), true);
        vm.prank(agent);
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.execute(address(orph), abi.encodeCall(IERC20.approve, (address(MORPHO), 1)));
        // staking still works
        _juniorDeposit(alice, 1_000e6);
        assertEq(junior.stakeOf(alice), 200e18);
    }

    /* O7(f): a vault whose share token is the stake token cannot be listed */

    function test_FIXED_O7_f_addVaultRefusesTheStakeToken() public {
        StakeVault sv = new StakeVault(USDC);
        vm.startPrank(owner);
        junior.setStakeToken(IERC20(address(sv)), 0.2e18); // legal: not a listed vault yet
        vm.expectRevert(JuniorVault.WrongAsset.selector);
        junior.addVault(address(sv));
        vm.stopPrank();
        assertFalse(junior.isVault(address(sv)));
        assertEq(junior.vaultsLength(), 2);
    }

    function test_O7_f_otherVaultsStillList() public {
        StakeVault other = new StakeVault(USDC);
        vm.prank(owner);
        junior.addVault(address(other));
        assertTrue(junior.isVault(address(other)));
    }

    function test_O7_f_vaultWithoutAssetIsRefused() public {
        vm.prank(owner);
        vm.expectRevert(); // an EOA / contract without asset(): the call itself reverts, nothing is listed
        junior.addVault(address(orph));
        assertFalse(junior.isVault(address(orph)));
    }

    /* E2(e): deposits revert while junior cannot cover its priced claims; a post-pricing shortfall is shared pro rata */

    uint256 constant EX = 1_500e6; // each exiter's deposit

    function _vaultValue(address v, uint256 extraShares) internal view returns (uint256) {
        uint256 bal = IERC4626(v).balanceOf(address(junior)) + extraShares;
        return bal == 0 ? 0 : IERC4626(v).convertToAssets(bal);
    }

    /// @dev idle plus every position, read straight from Morpho and the vaults: independent of junior's own views
    ///      (all venues answer here; the four venues Base lists)
    function _holdings() internal view returns (uint256 h) {
        h = USDC.balanceOf(address(junior));
        h += MORPHO.expectedSupplyAssets(mpKhype, address(junior)) + MORPHO.expectedSupplyAssets(mpWhype, address(junior));
        h += _vaultValue(FELIX_USDC_V1, 0);
        (,, uint256 pendingFee) = senior.accrueInterestView();
        h += _vaultValue(address(senior), pendingFee);
    }

    function _toFelix(uint256 assets) internal {
        vm.startPrank(agent);
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (FELIX_USDC_V1, assets)));
        junior.execute(FELIX_USDC_V1, abi.encodeCall(IERC4626.deposit, (assets, address(junior))));
        vm.stopPrank();
    }

    function _recallFelix() internal {
        uint256 shares = IERC4626(FELIX_USDC_V1).balanceOf(address(junior));
        vm.prank(agent);
        junior.execute(FELIX_USDC_V1, abi.encodeCall(IERC4626.redeem, (shares, address(junior), address(junior))));
    }

    function _felixValue() internal view returns (uint256) {
        return IERC4626(FELIX_USDC_V1).convertToAssets(IERC4626(FELIX_USDC_V1).balanceOf(address(junior)));
    }

    function _loseHalfOfFelix() internal {
        deal(FELIX_USDC_V1, address(junior), IERC4626(FELIX_USDC_V1).balanceOf(address(junior)) / 2, true);
    }

    /// @dev alice and bob deposit EX each, both request exit, junior settles until both are priced (reserved ~ 2 EX).
    ///      `felix` of the deposits goes to Felix, the rest stays idle.
    function _twoExitersPriced(uint256 felix) internal {
        _juniorDeposit(alice, EX);
        _juniorDeposit(bob, EX);
        _toFelix(felix);
        _exitAll(alice);
        _exitAll(bob);
        (, uint64 readyAt,) = junior.exitOf(alice);
        vm.warp(readyAt > junior.lastSettle() + junior.SETTLE_INTERVAL() ? readyAt : junior.lastSettle() + junior.SETTLE_INTERVAL());
        junior.settle();
        assertGt(junior.reservedAssets(), 2 * EX - 5e6, "both exits priced");
    }

    function _exitAll(address who) internal {
        uint256 shares = junior.balanceOf(who); // read before the prank: the argument call would consume it
        vm.prank(who);
        junior.requestExit(shares);
    }

    function _claim(address who) internal returns (uint256 got) {
        uint256 before_ = USDC.balanceOf(who);
        vm.prank(who);
        junior.claimExit();
        got = USDC.balanceOf(who) - before_;
    }

    function test_FIXED_E2_e_twoClaimantsTakeTheSameProRataLoss() public {
        _twoExitersPriced(2_800e6);
        uint256 reserved = junior.reservedAssets();
        _loseHalfOfFelix(); // after pricing, beyond the stayers' equity (1 USDC of dead shares)
        _recallFelix();
        uint256 holdings = USDC.balanceOf(address(junior));
        assertLt(holdings, reserved);
        uint256 owedEach = reserved / 2; // both priced at the same price, same shares
        uint256 a = _claim(alice);
        uint256 b = _claim(bob);
        emit log_named_decimal_uint("reserved ", reserved, 6);
        emit log_named_decimal_uint("holdings ", holdings, 6);
        emit log_named_decimal_uint("alice paid", a, 6);
        emit log_named_decimal_uint("bob paid  ", b, 6);
        assertApproxEqAbs(a, b, 2, "same pro rata loss, whoever claims first");
        assertApproxEqAbs(a, owedEach * holdings / reserved, 3, "owed x holdings / reserved");
        assertLe(a + b, holdings, "never more than junior holds");
        assertApproxEqAbs(a + b, holdings, 5, "and the whole of it is shared out");
        assertEq(junior.reservedAssets(), 0, "full claims leave the reserve");
    }

    function test_FIXED_E2_e_orderDoesNotMatter() public {
        _twoExitersPriced(2_800e6);
        _loseHalfOfFelix();
        _recallFelix();
        uint256 b = _claim(bob); // reversed order
        uint256 a = _claim(alice);
        assertApproxEqAbs(a, b, 2);
    }

    function test_FIXED_E2_e_newcomerDepositRevertsInsolventInTheDeficit() public {
        _twoExitersPriced(2_800e6);
        _loseHalfOfFelix();
        deal(address(USDC), carol, 500e6);
        vm.startPrank(carol);
        USDC.approve(address(junior), 500e6);
        vm.expectRevert(JuniorVault.Insolvent.selector);
        junior.deposit(500e6, carol);
        vm.stopPrank();
    }

    function test_E2_e_noDeficitPaysExactlyAsBefore() public {
        _twoExitersPriced(2_800e6);
        _recallFelix();
        (, uint192 price) = junior.settles(junior.settlesLength() - 1);
        (uint128 shares,,) = junior.exitOf(alice);
        uint256 expected = uint256(shares) * price / WAD / 1e12;
        assertEq(_claim(alice), expected, "ratio 1: shares x price, to the unit");
        assertEq(_claim(bob), expected);
        // and a deposit with no deficit is not refused
        deal(address(USDC), carol, 100e6);
        _juniorDeposit(carol, 100e6);
    }

    function test_E2_e_fullyBackedClaimNeedsNoValuationAndPaysInFull() public {
        _twoExitersPriced(0); // everything idle: idle covers the reserve, the cheap path
        (uint128 shares,,) = junior.exitOf(alice);
        (, uint192 price) = junior.settles(junior.settlesLength() - 1);
        assertEq(_claim(alice), uint256(shares) * price / WAD / 1e12);
    }

    /// (a) a reverting venue, readable holdings still cover the reserve: paid in full
    function test_E2_e_revertingVenueWithReadableAboveReservedPaysInFull() public {
        deal(address(USDC), carol, 2_000e6);
        _juniorDeposit(carol, 1_000e6); // a stayer: equity above the reserve
        _juniorDeposit(alice, EX);
        _juniorDeposit(bob, EX);
        // idle 2,001, Morpho 1,501, Felix 500 (will revert): reserve ~3,000, readable 3,501
        _toFelix(500e6);
        _agentSupply(mpKhype, 1_500e6);
        _exitAll(alice);
        _exitAll(bob);
        (, uint64 readyAt,) = junior.exitOf(alice);
        vm.warp(readyAt > junior.lastSettle() + junior.SETTLE_INTERVAL() ? readyAt : junior.lastSettle() + junior.SETTLE_INTERVAL());
        junior.settle();
        uint256 reserved = junior.reservedAssets();
        assertLt(USDC.balanceOf(address(junior)), reserved, "idle alone does not prove solvency");
        vm.mockCallRevert(FELIX_USDC_V1, abi.encodeWithSignature("balanceOf(address)", address(junior)), "down");
        (uint128 shares,,) = junior.exitOf(alice);
        (, uint192 price) = junior.settles(junior.settlesLength() - 1);
        assertEq(_claim(alice), uint256(shares) * price / WAD / 1e12, "provably solvent: full payout");
    }

    /// (b) a reverting venue and readable holdings below the reserve: VenueBroken; forceRemove unblocks, then the ratio applies
    function test_E2_e_revertingVenueWithReadableBelowReservedBlocksUntilForceRemove() public {
        deal(address(USDC), carol, 2_000e6);
        _juniorDeposit(carol, 1_000e6);
        _juniorDeposit(alice, EX);
        _juniorDeposit(bob, EX);
        _toFelix(1_500e6); // idle 2,501: enough for both payouts at the ratio, readable (idle) below the 3,000 reserve
        _exitAll(alice);
        _exitAll(bob);
        (, uint64 readyAt,) = junior.exitOf(alice);
        vm.warp(readyAt > junior.lastSettle() + junior.SETTLE_INTERVAL() ? readyAt : junior.lastSettle() + junior.SETTLE_INTERVAL());
        junior.settle();
        uint256 reserved = junior.reservedAssets();
        uint256 idle = USDC.balanceOf(address(junior));
        vm.mockCallRevert(FELIX_USDC_V1, abi.encodeWithSignature("balanceOf(address)", address(junior)), "down");
        vm.prank(alice);
        vm.expectRevert(JuniorVault.VenueBroken.selector);
        junior.claimExit();
        // owner force-removes Felix (index 0): the position is abandoned from the valuation, deposits pause (A7)
        vm.prank(owner);
        junior.forceRemoveVault(0);
        assertTrue(junior.depositsPaused());
        uint256 readable = idle + junior.marketAssets(0) + junior.marketAssets(1); // Felix is abandoned, senior holds no fee shares here
        uint256 paid = _claim(alice);
        (uint128 shares,,) = junior.exitOf(bob);
        (, uint192 price) = junior.settles(junior.settlesLength() - 1);
        uint256 owedEach = uint256(shares) * price / WAD / 1e12;
        emit log_named_decimal_uint("alice paid after forceRemove", paid, 6);
        assertLt(paid, owedEach, "now at the ratio, not in full");
        assertApproxEqAbs(paid, owedEach * readable / reserved, 3);
        assertApproxEqAbs(_claim(bob), paid, 2, "same ratio for the second claimant");
    }

    /// (c) a donation or a venue-view bump can only raise the ratio toward 1; sum of payouts never exceeds holdings
    function test_E2_e_donationOnlyRaisesTheRatioAndSumStaysWithinHoldings() public {
        _twoExitersPriced(2_800e6);
        _loseHalfOfFelix();
        _recallFelix();
        uint256 holdings0 = USDC.balanceOf(address(junior));
        deal(address(USDC), address(junior), holdings0 + 400e6); // donation
        uint256 holdings = holdings0 + 400e6;
        uint256 a = _claim(alice);
        uint256 b = _claim(bob);
        assertApproxEqAbs(a, b, 2);
        assertLe(a + b, holdings, "sum of claims <= holdings");
        assertGt(a + b, holdings0, "the donation reached the claimants");
    }

    function test_E2_e_donationAboveTheReserveIsCappedAtFullPayout() public {
        _twoExitersPriced(2_800e6);
        uint256 reserved = junior.reservedAssets();
        _loseHalfOfFelix();
        _recallFelix();
        deal(address(USDC), address(junior), reserved + 1_000e6);
        (uint128 shares,,) = junior.exitOf(alice);
        (, uint192 price) = junior.settles(junior.settlesLength() - 1);
        uint256 owed = uint256(shares) * price / WAD / 1e12;
        assertEq(_claim(alice), owed, "capped at what the claim is owed");
        assertEq(_claim(bob), owed);
    }

    /// @dev senior with a deposit so junior holds management-fee shares; both exits priced; half of Felix lost afterwards
    function _deficitWithSeniorFeeShares() internal returns (uint256 reserved) {
        deal(address(USDC), carol, 200_000e6);
        _seniorDeposit(carol, 100_000e6);
        _twoExitersPriced(2_800e6);
        assertGt(senior.balanceOf(address(junior)), 0, "junior holds fee shares");
        reserved = junior.reservedAssets();
        _loseHalfOfFelix();
    }

    /// a real venue-view move (senior fee shares accrue, Felix earns): the ratio rises on its own, no donation
    function test_E2_e_venueViewMoveRaisesTheRatio() public {
        uint256 reserved = _deficitWithSeniorFeeShares();
        uint256 h0 = _holdings();
        assertLt(h0, reserved);
        vm.warp(block.timestamp + 60 days);
        senior.accrueInterest();
        _recallFelix();
        uint256 h1 = _holdings();
        assertGt(h1, h0, "the views moved up");
        (uint128 shares,,) = junior.exitOf(alice);
        (, uint192 price) = junior.settles(junior.settlesLength() - 1);
        uint256 owed = uint256(shares) * price / WAD / 1e12;
        uint256 paid = _claim(alice);
        emit log_named_decimal_uint("ratio before (1e6 = 100%)", h0 * 1e6 / reserved, 0);
        emit log_named_decimal_uint("ratio after  (1e6 = 100%)", h1 * 1e6 / reserved, 0);
        assertApproxEqAbs(paid, owed * h1 / reserved, 3);
        assertGt(paid, owed * h0 / reserved, "paid at the higher ratio");
        assertLt(paid, owed);
    }

    /// the ratio counts positions, payment comes from idle only: the second claimant waits for idle
    function test_E2_e_ratioCountsPositionsButPaymentIsIdleOnly() public {
        _deficitWithSeniorFeeShares();
        _recallFelix(); // idle now excludes the senior fee shares
        uint256 a = _claim(alice);
        vm.prank(bob);
        vm.expectRevert(JuniorVault.InsufficientLiquidity.selector);
        junior.claimExit();
        uint256 feeShares = senior.balanceOf(address(junior));
        vm.prank(agent);
        junior.execute(address(senior), abi.encodeCall(IERC4626.redeem, (feeShares, address(junior), address(junior))));
        uint256 b = _claim(bob);
        emit log_named_decimal_uint("alice", a, 6);
        emit log_named_decimal_uint("bob  ", b, 6);
        assertApproxEqAbs(a, b, 10, "same ratio once idle arrives");
    }

    /// carry and a deficit are counted once: the ratio reads holdings net of the carried cover debt
    function test_FIXED_E2_e_carryAndDeficitAreNotDoubleCounted() public {
        deal(address(USDC), carol, 200_000e6);
        _seniorDeposit(carol, 100_000e6);
        _juniorDeposit(alice, EX);
        _juniorDeposit(bob, EX);
        _toFelix(2_800e6); // idle ~201, so a cover is paid from 201 and the rest carried
        junior.syncSenior();
        _exitAll(alice);
        // a 1,000 USDC loss on senior
        uint256 adapterShares = IERC4626(FELIX_USDC_V1).balanceOf(felixAdapter);
        deal(FELIX_USDC_V1, felixAdapter, adapterShares - IERC4626(FELIX_USDC_V1).convertToShares(1_000e6), true);
        // settle until alice's exit is priced (a loss-bearing settle pays what idle allows and carries the rest)
        (, uint64 readyAt,) = junior.exitOf(alice);
        vm.warp(readyAt > junior.lastSettle() + junior.SETTLE_INTERVAL() ? readyAt : junior.lastSettle() + junior.SETTLE_INTERVAL());
        junior.settle();
        uint256 carry = junior.carryOwed();
        assertGt(carry, 100e6, "a debt is carried");
        uint256 reserved = junior.reservedAssets();
        assertGt(reserved, 0);
        _loseHalfOfFelix(); // post-pricing deficit on top of the carry
        _recallFelix();
        uint256 holdings = _holdings(); // idle plus the senior fee shares junior holds
        uint256 net = holdings > carry ? holdings - carry : 0;
        (uint128 shares,,) = junior.exitOf(alice);
        (, uint192 price) = junior.settles(junior.settlesLength() - 1);
        uint256 owed = uint256(shares) * price / WAD / 1e12;
        emit log_named_decimal_uint("carry   ", carry, 6);
        emit log_named_decimal_uint("holdings", holdings, 6);
        emit log_named_decimal_uint("reserved", reserved, 6);
        emit log_named_decimal_uint("owed    ", owed, 6);
        assertLt(net, reserved, "the deficit branch runs");
        uint256 paid = _claim(alice);
        assertLt(paid, owed);
        assertApproxEqAbs(paid, owed * net / reserved, 3, "holdings net of the carry, once");
    }

    /* review round 1 */

    /// the reserve drains in a deficit, `Insolvent` no longer fires: deposits stay paused until a settle re-freezes the price
    function test_FIXED_E2_e_depositsStayPausedAfterTheReserveDrains() public {
        _twoExitersPriced(2_800e6);
        _loseHalfOfFelix();
        _recallFelix();
        _claim(alice);
        assertTrue(junior.depositsPaused(), "a claim at ratio < 1 pauses deposits");
        _claim(bob);
        assertEq(junior.reservedAssets(), 0);
        assertEq(junior.pricedExitShares(), 0);
        deal(address(USDC), carol, 100e6);
        vm.startPrank(carol);
        USDC.approve(address(junior), 100e6);
        vm.expectRevert(JuniorVault.Paused.selector);
        junior.deposit(100e6, carol);
        vm.stopPrank();
        // value comes back, the next settle freezes the new price, the owner reopens
        deal(address(USDC), address(junior), USDC.balanceOf(address(junior)) + 10e6);
        vm.warp(junior.lastSettle() + junior.SETTLE_INTERVAL());
        junior.settle();
        uint256 price = junior.pricePerShare();
        assertGt(price, WAD, "10 USDC over the dead shares: far above the stale WAD");
        vm.prank(owner);
        junior.setDepositsPaused(false);
        vm.prank(carol);
        uint256 shares = junior.deposit(100e6, carol);
        assertApproxEqRel(shares, uint256(100e6) * 1e12 * WAD / price, 1e15, "minted at the new price");
    }

    function test_E2_e_fullyBackedClaimDoesNotPauseDeposits() public {
        _twoExitersPriced(0);
        _claim(alice);
        _claim(bob);
        assertFalse(junior.depositsPaused());
    }

    /// net == reserve: NAV is 0 and the frozen price is stale, so that is refused too (and an empty junior is not)
    function test_E2_e_insolventAlsoAtNetEqualsReserve() public {
        _twoExitersPriced(0);
        uint256 reserved = junior.reservedAssets();
        deal(address(USDC), address(junior), reserved); // holdings exactly the reserve
        deal(address(USDC), carol, 10e6);
        vm.startPrank(carol);
        USDC.approve(address(junior), 10e6);
        vm.expectRevert(JuniorVault.Insolvent.selector);
        junior.deposit(10e6, carol);
        vm.stopPrank();
    }

    /// an exit priced at 0 never needs a valuation, so a reverting venue cannot block it
    function test_FIXED_E2_e_zeroClaimIsNotBlockedByARevertingVenue() public {
        _juniorDeposit(alice, EX);
        _juniorDeposit(bob, EX);
        _toFelix(2_800e6); // idle ~201 < the ~1,500 reserve: a real claim needs the valuation
        _exitAll(bob);
        vm.prank(alice);
        junior.requestExit(1e5); // 1e5 wei of shares: shares x price rounds to 0 USDC
        (, uint64 readyAt,) = junior.exitOf(bob);
        vm.warp(readyAt > junior.lastSettle() + junior.SETTLE_INTERVAL() ? readyAt : junior.lastSettle() + junior.SETTLE_INTERVAL());
        junior.settle();
        vm.mockCallRevert(FELIX_USDC_V1, abi.encodeWithSignature("balanceOf(address)", address(junior)), "down");
        assertEq(_claim(alice), 0, "worth 0, paid 0, not blocked");
        (uint128 left,,) = junior.exitOf(alice);
        assertEq(left, 0, "the request is closed");
        vm.prank(bob);
        vm.expectRevert(JuniorVault.VenueBroken.selector); // a real claim still needs provable solvency
        junior.claimExit();
    }

    /* approve(x, 0) is not a free pass */

    function test_FIXED_agentRevokeNeedsKnownTargetAndExactCalldata() public {
        _approveAsAgent(FELIX_USDC_V1, 1_000e6);
        // unlisted, rule-less target
        vm.prank(agent);
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.execute(address(orph), abi.encodeCall(IERC20.approve, (FELIX_USDC_V1, 0)));
        // trailing bytes
        vm.prank(agent);
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.execute(address(USDC), bytes.concat(abi.encodeCall(IERC20.approve, (FELIX_USDC_V1, 0)), hex"01"));
        // truncated
        vm.prank(agent);
        vm.expectRevert();
        junior.execute(address(USDC), abi.encodePacked(IERC20.approve.selector, bytes32(uint256(uint160(FELIX_USDC_V1)))));
        // USDC to a listed vault: works
        _approveAsAgent(FELIX_USDC_V1, 0);
        assertEq(USDC.allowance(address(junior), FELIX_USDC_V1), 0);
        // a token with an approval rule for that spender: works
        vm.prank(owner);
        junior.setApprovalRule(address(orph), FELIX_USDC_V1, true);
        vm.prank(agent);
        junior.execute(address(orph), abi.encodeCall(IERC20.approve, (FELIX_USDC_V1, 0)));
    }

    /* O6 edge: from a rate of 1 the lower bound is 1 */

    function test_FIXED_O6_rateOfOneNeverProposesZero() public {
        vm.startPrank(owner);
        junior.setStakeToken(IERC20(address(orph)), 1);
        vm.expectRevert(JuniorVault.StakeRateOutOfBounds.selector);
        junior.proposeStakePerAsset(0);
        vm.expectRevert(JuniorVault.StakeRateOutOfBounds.selector);
        junior.proposeStakePerAsset(3);
        junior.proposeStakePerAsset(2);
        junior.proposeStakePerAsset(1);
        vm.stopPrank();
    }
}
