// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IOracle} from "morpho-blue/interfaces/IOracle.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
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

    /// the band is symmetric and its edge is inclusive (a dust-size sweep never moves the reference, so each
    /// edge is tried from the seed; full-size sweeps move it)
    function test_FIXED_F2_bandEdgeIsInclusiveBothWays() public {
        FxOracle o = _configure(1e36, 1e36);
        tok.mint(address(r), 10_000e6);
        o.set(1.1e36 + 1);
        _expectBand(1.1e36 + 1, 1e36);
        _sweep(1_000e6, 1_100e6);
        o.set(0.9e36 - 1);
        _expectBand(0.9e36 - 1, 1e36);
        _sweep(1_000e6, 900e6);
        o.set(0.9e36);
        _sweep(1_000e6, 900e6); // exactly -10% passes
        assertEq(r.lastPrice(address(tok)), 0.9e36);
    }

    /// exactly +10% passes and moves the reference
    function test_FIXED_F2_exactlyPlusTenPercentPasses() public {
        FxOracle o = _configure(1e36, 1e36);
        tok.mint(address(r), 1_000e6);
        o.set(1.1e36);
        _sweep(1_000e6, 1_100e6);
        assertEq(r.lastPrice(address(tok)), 1.1e36);
    }

    /// an oracle that reads 0 is refused by the band, never treated as a free floor
    function test_FIXED_F2_anOraclePriceOfZeroIsRefused() public {
        _configure(0, 1e36);
        tok.mint(address(r), 1_000e6);
        _expectBand(0, 1e36);
        _sweep(1_000e6, 1);
    }

    /// the amount checks run before the oracle is read: a dead oracle cannot mask NothingToDo
    function test_FIXED_F2_amountChecksRunBeforeTheOracleIsRead() public {
        vm.startPrank(owner);
        r.setRouter(address(dex), true);
        r.setFloor(address(tok), IOracle(address(0xDEAD0)), 100); // an address with no code: price() reverts
        vm.stopPrank();
        tok.mint(address(r), 10e6);
        vm.expectRevert(FeeRouter.NothingToDo.selector);
        _sweep(11e6, 1);
        vm.expectRevert(FeeRouter.NothingToDo.selector);
        _sweep(0, 1);
    }

    /// S2: seeding BEFORE setFloor fails closed (the new oracle clears both anchors)
    function test_FIXED_F2_seedingBeforeSetFloorFailsClosed() public {
        vm.startPrank(owner);
        r.setRouter(address(dex), true);
        r.seedPrice(address(tok), 1e36);
        r.setFloor(address(tok), IOracle(address(new FxOracle(1e36))), 100);
        vm.stopPrank();
        assertEq(r.lastPrice(address(tok)), 0);
        assertEq(r.seedRef(address(tok)), 0);
        tok.mint(address(r), 1_000e6);
        vm.expectRevert(FeeRouter.PriceNotSeeded.selector);
        _sweep(1_000e6, 1_000e6);
    }

    /// S1(ii): 44 dust sweeps at -10% in one block cannot walk the reference; a real-size sweep at the walked price is refused
    function test_FIXED_F2_dustSweepsCannotWalkTheReference() public {
        FxOracle o = _configure(1e36, 1e36);
        tok.mint(address(r), 2_000e6);
        uint256 p = 1e36;
        uint256 ok;
        for (uint256 i = 0; i < 44; i++) {
            p = p * 9 / 10;
            o.set(p);
            vm.prank(owner);
            (bool good,) = address(r).call(abi.encodeCall(FeeRouter.sweep, (address(tok), address(dex), _swapData(1, 1), 1)));
            if (good) ok++;
        }
        assertEq(ok, 1, "only the first -10% step is inside the band from the unmoved reference");
        assertEq(r.lastPrice(address(tok)), 1e36, "dust never moves lastPrice");
        assertLt(p, 0.011e36); // 0.9^44 ~ 1%
        _expectBand(p, 1e36);
        _sweep(1_000e6, 1); // a real-size sweep at the walked price (floor ~ 10 USDC)
        assertEq(tok.balanceOf(address(r)), 2_000e6 - 1);
    }

    /// S1(i): a real -10% per step trend with full-size sweeps stops at the cumulative bound until the owner seeds
    function test_FIXED_F2_aTrendStopsAtTheCumulativeBoundUntilSeedPrice() public {
        FxOracle o = _configure(1e36, 1e36);
        tok.mint(address(r), 10_000e6);
        uint256 p = 1e36;
        for (uint256 i = 0; i < 3; i++) {
            p = p * 9 / 10; // 0.9, 0.81, 0.729: each 10% from the last, 10/19/27.1% from the seed
            o.set(p);
            _sweep(1_000e6, p * 1_000e6 / 1e36);
        }
        assertEq(r.lastPrice(address(tok)), 0.729e36);
        p = p * 9 / 10; // 0.6561: 10% from the last step but 34.4% from the seed
        o.set(p);
        _expectBand(p, 1e36); // reports seedRef as the second value
        _sweep(1_000e6, p * 1_000e6 / 1e36);
        vm.prank(owner);
        r.seedPrice(address(tok), p);
        _sweep(1_000e6, p * 1_000e6 / 1e36);
        assertEq(r.lastPrice(address(tok)), p);
        assertEq(r.seedRef(address(tok)), p);
    }

    /// S1(i): the outsider's nudges, each 9% below the last accepted price, cannot take the floor past the cumulative bound
    function test_FIXED_F2_outsiderNudgesCannotTakeTheFloorPastTheCumulativeBound() public {
        FxPool pool = new FxPool(IERC20(address(tok)), IERC20(address(usdc)));
        tok.mint(address(pool), 1_000_000e6);
        usdc.mint(address(pool), 1_000_000e6);
        pool.init(1_000_000e6, 1_000_000e6);
        vm.startPrank(owner);
        r.setRouter(address(pool), true);
        r.setFloor(address(tok), IOracle(address(pool)), 300);
        r.seedPrice(address(tok), 1e36);
        vm.stopPrank();
        tok.mint(address(r), 400_000e6);
        address mal = address(0xBAD);
        vm.prank(mal);
        tok.approve(address(pool), type(uint256).max);
        uint256 rounds;
        uint256 totalLoss;
        uint256 minPrice = type(uint256).max;
        for (uint256 i = 0; i < 30; i++) {
            uint256 target = r.lastPrice(address(tok)) * 91 / 100; // the outsider's nudge: 9% under the reference
            uint256 rTNew = Math.sqrt(pool.rT() * pool.rU() * 1e36 / target);
            uint256 x = rTNew - pool.rT();
            tok.mint(mal, x);
            vm.prank(mal);
            pool.swapTokenForUsdc(x);
            uint256 spot = pool.price();
            uint256 got0 = usdc.balanceOf(senior) + usdc.balanceOf(junior) + usdc.balanceOf(treasury);
            vm.prank(owner);
            (bool ok, bytes memory ret) = address(r).call(
                abi.encodeCall(
                    FeeRouter.sweep,
                    (address(tok), address(pool), abi.encodeCall(FxPool.swapTokenForUsdc, (10_000e6)), 10_000e6)
                )
            );
            if (!ok) {
                assertEq(bytes4(ret), FeeRouter.PriceOutsideBand.selector, "the nudge ends on the band");
                break;
            }
            rounds++;
            if (spot < minPrice) minPrice = spot;
            totalLoss += 10_000e6 - (usdc.balanceOf(senior) + usdc.balanceOf(junior) + usdc.balanceOf(treasury) - got0);
        }
        emit log_named_uint("accepted nudged sweeps", rounds);
        emit log_named_uint("lowest accepted oracle price (1e36 = $1)", minPrice);
        emit log_named_uint("cumulative loss vs the seed price (USDC, 6dp)", totalLoss);
        assertGt(rounds, 0);
        assertLt(rounds, 30, "the nudging was stopped");
        assertGe(minPrice, 0.7e36, "no accepted sweep priced below the cumulative bound");
        // each accepted sweep's floor is 97% of a value priced at >= 70% of the seed: loss <= 32.1% of 10,000 per sweep
        assertLe(totalLoss, rounds * 3_210e6);
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

    /// residual, stated: moves INSIDE the band are not refused (the band bounds a step, it is not a price source).
    /// Bound asserted: a sweep priced at spot s >= 0.9 x lastPrice pays at least 97% of 10,000 T x s
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
        tok.mint(address(r), 20_000e6);
        address mal = address(0xBAD);
        tok.mint(mal, 200_000e6);
        vm.prank(mal);
        tok.approve(address(pool), type(uint256).max);
        bytes memory data = abi.encodeCall(FxPool.swapTokenForUsdc, (10_000e6));
        uint256 prev = 1e36;
        uint256 total0;
        for (uint256 i = 0; i < 2; i++) {
            vm.prank(mal);
            pool.swapTokenForUsdc(i == 0 ? 50_000e6 : 40_000e6); // ~9% under the reference each time
            uint256 spot = pool.price();
            assertGe(spot, prev * 9 / 10);
            vm.prank(owner);
            r.sweep(address(tok), address(pool), data, 10_000e6);
            assertEq(r.lastPrice(address(tok)), spot, "the in-band sweep moved the reference to the manipulated spot");
            uint256 received = usdc.balanceOf(senior) + usdc.balanceOf(junior) + usdc.balanceOf(treasury) - total0;
            total0 += received;
            assertGe(received, 10_000e6 * spot / 1e36 * 97 / 100, "loss bounded by the oracle value less the slippage");
            assertGe(received, 10_000e6 * uint256(i == 0 ? 0.9e36 : 0.7e36) / 1e36 * 97 / 100);
            emit log_named_uint("recipients got (USDC, 6dp)", received);
            prev = spot;
        }
    }

    /// setFloor to a different oracle clears the reference; the same oracle with a new slippage keeps it
    function test_FIXED_F2_setFloorClearsLastPriceOnlyForANewOracle() public {
        _configure(1e36, 1e36);
        (IOracle cur,) = r.floors(address(tok));
        vm.prank(owner);
        r.setFloor(address(tok), cur, 200);
        assertEq(r.lastPrice(address(tok)), 1e36, "same oracle keeps the reference");
        assertEq(r.seedRef(address(tok)), 1e36);
        FxOracle o = new FxOracle(1e36);
        vm.prank(owner);
        r.setFloor(address(tok), IOracle(address(o)), 200);
        assertEq(r.lastPrice(address(tok)), 0, "a new oracle must be re-seeded");
        assertEq(r.seedRef(address(tok)), 0, "and clears the cumulative anchor too");
        tok.mint(address(r), 100e6);
        vm.expectRevert(FeeRouter.PriceNotSeeded.selector);
        _sweep(100e6, 100e6);
    }

    function test_FIXED_F2_seedAndBandAreOwnerOnlyAndBounded() public {
        address keeper = address(0x4B);
        vm.prank(owner);
        r.setKeeper(keeper);
        bytes memory unauth = abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, keeper);
        vm.startPrank(keeper);
        vm.expectRevert(unauth);
        r.seedPrice(address(tok), 1e36);
        vm.expectRevert(unauth);
        r.setMaxPriceMoveBps(2_000);
        vm.expectRevert(unauth);
        r.setMaxCumulativeMoveBps(4_000);
        vm.stopPrank();
        vm.startPrank(owner);
        vm.expectRevert(FeeRouter.BadPrice.selector);
        r.seedPrice(address(tok), 0);
        vm.expectRevert(FeeRouter.BadSplit.selector);
        r.setMaxPriceMoveBps(3_001); // a step may not exceed the cumulative bound (3,000)
        vm.expectRevert(FeeRouter.BadSplit.selector);
        r.setMaxCumulativeMoveBps(999); // below the step (1,000)
        vm.expectRevert(FeeRouter.BadSplit.selector);
        r.setMaxCumulativeMoveBps(5_001);
        vm.expectEmit(address(r));
        emit FeeRouter.MaxCumulativeMoveSet(5_000);
        r.setMaxCumulativeMoveBps(5_000);
        vm.expectEmit(address(r));
        emit FeeRouter.MaxPriceMoveSet(5_000);
        r.setMaxPriceMoveBps(5_000);
        vm.expectRevert(FeeRouter.BadSplit.selector);
        r.setMaxCumulativeMoveBps(4_999); // now below the step
        vm.stopPrank();
        assertEq(r.maxPriceMoveBps(), 5_000);
        FeeRouter fresh = new FeeRouter(IERC20(address(usdc)), owner, senior, junior, treasury);
        assertEq(fresh.maxPriceMoveBps(), 1_000);
        assertEq(fresh.maxCumulativeMoveBps(), 3_000);
        vm.prank(owner);
        fresh.seedPrice(address(tok), 7e35);
        assertEq(fresh.lastPrice(address(tok)), 7e35);
        assertEq(fresh.seedRef(address(tok)), 7e35, "seedPrice writes both anchors");
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

    /* F6(a) --------------------------------------------------------------------------------------------- */

    /// an outsider can flush; it only splits the unparked USDC to the owner-set recipients
    function test_FIXED_F6a_anOutsiderCanDistributeAndOnlyTheRecipientsAreFunded() public {
        usdc.mint(address(r), 1_000e6);
        address mal = address(0xBAD);
        vm.prank(mal);
        r.distribute();
        assertEq(usdc.balanceOf(senior), 500e6);
        assertEq(usdc.balanceOf(junior), 250e6);
        assertEq(usdc.balanceOf(treasury), 250e6);
        assertEq(usdc.balanceOf(mal), 0);
        assertEq(usdc.balanceOf(address(r)), 0);
        vm.prank(mal);
        vm.expectRevert(FeeRouter.NothingToDo.selector);
        r.distribute();
    }

    /// parked USDC is not re-split by an outsider's flush, and recipients follow setRecipients
    function test_FIXED_F6a_anOutsidersFlushLeavesParkedUsdcAndFollowsTheOwnerSetRecipients() public {
        usdc.setReject(junior, true);
        usdc.mint(address(r), 1_000e6);
        vm.prank(address(0xBAD));
        r.distribute();
        assertEq(r.owed(junior, address(usdc)), 250e6);
        address newTreasury = address(0x99);
        vm.prank(owner);
        r.setRecipients(senior, junior, newTreasury);
        usdc.mint(address(r), 400e6);
        vm.prank(address(0xBAD));
        r.distribute();
        assertEq(usdc.balanceOf(newTreasury), 100e6);
        assertEq(usdc.balanceOf(address(r)), r.totalParked(address(usdc)));
    }

    /// the other keeper-gated entry points stay gated
    function test_HOLD_F6a_sweepAndSweepBurnStayKeeperOnly() public {
        vm.startPrank(address(0xBAD));
        vm.expectRevert(FeeRouter.NotKeeper.selector);
        r.sweep(address(tok), address(dex), "", 1);
        vm.expectRevert(FeeRouter.NotKeeper.selector);
        r.sweepBurn(address(tok));
        vm.stopPrank();
    }
}
