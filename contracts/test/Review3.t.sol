// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Base, IERC20, IVaultV2} from "./Base.t.sol";
import {console2} from "forge-std/Test.sol";
import {Id} from "morpho-blue/interfaces/IMorpho.sol";
import {MorphoStorageLib} from "morpho-blue/libraries/periphery/MorphoStorageLib.sol";
import {MorphoBalancesLib} from "morpho-blue/libraries/periphery/MorphoBalancesLib.sol";
import {IMorpho} from "morpho-blue/interfaces/IMorpho.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {JuniorVault} from "../src/JuniorVault.sol";
import {SeniorShareGate} from "../src/SeniorShareGate.sol";

interface IAdapterView {
    function realAssets() external view returns (uint256);
}

interface IFelixV1 {
    function lostAssets() external view returns (uint256);
}

interface IFelixQueue {
    function withdrawQueue(uint256) external view returns (Id);
}

/// @notice Finn's review of 11 Nov 2026 (orphic-security-review.md): H-1, H-2, H-3, M-1, M-4 reproduced on a
///         HyperEVM fork, each failing on the old behaviour and passing with the fix.
contract Review3Test is Base {
    using MorphoBalancesLib for IMorpho;

    uint256 constant PRICE_UNIT = 1e24;

    /// The public RPC serves latest state for any block, so the fork's clock trails the markets' lastUpdate; move
    /// the clock past it before touching Felix.
    function setUp() public override {
        super.setUp();
        vm.warp(block.timestamp + 30 days);
    }

    function _seniorLoss(uint256 usdc) internal {
        // shrink the Felix adapter's shares: what a bad-debt event in a senior market does to real assets
        uint256 shares = IERC4626(FELIX_USDC_V1).balanceOf(felixAdapter);
        deal(FELIX_USDC_V1, felixAdapter, shares - IERC4626(FELIX_USDC_V1).convertToShares(usdc), true);
    }

    /* H-1: a partial cover keeps the unpaid part owed, and the next settle bills it */
    function test_h1_partialCoverIsBilledAgain() public {
        _seniorDeposit(alice, 80_000e6);
        _juniorDeposit(bob, 3_500e6);
        junior.syncSenior();
        // junior's agent parks most of its idle in Felix, leaving 500 idle
        vm.startPrank(agent);
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (FELIX_USDC_V1, 3_000e6)));
        junior.execute(FELIX_USDC_V1, abi.encodeCall(IERC4626.deposit, (3_000e6, address(junior))));
        vm.stopPrank();
        _seniorLoss(2_000e6); // 2.5% of senior
        vm.warp(block.timestamp + 7 days);
        junior.settle();
        uint256 paid1 = USDC.balanceOf(address(senior));
        console2.log("paid1", paid1, "pending", junior.coverPending());
        console2.log("junior idle after", USDC.balanceOf(address(junior)), "felix pos", IERC4626(FELIX_USDC_V1).convertToAssets(IERC4626(FELIX_USDC_V1).balanceOf(address(junior))));
        assertApproxEqAbs(paid1, 500e6, 5e6, "first settle pays all of idle");
        uint256 left = junior.coverPending();
        assertGt(left, 1_000e6, "the rest stays owed");
        assertLe(paid1 + left, 2_000e6, "paid plus owed never exceeds the loss");
        assertGt(paid1 + left, 1_400e6, "and is the loss less a week of senior yield");
        // keeper recalls Felix to idle before the next settle, which then pays the remainder
        vm.startPrank(agent);
        junior.execute(FELIX_USDC_V1, abi.encodeCall(IERC4626.redeem, (IERC4626(FELIX_USDC_V1).balanceOf(address(junior)), address(junior), address(junior))));
        vm.stopPrank();
        vm.warp(block.timestamp + 7 days);
        junior.settle();
        uint256 paid2 = USDC.balanceOf(address(senior)) - paid1;
        assertGt(paid2, left / 2, "the second settle pays what was left, less a week of senior yield");
        assertLe(paid2, left, "and never more");
        assertEq(junior.coverPending(), 0, "nothing left owed");
    }

    /* H-3: Felix bad debt booked as lostAssets reaches junior's cover */
    function test_h3_felixLostAssetsLowerSeniorRealPrice() public {
        _seniorDeposit(alice, 80_000e6);
        _juniorDeposit(bob, 20_000e6);
        junior.syncSenior();
        assertEq(junior.coverPending(), 0);
        uint256 realBefore = IAdapterView(felixAdapter).realAssets();
        // Bad debt in Felix's first market: its supply position there reads 20% smaller. Felix then books the gap as
        // lostAssets and keeps its share price flat, which is what the review measured on a real liquidation.
        Id id = IFelixQueue(FELIX_USDC_V1).withdrawQueue(0);
        uint256 positionAssets = MORPHO.expectedSupplyAssets(MORPHO.idToMarketParams(id), FELIX_USDC_V1);
        bytes32[] memory slots = new bytes32[](1);
        slots[0] = MorphoStorageLib.positionSupplySharesSlot(id, FELIX_USDC_V1);
        bytes32[] memory shrunk = new bytes32[](1);
        shrunk[0] = bytes32(uint256(MORPHO.extSloads(slots)[0]) * 4 / 5);
        vm.mockCall(address(MORPHO), abi.encodeCall(MORPHO.extSloads, (slots)), abi.encode(shrunk));
        vm.startPrank(alice);
        USDC.approve(FELIX_USDC_V1, 1e6);
        IERC4626(FELIX_USDC_V1).deposit(1e6, alice); // any interaction makes Felix accrue and book the loss
        vm.stopPrank();
        uint256 lost = IFelixV1(FELIX_USDC_V1).lostAssets();
        assertApproxEqRel(lost, positionAssets / 5, 0.01e18, "Felix booked the deficit as lostAssets");
        assertApproxEqRel(IAdapterView(felixAdapter).realAssets(), realBefore, 0.001e18, "and its share price did not move");
        uint256 seniorShare = IERC4626(FELIX_USDC_V1).balanceOf(felixAdapter) * 1e18 / IERC4626(FELIX_USDC_V1).totalSupply();
        uint256 expectedShortfall = lost * seniorShare / 1e18;
        assertApproxEqRel(junior.coverPending(), expectedShortfall, 0.02e18, "senior's share of the deficit is owed by junior");
        vm.warp(block.timestamp + 7 days);
        junior.settle();
        assertApproxEqRel(USDC.balanceOf(address(senior)), expectedShortfall, 0.1e18, "junior paid it");
    }

    /* H-2 and M-1: the senior gate refuses new receivers while a cover is pending or unrecognised */
    function test_h2_m1_gateBlocksNewSeniorSharesWhileLossIsOpen() public {
        SeniorShareGate gate = new SeniorShareGate(address(junior));
        vm.startPrank(owner);
        _curate(abi.encodeCall(IVaultV2.setReceiveSharesGate, (address(gate))));
        vm.stopPrank();
        _seniorDeposit(alice, 80_000e6); // allowed: nothing pending
        _juniorDeposit(bob, 20_000e6);
        junior.syncSenior();
        _seniorLoss(1_000e6);
        assertGt(junior.coverPending(), 0);
        // the exit-then-buy and the deposit-in-the-cover-block both need to receive senior shares now: refused
        vm.startPrank(alice);
        USDC.approve(address(senior), 10_000e6);
        vm.expectRevert();
        senior.deposit(10_000e6, alice);
        vm.expectRevert();
        senior.transfer(bob, 1e18);
        vm.stopPrank();
        // withdrawing is still open
        vm.prank(alice);
        senior.withdraw(1_000e6, alice, alice);
        // settle covers; fee shares to junior minted fine through the gate
        vm.warp(block.timestamp + 7 days);
        junior.settle();
        assertEq(junior.coverPending(), 0);
        // once senior's smoothed price has recognised the cover, deposits reopen
        vm.warp(block.timestamp + 2 days);
        senior.accrueInterest();
        if (junior.coverInProgress() == 0) {
            vm.startPrank(alice);
            senior.deposit(10_000e6, alice);
            vm.stopPrank();
        }
    }

    /* M-4: a venue loss after exits were priced is shared pro rata, and deposits wait */
    function test_m4_proRataClaimsAndNoDepositsWhileShort() public {
        _seniorDeposit(alice, 10_000e6);
        uint256 sharesA = _juniorDeposit(alice, 3_000e6);
        uint256 sharesB = _juniorDeposit(bob, 3_000e6);
        vm.prank(alice);
        junior.requestExit(sharesA);
        vm.prank(bob);
        junior.requestExit(sharesB);
        vm.warp(block.timestamp + 8 days);
        junior.settle(); // both exits priced; reserve is nearly the whole vault
        uint256 reserved = junior.reservedAssets();
        // a venue loss after pricing: burn 20% of junior's idle (what a loss on a position would do)
        uint256 bal = USDC.balanceOf(address(junior));
        deal(address(USDC), address(junior), bal - bal / 5);
        assertLt(USDC.balanceOf(address(junior)), reserved, "short of the reserve");
        // deposits refuse to fill the gap
        vm.startPrank(bob);
        USDC.approve(address(junior), 500e6);
        vm.expectRevert(JuniorVault.Underwater.selector);
        junior.deposit(500e6, bob);
        vm.stopPrank();
        // the keeper recalls junior's senior fee shares so everything junior holds is idle
        vm.startPrank(agent);
        junior.execute(address(senior), abi.encodeCall(IERC4626.redeem, (senior.balanceOf(address(junior)), address(junior), address(junior))));
        vm.stopPrank();
        // each claimant takes about the same haircut
        uint256 a0 = USDC.balanceOf(alice);
        vm.prank(alice);
        junior.claimExit();
        uint256 gotA = USDC.balanceOf(alice) - a0;
        uint256 b0 = USDC.balanceOf(bob);
        vm.prank(bob);
        junior.claimExit();
        uint256 gotB = USDC.balanceOf(bob) - b0;
        assertApproxEqRel(gotA, gotB, 0.01e18, "same haircut for both");
        assertApproxEqRel(gotA, 3_000e6 * 4 / 5, 0.02e18, "about 80% each");
    }
}
