// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IOracle} from "morpho-blue/interfaces/IOracle.sol";
import {FeeRouter} from "../src/FeeRouter.sol";

/// @notice Audit fixes 3/8 (FeeRouter): F1 parked netting, F2 seeded price band + measured cap, F6(a) permissionless
///         distribute. Standalone (mock tokens, no fork): FeeRouter only needs an ERC20 as `usdc`.

/// @dev 6-decimal token whose transfer to a chosen address returns false (a blocklist), like a real issuer token.
contract FxToken is ERC20 {
    mapping(address => bool) public reject;

    constructor() ERC20("T", "T") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

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

/// @dev Honest router: pulls `amountIn` of `token`, pays `usdcOut` from its own USDC.
contract FxDex {
    function swap(address token, uint256 amountIn, address usdc, uint256 usdcOut) external {
        IERC20(token).transferFrom(msg.sender, address(this), amountIn);
        IERC20(usdc).transfer(msg.sender, usdcOut);
    }
}

/// @dev Morpho-style oracle with a settable price (raw USDC per raw token unit, 1e36).
contract FxOracle {
    uint256 public price;

    constructor(uint256 p) {
        price = p;
    }

    function set(uint256 p) external {
        price = p;
    }
}

contract FeeRouterFixesTest is Test {
    FxToken usdc;
    FxToken tok;
    FxDex dex;
    FeeRouter r;
    address owner = address(0xA11CE);
    address senior = address(0x5E);
    address junior = address(0x1E);
    address treasury = address(0x7E);
    address BURN = 0x000000000000000000000000000000000000dEaD;

    function setUp() public virtual {
        usdc = new FxToken();
        tok = new FxToken();
        dex = new FxDex();
        r = new FeeRouter(IERC20(address(usdc)), owner, senior, junior, treasury);
        usdc.mint(address(dex), 10_000_000e6);
    }

    function _swapData(uint256 amountIn, uint256 out) internal view returns (bytes memory) {
        return abi.encodeCall(FxDex.swap, (address(tok), amountIn, address(usdc), out));
    }

    /* F1 ------------------------------------------------------------------------------------------------ */

    /// (a)(b) a refusing treasury parks; a later sweepBurn works on the unparked part only, pullOwed pays the rest.
    function test_FIXED_F1_sweepBurnLeavesTheParkedAmountAndPullOwedPaysIt() public {
        vm.prank(owner);
        r.setBurn(address(tok), 5000);
        tok.setReject(treasury, true);
        tok.mint(address(r), 1_000e6);
        vm.prank(owner);
        r.sweepBurn(address(tok)); // 500 burned, 500 parked for the treasury
        assertEq(tok.balanceOf(BURN), 500e6);
        assertEq(r.owed(treasury, address(tok)), 500e6);
        tok.mint(address(r), 500e6); // more fees arrive: balance 1,000 of which 500 parked
        vm.prank(owner);
        r.sweepBurn(address(tok)); // works on 500 only: 250 burned, 250 parked
        assertEq(tok.balanceOf(BURN), 750e6, "burned only the unparked share");
        assertEq(r.owed(treasury, address(tok)), 750e6);
        assertEq(tok.balanceOf(address(r)), 750e6);
        assertEq(r.totalParked(address(tok)), 750e6);
        tok.setReject(treasury, false);
        r.pullOwed(treasury, address(tok));
        assertEq(tok.balanceOf(treasury), 750e6, "pullOwed pays what was parked");
        assertEq(tok.balanceOf(address(r)), 0);
        vm.expectRevert(FeeRouter.NothingToDo.selector);
        r.pullOwed(treasury, address(tok)); // once
    }

    /// the same with a refusing burn address, and the recipient accepting before the second sweepBurn
    function test_FIXED_F1_refusingBurnAddressParksAndSecondSweepBurnKeepsIt() public {
        vm.prank(owner);
        r.setBurn(address(tok), 5000);
        tok.setReject(BURN, true);
        tok.mint(address(r), 1_000e6);
        vm.prank(owner);
        r.sweepBurn(address(tok)); // treasury 500 paid, burn 500 parked
        assertEq(r.owed(BURN, address(tok)), 500e6);
        tok.mint(address(r), 500e6);
        tok.setReject(BURN, false);
        vm.prank(owner);
        r.sweepBurn(address(tok)); // 500 unparked: 250 burned, 250 to treasury
        assertEq(tok.balanceOf(BURN), 250e6);
        assertEq(tok.balanceOf(treasury), 750e6);
        r.pullOwed(BURN, address(tok));
        assertEq(tok.balanceOf(BURN), 750e6);
        assertEq(tok.balanceOf(address(r)), 0);
    }

    function test_FIXED_F1_sweepBurnWithOnlyParkedBalanceIsNothingToDo() public {
        vm.prank(owner);
        r.setBurn(address(tok), 5000);
        tok.setReject(treasury, true);
        tok.setReject(BURN, true);
        tok.mint(address(r), 1_000e6);
        vm.prank(owner);
        r.sweepBurn(address(tok)); // everything parked
        assertEq(tok.balanceOf(address(r)), r.totalParked(address(tok)));
        vm.prank(owner);
        vm.expectRevert(FeeRouter.NothingToDo.selector);
        r.sweepBurn(address(tok));
    }

    /// (c) a burn token turned into a swap token cannot sell its parked balance
    function test_FIXED_F1_aBurnTokenTurnedSwapTokenCannotSellItsParkedBalance() public {
        vm.startPrank(owner);
        r.setBurn(address(tok), 5000);
        tok.setReject(treasury, true);
        tok.mint(address(r), 1_000e6);
        r.sweepBurn(address(tok)); // 500 parked for the treasury
        r.setBurn(address(tok), 0);
        r.setRouter(address(dex), true);
        r.setFloor(address(tok), IOracle(address(new FxOracle(1e36))), 100); // $1
        vm.stopPrank();
        // the whole 500 on hand is parked: nothing to sell
        vm.prank(owner);
        vm.expectRevert(FeeRouter.NothingToDo.selector);
        r.sweep(address(tok), address(dex), _swapData(500e6, 500e6), 500e6);
        // 300 of fresh fees: only those 300 are sellable
        tok.mint(address(r), 300e6);
        vm.prank(owner);
        vm.expectRevert(FeeRouter.NothingToDo.selector);
        r.sweep(address(tok), address(dex), _swapData(301e6, 301e6), 301e6);
        vm.prank(owner);
        r.sweep(address(tok), address(dex), _swapData(300e6, 300e6), 300e6);
        assertEq(r.owed(treasury, address(tok)), 500e6, "parked amount untouched");
        assertEq(tok.balanceOf(address(r)), 500e6);
        assertEq(usdc.balanceOf(senior), 150e6); // 50 / 25 / 25 of the 300 sold
        tok.setReject(treasury, false);
        r.pullOwed(treasury, address(tok));
        assertEq(tok.balanceOf(treasury), 500e6, "pullOwed still pays in full");
    }

    /// USDC netting (REVIEW L-1) is unchanged
    function test_HOLD_F1_usdcParkedNettingUnchanged() public {
        usdc.setReject(junior, true);
        usdc.mint(address(r), 1_000e6);
        vm.prank(owner);
        r.distribute(); // junior's 250 parked
        assertEq(r.owed(junior, address(usdc)), 250e6);
        usdc.mint(address(r), 400e6);
        vm.prank(owner);
        r.distribute(); // splits 400 only
        assertEq(usdc.balanceOf(senior), 700e6);
        assertEq(usdc.balanceOf(treasury), 350e6);
        assertEq(r.owed(junior, address(usdc)), 350e6);
        usdc.setReject(junior, false);
        r.pullOwed(junior, address(usdc));
        assertEq(usdc.balanceOf(junior), 350e6);
        assertEq(usdc.balanceOf(address(r)), 0);
    }
}
