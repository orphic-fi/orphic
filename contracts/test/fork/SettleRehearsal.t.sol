// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {JuniorVault} from "../../src/JuniorVault.sol";

interface IERC20 { function balanceOf(address) external view returns (uint256); function transfer(address, uint256) external returns (bool); }
interface IERC4626 is IERC20 { function convertToAssets(uint256) external view returns (uint256); function withdraw(uint256, address, address) external returns (uint256); }
interface ISenior { function accrueInterest() external; function totalAssets() external view returns (uint256); function balanceOf(address) external view returns (uint256); function convertToAssets(uint256) external view returns (uint256); }

/// Rehearsal of the first live settle against mainnet state (forge --fork-url). Reproduces exactly what the keeper does
/// on the settle tick: accrueInterest on senior, recall junior's Felix position, settle, then read back.
contract SettleRehearsal is Test {
    JuniorVault constant junior = JuniorVault(0x20D5F4f78858D257eA047EB5F47773E361697F2E);
    ISenior constant senior = ISenior(0x3F7382bd8BFC6C548CAa2D7B4dfCe628B12A9759);
    IERC4626 constant felix = IERC4626(0x8A862fD6c12f9ad34C9c2ff45AB2b6712e8CEa27);
    IERC20 constant usdc = IERC20(0xb88339CB7199b77E23DB6E890353E22632Ba630f);
    address constant agent = 0xC772F0ea992236dA71Fa30b8899D71B680866956;

    function test_firstSettle() external {
        uint256 last = junior.lastSettle();
        uint256 t = last + 7 days + 5 minutes;
        vm.warp(t);
        console2.log("settle at (unix)", t);
        uint256 supply = junior.totalSupply();
        uint256 navBefore = junior.totalAssets();
        uint256 pending = junior.pendingExitShares();
        console2.log("before: nav", navBefore, "supply", supply);
        console2.log("before: pendingExitShares", pending, "idle", usdc.balanceOf(address(junior)));

        // 1. senior.accrueInterest: mints junior's management-fee shares (permissionless)
        senior.accrueInterest();
        uint256 feeShares = senior.balanceOf(address(junior));
        console2.log("senior fee shares minted to junior", feeShares, "worth USDC", senior.convertToAssets(feeShares));

        // 2. recall from Felix through junior.execute (agent only)
        uint256 shares = felix.balanceOf(address(junior));
        uint256 assets = felix.convertToAssets(shares);
        vm.prank(agent);
        junior.execute(address(felix), abi.encodeCall(IERC4626.withdraw, (assets, address(junior), address(junior))));
        console2.log("recalled from Felix", assets, "idle now", usdc.balanceOf(address(junior)));

        // 3. settle (permissionless)
        junior.settle();
        uint256 pps = junior.pricePerShare();
        console2.log("after: pricePerShare (1e18)", pps);
        console2.log("after: lastSettle", junior.lastSettle(), "settles", junior.settlesLength());
        console2.log("after: pendingExit", junior.pendingExitShares(), "pricedExit", junior.pricedExitShares());
        console2.log("after: reservedAssets", junior.reservedAssets(), "nav", junior.totalAssets());

        assertEq(junior.lastSettle(), t, "lastSettle moved to now");
        assertGt(pps, 1e18, "price per share rose above 1.0000");
        // The dust exit's notice ends 16 Nov 00:00 UTC, after this settle, so it stays pending until the next one.
        assertEq(junior.pendingExitShares(), pending, "exit not yet matured stays pending");
        assertEq(junior.pricedExitShares(), 0, "nothing priced yet");

        // 4. too soon to settle again
        vm.expectRevert(JuniorVault.TooSoon.selector);
        junior.settle();

        // 5. a week later: the matured exit is priced at this settle and can be claimed
        vm.warp(t + 7 days);
        senior.accrueInterest();
        junior.settle();
        console2.log("second settle: pps", junior.pricePerShare(), "priced", junior.pricedExitShares());
        console2.log("second settle: reserved", junior.reservedAssets(), "pending", junior.pendingExitShares());
        assertEq(junior.pendingExitShares(), 0, "matured exit priced");
        assertEq(junior.pricedExitShares(), pending, "priced exit shares equal the matured notice");
        // The live exit is 1e6 share-wei (0.000000000001 ojUSDC), so what it is owed rounds to 0 USDC; the mechanics
        // are what this checks, the amount is dust by construction.
        assertEq(junior.reservedAssets(), (pending * junior.pricePerShare()) / 1e18 / 1e12, "reserved equals what the priced exit is owed");
        address exiter = 0x2DBE1Ba83084dAF698Acea79CBAfe0493f42FecC;
        uint256 balBefore = usdc.balanceOf(exiter);
        vm.prank(exiter);
        junior.claimExit();
        console2.log("exit claimed USDC", usdc.balanceOf(exiter) - balBefore);
        (uint256 sharesLeft,,) = junior.exitOf(exiter);
        assertEq(sharesLeft, 0, "exit request cleared after claim");
    }
}
