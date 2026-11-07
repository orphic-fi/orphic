// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// Proof-of-concept tests written for the independent review. See ../../REVIEW.md.
// Each test is named after the finding it demonstrates. None of them modify src/.

import "../Base.t.sol";
import {IMorphoBase} from "morpho-blue/interfaces/IMorpho.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

contract ReviewTest is Base {
    address carol = makeAddr("carol");

    function _forceSeniorLoss(uint256 lossAssets) internal {
        uint256 adapterShares = IERC4626(FELIX_USDC_V1).balanceOf(felixAdapter);
        uint256 lossShares = IERC4626(FELIX_USDC_V1).convertToShares(lossAssets);
        deal(FELIX_USDC_V1, felixAdapter, adapterShares - lossShares, true);
    }

    /* H-1: cover is sized by senior supply at settle time, so anyone can deposit into senior after a loss and have
       junior pay to top up their fresh shares too. */
    function test_H1_coverSnipedByLateSeniorDepositor() public {
        _seniorDeposit(alice, 100_000e6);
        _juniorDeposit(bob, 20_000e6);
        junior.syncSenior(); // keeper does this hourly: new senior shares become covered
        _forceSeniorLoss(2_000e6); // 2% loss, 2k real damage
        vm.warp(block.timestamp + 7 days);
        // carol sees the loss and buys 1M senior shares at the depressed price just before settle
        deal(address(USDC), carol, 1_000_000e6);
        _seniorDeposit(carol, 1_000_000e6);
        uint256 juniorIdleBefore = USDC.balanceOf(address(junior));
        junior.settle();
        uint256 paid = juniorIdleBefore - USDC.balanceOf(address(junior));
        console2.log("real senior loss      ", uint256(2_000e6));
        console2.log("junior paid           ", paid);
        // FIXED: junior pays only what the pre-loss shares lost (about 2k less a week of Felix yield)
        assertApproxEqAbs(paid, 2_000e6, 200e6);
        // let senior recognise the transfer under maxRate, then carol leaves with a profit
        vm.warp(block.timestamp + 5 days);
        senior.accrueInterest();
        uint256 carolShares = senior.balanceOf(carol);
        vm.prank(carol);
        uint256 out = senior.redeem(carolShares, carol, carol);
        console2.log("carol in / out        ", uint256(1_000_000e6), out);
        // carol shares the donation pro rata (V2 mechanics) but cannot drain junior: under 0.2% on 1M
        assertLt(out, 1_000_000e6 + 3_000e6); // her slice of a 1.85k donation plus 5 days of Felix yield
    }

    /* H-2: a loss larger than what maxRate lets senior recognise in a week is covered again at the next settle. */
    function test_H2_coverPaidTwiceUnderMaxRateLag() public {
        _seniorDeposit(alice, 100_000e6);
        _juniorDeposit(bob, 50_000e6);
        _forceSeniorLoss(10_000e6); // 10% loss
        vm.warp(block.timestamp + 7 days);
        junior.settle();
        uint256 paid1 = USDC.balanceOf(address(senior));
        assertApproxEqAbs(paid1, 10_000e6, 500e6); // the loss is real, paid once
        // nothing else goes wrong in senior; one more week passes
        vm.warp(block.timestamp + 7 days);
        junior.settle();
        uint256 paid2 = USDC.balanceOf(address(senior)) - paid1;
        console2.log("paid at settle 1", paid1);
        console2.log("paid at settle 2", paid2);
        assertEq(paid2, 0); // FIXED: real-asset measurement, no second bill under maxRate lag
    }

    /* M-1: full exit after a loss leaves part of the stake locked forever. */
    function test_M1_stakeStrandedAfterLoss() public {
        vm.prank(owner);
        junior.setStakeToken(IERC20(address(orph)), 0.2e18);
        _seniorDeposit(alice, 100_000e6);
        _juniorDeposit(bob, 10_000e6); // stake 2,000 ORPH
        _forceSeniorLoss(5_000e6); // junior covers 5k of its 10k
        vm.prank(bob);
        junior.requestExit(10_000e18);
        vm.warp(block.timestamp + 8 days);
        junior.settle();
        // the exit was priced on NAV that includes senior fee shares, so idle alone cannot pay it (see M-3):
        // the agent must first turn the fee shares back into USDC
        uint256 feeShares = senior.balanceOf(address(junior));
        vm.prank(agent);
        junior.execute(
            address(senior),
            abi.encodeWithSignature("redeem(uint256,address,address)", feeShares, address(junior), address(junior))
        );
        vm.prank(bob);
        junior.claimExit();
        assertEq(junior.balanceOf(bob), 0);
        (uint128 shares,,) = junior.exitOf(bob);
        assertEq(shares, 0);
        console2.log("bob stake still held", junior.stakeOf(bob));
        console2.log("bob principal left  ", junior.stakedShares(bob));
        assertEq(junior.stakeOf(bob), 0); // FIXED: release tracks shares, full exit returns everything
    }

    /* M-2: deposits mint at the frozen price, so a deposit one block before settle takes the week's yield. */
    function test_M2_preSettleDepositTakesEpochYield() public {
        _juniorDeposit(alice, 10_000e6);
        // 1,000 USDC of yield during the week (FeeRouter share, Morpho interest, whatever)
        deal(address(USDC), address(junior), USDC.balanceOf(address(junior)) + 1_000e6);
        vm.warp(block.timestamp + 7 days);
        _juniorDeposit(bob, 90_000e6); // same block as settle
        junior.settle();
        uint256 p = junior.pricePerShare();
        uint256 bobValue = junior.balanceOf(bob) * p / WAD / 1e12;
        uint256 aliceValue = junior.balanceOf(alice) * p / WAD / 1e12;
        console2.log("bob value after 1 block   ", bobValue);
        console2.log("alice value after 1 week  ", aliceValue);
        assertApproxEqAbs(bobValue, 90_000e6, 10e6); // FIXED: bob mints at the live price, takes none of the yield
        assertGt(aliceValue, 10_990e6);
    }

    /* M-3: nothing stops the agent deploying USDC that is reserved for priced exits; claims then revert. */
    function test_M3_agentCanStrandReservedAssets() public {
        _juniorDeposit(alice, 10_000e6);
        vm.prank(alice);
        junior.requestExit(5_000e18);
        vm.warp(block.timestamp + 8 days);
        junior.settle();
        assertEq(junior.reservedAssets(), 5_000e6);
        // FIXED: execute refuses to take idle below reservedAssets
        vm.startPrank(agent);
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (address(MORPHO), 10_000e6)));
        vm.expectRevert(JuniorVault.InsufficientLiquidity.selector);
        junior.execute(address(MORPHO), abi.encodeCall(IMorphoBase.supply, (mpKhype, 10_000e6, 0, address(junior), "")));
        vm.stopPrank();
        _agentSupply(mpKhype, 5_000e6); // up to the reserve line is fine
        vm.prank(alice);
        junior.claimExit();
        assertEq(USDC.balanceOf(alice), 1_000_000e6 - 10_000e6 + 5_000e6);
    }

    /* L-3 (observation): the 0 / 0 path in _coverSenior needs senior.totalSupply() == 0 with a price below the
       baseline. On this fork the last full redeem from senior reverts inside Vault V2 / the Felix adapter
       (allocation underflow on the last unit), so senior cannot be emptied here and the path was not reached.
       It stays a code-level finding: `paid * PRICE_UNIT / supply` with supply == 0 is a division-by-zero panic. */
    function test_L3_seniorCannotBeEmptiedOnThisFork() public {
        _seniorDeposit(alice, 100_000e6);
        vm.warp(block.timestamp + 7 days);
        junior.settle();
        uint256 feeShares = senior.balanceOf(address(junior));
        vm.prank(agent);
        junior.execute(
            address(senior),
            abi.encodeWithSignature("redeem(uint256,address,address)", feeShares, address(junior), address(junior))
        );
        vm.prank(alice);
        try senior.redeem(senior.balanceOf(alice), alice, alice) {}
        catch {
            // Vault V2 / Felix adapter rounding reverts the very last redeem on some fork states; not a junior bug
            console2.log("last senior redeem reverted inside Vault V2 on this fork state; path not reachable here");
            return;
        }
        assertEq(senior.totalSupply(), 0);
        console2.log("senior residual total assets", senior.totalAssets());
        console2.log("senior price now            ", senior.convertToAssets(1e24));
        console2.log("junior baseline             ", junior.seniorPriceBase());
        vm.warp(block.timestamp + 7 days);
        if (senior.convertToAssets(1e24) < junior.seniorPriceBase()) {
            vm.expectRevert(); // panic 0x12 division by zero at JuniorVault.sol:275
            junior.settle();
            console2.log("settle reverted with senior empty");
        } else {
            junior.settle();
            console2.log("residual dust kept price above baseline; 0/0 path not hit this run");
        }
    }

    /* L-1: FeeRouter parked amounts are only netted for the current recipients. */
    function test_L1_feeRouterOwedDoubleCountAfterRecipientChange() public {
        FailingToken ft = new FailingToken();
        RejectingRecipient rr = new RejectingRecipient();
        vm.prank(owner);
        FeeRouter r2 = new FeeRouter(IERC20(address(ft)), owner, address(senior), address(rr), treasury);
        ft.mint(address(r2), 1_000e6);
        ft.setReject(address(rr), true);
        vm.prank(owner);
        r2.distribute();
        assertEq(r2.owed(address(rr), address(ft)), 250e6);
        // owner points junior elsewhere; the 250 parked for rr is now treated as free balance
        vm.prank(owner);
        r2.setRecipients(address(senior), bob, treasury);
        ft.mint(address(r2), 1_000e6);
        vm.prank(owner);
        r2.distribute();
        assertEq(ft.balanceOf(address(r2)), 250e6); // FIXED: parked total is tracked across recipient changes
        ft.setReject(address(rr), false);
        r2.pullOwed(address(rr), address(ft));
        assertEq(ft.balanceOf(address(rr)), 250e6);
    }

    /* L-2: addVault has no removal; a bad entry bricks totalAssets, deposit and settle permanently. */
    function test_L2_addVaultSelfBricksValuation() public {
        _juniorDeposit(alice, 1_000e6);
        vm.prank(owner);
        vm.expectRevert(JuniorVault.WrongAsset.selector);
        junior.addVault(address(junior)); // FIXED: rejected
        // a venue that starts reverting: display still works, settle and deposit refuse rather than freeze a wrong price
        vm.mockCallRevert(FELIX_USDC_V1, abi.encodeWithSignature("balanceOf(address)", address(junior)), "down");
        assertEq(junior.totalAssets(), 1_001e6);
        vm.warp(block.timestamp + 7 days);
        vm.expectRevert(JuniorVault.VenueBroken.selector);
        junior.settle();
        // the owner drops it without calling it, then everything runs again
        uint256 idx = junior.vaults(0) == FELIX_USDC_V1 ? 0 : 1;
        vm.prank(owner);
        junior.forceRemoveVault(idx);
        junior.settle();
        vm.clearMockedCalls();
        assertEq(junior.vaultsLength(), 1);
    }

    /* Verified fine: agent cannot reach approve on a non-allowlisted spender via any target, cannot call with the
       asset as target, cannot pass a receiver other than the vault, and a Morpho callback path reverts. */
    function test_OK_agentContainment() public {
        _juniorDeposit(alice, 10_000e6);
        vm.startPrank(agent);
        // approve on senior shares to bob: approvals mapping empty
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.execute(address(senior), abi.encodeCall(IERC20.approve, (bob, 1)));
        // supply with callback data: junior does not implement onMorphoSupply
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (address(MORPHO), 1e6)));
        vm.expectRevert();
        junior.execute(address(MORPHO), abi.encodeCall(IMorphoBase.supply, (mpKhype, 1e6, 0, address(junior), hex"01")));
        // short calldata on a receiver-checked rule
        vm.expectRevert(JuniorVault.BadReceiver.selector);
        junior.execute(FELIX_USDC_V1, abi.encodePacked(bytes4(keccak256("deposit(uint256,address)")), uint256(1)));
        vm.stopPrank();
    }
}

contract RejectingRecipient {}

contract FailingToken is ERC20 {
    mapping(address => bool) public reject;

    constructor() ERC20("F", "F") {}

    function mint(address to, uint256 a) external {
        _mint(to, a);
    }

    function setReject(address who, bool r) external {
        reject[who] = r;
    }

    function transfer(address to, uint256 a) public override returns (bool) {
        if (reject[to]) return false;
        return super.transfer(to, a);
    }
}
