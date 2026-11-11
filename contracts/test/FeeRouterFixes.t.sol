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

/// @dev Constant-product pool (no fee) that is BOTH the swap router and the price oracle (spot, 1e36 scale): the
///      owner's misconfiguration the band must defeat. `swapTokenForUsdc` is what the router calls; `sell`/`buy`
///      are an outsider's front and back run.
contract FxPool {
    IERC20 immutable tok;
    IERC20 immutable usd;
    uint256 public rT;
    uint256 public rU;

    constructor(IERC20 t, IERC20 u) {
        tok = t;
        usd = u;
    }

    function init(uint256 t, uint256 u) external {
        rT = t;
        rU = u;
    }

    function price() external view returns (uint256) {
        return rU * 1e36 / rT;
    }

    function swapTokenForUsdc(uint256 tIn) public returns (uint256 out) {
        tok.transferFrom(msg.sender, address(this), tIn);
        out = rU * tIn / (rT + tIn);
        rT += tIn;
        rU -= out;
        usd.transfer(msg.sender, out);
    }

    function buyExactToken(uint256 tOut) external returns (uint256 cost) {
        cost = rU * tOut / (rT - tOut) + 1;
        usd.transferFrom(msg.sender, address(this), cost);
        rU += cost;
        rT -= tOut;
        tok.transfer(msg.sender, tOut);
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
        r.seedPrice(address(tok), 1e36);
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

    /* F2 ------------------------------------------------------------------------------------------------ */

    function _configure(uint256 oraclePrice, uint256 seed) internal returns (FxOracle o) {
        o = new FxOracle(oraclePrice);
        vm.startPrank(owner);
        r.setRouter(address(dex), true);
        r.setFloor(address(tok), IOracle(address(o)), 100); // 1% slippage
        if (seed != 0) r.seedPrice(address(tok), seed);
        vm.stopPrank();
    }

    function _sweep(uint256 amountIn, uint256 out) internal {
        vm.prank(owner);
        r.sweep(address(tok), address(dex), _swapData(amountIn, out), amountIn);
    }

    function _expectBand(uint256 price, uint256 last) internal {
        vm.expectRevert(abi.encodeWithSelector(FeeRouter.PriceOutsideBand.selector, price, last));
    }

    /// (d) unseeded refuses
    function test_FIXED_F2_anUnseededTokenRefusesToSweep() public {
        _configure(1e36, 0);
        tok.mint(address(r), 1_000e6);
        vm.expectRevert(FeeRouter.PriceNotSeeded.selector);
        _sweep(1_000e6, 1_000e6);
    }

    /// (f) an honest sweep within the band passes and moves the reference
    function test_FIXED_F2_anHonestSweepWithinTheBandPassesAndUpdatesLastPrice() public {
        FxOracle o = _configure(1e36, 1e36);
        tok.mint(address(r), 3_000e6);
        o.set(1.05e36); // +5%
        _sweep(1_000e6, 1_050e6);
        assertEq(r.lastPrice(address(tok)), 1.05e36);
        assertEq(usdc.balanceOf(senior), 525e6);
        o.set(1.15e36); // +9.5% from the NEW reference, inside the band
        _sweep(1_000e6, 1_150e6);
        assertEq(r.lastPrice(address(tok)), 1.15e36);
    }

    /// the band is symmetric and its edge is inclusive
    function test_FIXED_F2_bandEdgeIsInclusiveBothWays() public {
        FxOracle o = _configure(1e36, 1e36);
        tok.mint(address(r), 10_000e6);
        o.set(1.1e36 + 1);
        _expectBand(1.1e36 + 1, 1e36);
        _sweep(100e6, 110e6);
        o.set(0.9e36 - 1);
        _expectBand(0.9e36 - 1, 1e36);
        _sweep(100e6, 90e6);
        o.set(0.9e36);
        _sweep(100e6, 90e6); // exactly -10% passes
        assertEq(r.lastPrice(address(tok)), 0.9e36);
    }

    /// (b) a stale-LOW oracle (frozen at 1% of the seeded reference) is refused
    function test_FIXED_F2_aStaleLowOracleIsRefusedByTheBand() public {
        _configure(0.01e36, 1e36); // oracle froze at $0.01, the market (the seed) is $1.00
        tok.mint(address(r), 2_500_000e6);
        // oracle value of 2.5M T is 25,000 (cap and floor pass); the router would pay 24,750 for tokens worth 2.5M
        _expectBand(0.01e36, 1e36);
        _sweep(2_500_000e6, 24_750e6);
        assertEq(tok.balanceOf(address(r)), 2_500_000e6, "nothing left the router");
    }

    /// (c) a real 15% move is refused; the owner's seedPrice lets the sweep through
    function test_FIXED_F2_aRealMoveBeyondTheBandNeedsTheOwnersSeed() public {
        _configure(1.15e36, 1e36);
        tok.mint(address(r), 1_000e6);
        _expectBand(1.15e36, 1e36);
        _sweep(1_000e6, 1_150e6);
        vm.expectEmit(address(r));
        emit FeeRouter.PriceSeeded(address(tok), 1.15e36);
        vm.prank(owner);
        r.seedPrice(address(tok), 1.15e36);
        _sweep(1_000e6, 1_150e6);
        assertEq(usdc.balanceOf(senior), 575e6);
    }

    /// (e) the measured USDC out is capped too
    function test_FIXED_F2_theMeasuredUsdcOutIsCappedAtMaxSweepUsdc() public {
        _configure(1e36, 1e36);
        tok.mint(address(r), 20_000e6);
        // 20,000 T is 20,000 of oracle value (under the 25,000 cap) but the router pays 30,000
        vm.expectRevert(abi.encodeWithSelector(FeeRouter.SweepTooLarge.selector, 30_000e6, 25_000e6));
        _sweep(20_000e6, 30_000e6);
        _sweep(20_000e6, 25_000e6); // at the cap it passes
        assertEq(usdc.balanceOf(senior), 12_500e6);
    }

    /// (a) a spot-oracle sandwich of an honest sweep is refused by the band
    function test_FIXED_F2_theSpotOracleSandwichOfAnHonestSweepIsRefused() public {
        FxPool pool = new FxPool(IERC20(address(tok)), IERC20(address(usdc)));
        tok.mint(address(pool), 1_000_000e6);
        usdc.mint(address(pool), 1_000_000e6);
        pool.init(1_000_000e6, 1_000_000e6); // $1.00
        // the owner's misconfiguration: the pool is both the allowlisted router and the floor oracle
        vm.startPrank(owner);
        r.setRouter(address(pool), true);
        r.setFloor(address(tok), IOracle(address(pool)), 300);
        r.seedPrice(address(tok), 1e36);
        vm.stopPrank();
        tok.mint(address(r), 10_000e6);
        // the outsider sells 100,000 T into the pool first: the spot the floor reads drops to ~0.83
        address mal = address(0xBAD);
        tok.mint(mal, 100_000e6);
        vm.startPrank(mal);
        tok.approve(address(pool), type(uint256).max);
        pool.swapTokenForUsdc(100_000e6);
        vm.stopPrank();
        uint256 spot = pool.price();
        assertLt(spot, 0.84e36);
        vm.prank(owner);
        _expectBand(spot, 1e36);
        r.sweep(address(tok), address(pool), abi.encodeCall(FxPool.swapTokenForUsdc, (10_000e6)), 10_000e6);
        assertEq(tok.balanceOf(address(r)), 10_000e6, "the honest sweep did not run");
    }

    /// residual, stated: a move INSIDE the band is not refused (the band bounds a step, it is not a price source)
    function test_RESIDUAL_F2_aSandwichInsideTheBandStillRuns() public {
        FxPool pool = new FxPool(IERC20(address(tok)), IERC20(address(usdc)));
        tok.mint(address(pool), 1_000_000e6);
        usdc.mint(address(pool), 1_000_000e6);
        pool.init(1_000_000e6, 1_000_000e6);
        vm.startPrank(owner);
        r.setRouter(address(pool), true);
        r.setFloor(address(tok), IOracle(address(pool)), 300);
        r.seedPrice(address(tok), 1e36);
        vm.stopPrank();
        tok.mint(address(r), 10_000e6);
        address mal = address(0xBAD);
        tok.mint(mal, 50_000e6);
        vm.startPrank(mal);
        tok.approve(address(pool), type(uint256).max);
        pool.swapTokenForUsdc(50_000e6); // ~9% below the reference
        vm.stopPrank();
        assertGt(pool.price(), 0.9e36);
        vm.prank(owner);
        r.sweep(address(tok), address(pool), abi.encodeCall(FxPool.swapTokenForUsdc, (10_000e6)), 10_000e6);
        emit log_named_uint("recipients got (USDC, 6dp)", usdc.balanceOf(senior) + usdc.balanceOf(junior) + usdc.balanceOf(treasury));
    }

    /// setFloor to a different oracle clears the reference; the same oracle with a new slippage keeps it
    function test_FIXED_F2_setFloorClearsLastPriceOnlyForANewOracle() public {
        _configure(1e36, 1e36);
        (IOracle cur,) = r.floors(address(tok));
        vm.prank(owner);
        r.setFloor(address(tok), cur, 200);
        assertEq(r.lastPrice(address(tok)), 1e36, "same oracle keeps the reference");
        FxOracle o = new FxOracle(1e36);
        vm.prank(owner);
        r.setFloor(address(tok), IOracle(address(o)), 200);
        assertEq(r.lastPrice(address(tok)), 0, "a new oracle must be re-seeded");
        tok.mint(address(r), 100e6);
        vm.expectRevert(FeeRouter.PriceNotSeeded.selector);
        _sweep(100e6, 100e6);
    }

    function test_FIXED_F2_seedAndBandAreOwnerOnlyAndBounded() public {
        address keeper = address(0x4B);
        vm.startPrank(owner);
        r.setKeeper(keeper);
        vm.stopPrank();
        vm.startPrank(keeper);
        vm.expectRevert();
        r.seedPrice(address(tok), 1e36);
        vm.expectRevert();
        r.setMaxPriceMoveBps(2_000);
        vm.stopPrank();
        vm.startPrank(owner);
        vm.expectRevert(FeeRouter.BadPrice.selector);
        r.seedPrice(address(tok), 0);
        vm.expectRevert(FeeRouter.BadSplit.selector);
        r.setMaxPriceMoveBps(5_001);
        vm.expectEmit(address(r));
        emit FeeRouter.MaxPriceMoveSet(5_000);
        r.setMaxPriceMoveBps(5_000);
        vm.stopPrank();
        assertEq(r.maxPriceMoveBps(), 5_000);
        assertEq(new FeeRouter(IERC20(address(usdc)), owner, senior, junior, treasury).maxPriceMoveBps(), 1_000);
    }

    /// a widened band is honoured
    function test_FIXED_F2_aWiderBandLetsALargerMoveThrough() public {
        FxOracle o = _configure(1.15e36, 1e36);
        o.set(1.15e36);
        vm.prank(owner);
        r.setMaxPriceMoveBps(2_000);
        tok.mint(address(r), 1_000e6);
        _sweep(1_000e6, 1_150e6);
        assertEq(r.lastPrice(address(tok)), 1.15e36);
    }
}
