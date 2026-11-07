// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./Base.t.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

/// How fast does a USDC transfer into the senior Vault V2 show up in its share price, with maxRate = 200% APR?
/// And is junior's cover payment counted as vault assets at all?
contract RecognitionTest is Base {
    function _price() internal view returns (uint256) {
        return senior.convertToAssets(1e24); // USDC units per 1e24 shares
    }

    /// Confirms asset.balanceOf(vault) is in realAssets: a bare transfer raises totalAssets, bounded by maxRate.
    function test_transferIntoVaultIsCountedAndRateLimited() public {
        _seniorDeposit(alice, 100_000e6);
        uint256 p0 = _price();
        uint256 t0 = senior.totalAssets();
        // 2% donation, the shape of a cover payment
        deal(address(USDC), bob, 2_000e6);
        vm.prank(bob);
        USDC.transfer(address(senior), 2_000e6);
        assertEq(USDC.balanceOf(address(senior)), 2_000e6);
        // same second: nothing recognised yet (elapsed 0 means maxTotalAssets == _totalAssets)
        assertApproxEqAbs(senior.totalAssets(), t0, 1);
        uint256[6] memory hours_ = [uint256(1), 6, 24, 48, 72, 96];
        uint256 start = block.timestamp;
        for (uint256 i = 0; i < hours_.length; i++) {
            vm.warp(start + hours_[i] * 1 hours);
            senior.accrueInterest();
            uint256 recognised = senior.totalAssets() - t0; // includes Felix yield on 100k, small
            console2.log("hours", hours_[i], "recognised USDC (6dp)", recognised);
        }
        assertGt(_price(), p0);
        // at 200% APR the cap is 0.548% a day of total assets, so 2% needs about 3.65 days
        vm.warp(start + 96 hours);
        senior.accrueInterest();
        assertApproxEqRel(senior.totalAssets(), t0 + 2_000e6 + 100e6, 0.01e18); // plus about 4 days of Felix yield
    }

    /// Loss then cover: senior's price drops at once, recovers over about 3.7 days at 2%.
    function test_coverIsRecognisedOverDays() public {
        _seniorDeposit(alice, 100_000e6);
        _juniorDeposit(bob, 20_000e6);
        junior.syncSenior(); // keeper does this hourly: new senior shares become covered
        uint256 pStart = _price();
        // 2% loss in Felix
        uint256 adapterShares = IERC4626(FELIX_USDC_V1).balanceOf(felixAdapter);
        deal(FELIX_USDC_V1, felixAdapter, adapterShares - IERC4626(FELIX_USDC_V1).convertToShares(2_000e6), true);
        vm.warp(block.timestamp + 7 days);
        senior.accrueInterest();
        uint256 pLoss = _price();
        assertLt(pLoss, pStart);
        junior.settle(); // pays cover
        uint256 paid = USDC.balanceOf(address(senior));
        console2.log("cover paid (6dp)", paid);
        uint256 tCover = block.timestamp;
        uint256[5] memory days_ = [uint256(0), 1, 2, 3, 4];
        for (uint256 i = 0; i < days_.length; i++) {
            vm.warp(tCover + days_[i] * 1 days);
            senior.accrueInterest();
            uint256 p = _price();
            // percent of the gap closed, in bps
            uint256 closed = p >= pStart ? 10_000 : (p - pLoss) * 10_000 / (pStart - pLoss);
            console2.log("days after cover", days_[i], "gap closed bps", closed);
        }
        assertGe(_price(), pStart * 9_990 / 10_000); // whole again within 4 days, within 0.1%
    }
}
