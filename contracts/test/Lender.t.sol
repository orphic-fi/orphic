// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Base} from "./Base.t.sol";
import {JuniorVault} from "../src/JuniorVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice HyperLend (Aave v3 fork) as a junior venue, on the HyperEVM fork: the real pool and the real aUSDC.
contract LenderTest is Base {
    address constant HYPERLEND_POOL = 0x00A89d7a5A02160f20150EbEA7a2b5E4879A1A8b;
    address constant HYPERLEND_AUSDC = 0x744E4f26ee30213989216E1632D9BE3547C4885b;

    bytes4 constant SUPPLY = bytes4(keccak256("supply(address,uint256,address,uint16)"));
    bytes4 constant WITHDRAW = bytes4(keccak256("withdraw(address,uint256,address)"));

    function setUp() public override {
        super.setUp();
        vm.startPrank(owner);
        junior.addLender(HYPERLEND_POOL, HYPERLEND_AUSDC);
        // supply(asset, amount, onBehalfOf, referralCode): onBehalfOf is word 2 -> offset 64
        junior.setRule(HYPERLEND_POOL, SUPPLY, true, 64);
        // withdraw(asset, amount, to): to is word 2 -> offset 64
        junior.setRule(HYPERLEND_POOL, WITHDRAW, true, 64);
        junior.setApprovalRule(address(USDC), HYPERLEND_POOL, true);
        vm.stopPrank();
        vm.prank(alice);
        USDC.approve(address(junior), type(uint256).max);
        vm.prank(alice);
        junior.deposit(10_000e6, alice);
    }

    function _supply(uint256 amount) internal {
        vm.startPrank(agent);
        junior.execute(address(USDC), abi.encodeWithSelector(IERC20.approve.selector, HYPERLEND_POOL, amount));
        junior.execute(
            HYPERLEND_POOL, abi.encodeWithSelector(SUPPLY, address(USDC), amount, address(junior), uint16(0))
        );
        vm.stopPrank();
    }

    function test_addLender_bindsATokenToPoolAndAsset() public view {
        assertEq(junior.lendersLength(), 1);
        assertTrue(junior.isLender(HYPERLEND_POOL));
        assertEq(junior.lenderAToken(HYPERLEND_POOL), HYPERLEND_AUSDC);
    }

    function test_addLender_rejectsMismatch() public {
        vm.startPrank(owner);
        // aToken that names a different pool: Felix is not an aToken, its views revert
        vm.expectRevert();
        junior.addLender(FELIX_USDC_V1, HYPERLEND_AUSDC);
        vm.expectRevert(JuniorVault.AlreadySet.selector);
        junior.addLender(HYPERLEND_POOL, HYPERLEND_AUSDC);
        vm.stopPrank();
    }

    function test_supplyCountsInNavAndEarns() public {
        uint256 navBefore = junior.totalAssets();
        _supply(5_000e6);
        uint256 held = IERC20(HYPERLEND_AUSDC).balanceOf(address(junior));
        assertApproxEqAbs(held, 5_000e6, 2, "aUSDC is 1:1 with USDC supplied");
        assertApproxEqAbs(junior.totalAssets(), navBefore, 2, "supplying moves value, it does not change NAV");
        assertApproxEqAbs(junior.lenderAssets(0), held, 0);

        vm.warp(block.timestamp + 30 days);
        vm.roll(block.number + 1);
        assertGt(IERC20(HYPERLEND_AUSDC).balanceOf(address(junior)), held, "aUSDC grows in place");
        assertGt(junior.totalAssets(), navBefore, "NAV picks the interest up");
    }

    function test_withdrawComesBackToJunior() public {
        uint256 before = USDC.balanceOf(address(junior));
        _supply(5_000e6);
        vm.prank(agent);
        junior.execute(
            HYPERLEND_POOL, abi.encodeWithSelector(WITHDRAW, address(USDC), type(uint256).max, address(junior))
        );
        assertEq(IERC20(HYPERLEND_AUSDC).balanceOf(address(junior)), 0);
        assertApproxEqAbs(USDC.balanceOf(address(junior)), before, 2);
    }

    function test_withdrawToAnyoneElseReverts() public {
        _supply(5_000e6);
        vm.prank(agent);
        vm.expectRevert(JuniorVault.BadReceiver.selector);
        junior.execute(HYPERLEND_POOL, abi.encodeWithSelector(WITHDRAW, address(USDC), 1e6, bob));
    }

    function test_supplyOnBehalfOfAnyoneElseReverts() public {
        vm.startPrank(agent);
        junior.execute(address(USDC), abi.encodeWithSelector(IERC20.approve.selector, HYPERLEND_POOL, 1e6));
        vm.expectRevert(JuniorVault.BadReceiver.selector);
        junior.execute(HYPERLEND_POOL, abi.encodeWithSelector(SUPPLY, address(USDC), 1e6, bob, uint16(0)));
        vm.stopPrank();
    }

    function test_aTokenIsNeverAVenue() public {
        vm.prank(owner);
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.setRule(HYPERLEND_AUSDC, bytes4(keccak256("anything()")), true, type(uint256).max);
        vm.prank(owner);
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.setRule(HYPERLEND_POOL, IERC20.transfer.selector, true, type(uint256).max);
        // and the agent cannot call an unlisted selector on the pool
        vm.prank(agent);
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.execute(
            HYPERLEND_POOL,
            abi.encodeWithSelector(
                bytes4(keccak256("borrow(address,uint256,uint256,uint16,address)")),
                address(USDC),
                1e6,
                2,
                0,
                address(junior)
            )
        );
    }

    function test_removeLenderOnlyWhenEmpty() public {
        _supply(1_000e6);
        vm.prank(owner);
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.removeLender(0);
        vm.prank(agent);
        junior.execute(
            HYPERLEND_POOL, abi.encodeWithSelector(WITHDRAW, address(USDC), type(uint256).max, address(junior))
        );
        vm.prank(owner);
        junior.removeLender(0);
        assertEq(junior.lendersLength(), 0);
        assertFalse(junior.isLender(HYPERLEND_POOL));
        // removed venue dies at once for the agent
        vm.prank(agent);
        vm.expectRevert(JuniorVault.NotAllowed.selector);
        junior.execute(address(USDC), abi.encodeWithSelector(IERC20.approve.selector, HYPERLEND_POOL, 1e6));
    }

    function test_settleWithLenderPosition() public {
        _supply(5_000e6);
        vm.warp(junior.lastSettle() + 7 days);
        vm.roll(block.number + 1);
        junior.settle();
        assertGt(junior.pricePerShare(), 1e18 - 1, "price holds with part of the book in HyperLend");
    }
}
