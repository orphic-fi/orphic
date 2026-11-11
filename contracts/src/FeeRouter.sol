// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// CUSTOM, UNAUDITED. Every fee Orphic earns lands here and leaves in one of two shapes:
//  - any token: swapped to USDC on an allowlisted router, floor-checked against a Morpho-style oracle, then split
//    senior / junior / treasury (default 50 / 25 / 25). Senior is paid by transferring USDC to the senior vault,
//    which raises its share price on the next accrual with no fee switch.
//  - burn-split tokens (ORPH creation fees, school tuition): a fixed share burned, the rest to treasury.
// Controls, in order of importance: the floor (with its price band), the router allowlist, the keeper role. A failed send never reverts
// the sweep; the amount is parked in `owed` and can be pulled later.

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IOracle} from "morpho-blue/interfaces/IOracle.sol";

contract FeeRouter is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint256 public constant ORACLE_SCALE = 1e36; // Morpho IOracle: raw USDC units per raw token unit, scaled 1e36
    address public constant BURN = 0x000000000000000000000000000000000000dEaD;

    IERC20 public immutable usdc;

    address public senior;
    address public junior;
    address public treasury;
    uint16 public seniorBps = 5000;
    uint16 public juniorBps = 2500; // treasury gets the rest

    address public keeper;
    uint256 public maxSweepUsdc = 25_000e6; // oracle value of one sweep may not exceed this
    mapping(address => bool) public isRouter;

    struct Floor {
        IOracle oracle; // price of `token` in USDC, Morpho IOracle scale
        uint16 maxSlippageBps; // how far below oracle a swap may land
    }
    mapping(address => Floor) public floors;
    mapping(address => uint256) public lastPrice; // token => oracle price (1e36 scale) of the last accepted sweep, or the owner's seed
    mapping(address => uint256) public seedRef; // token => the owner's last seed; written ONLY by `seedPrice`
    uint16 public maxPriceMoveBps = 1_000; // how far the oracle may sit from `lastPrice`, either way, for a sweep to run
    uint16 public maxCumulativeMoveBps = 3_000; // how far it may sit from `seedRef`, however many sweeps came between
    mapping(address => uint16) public burnBps; // token => share burned instead of swapped (0 = swap path)
    mapping(address => mapping(address => uint256)) public owed; // recipient => token => parked amount
    mapping(address => uint256) public totalParked; // token => sum of owed, whoever the recipients were

    event Swept(address indexed token, uint256 amountIn, uint256 usdcOut, uint256 floor);
    event Split(uint256 toSenior, uint256 toJunior, uint256 toTreasury);
    event Burned(address indexed token, uint256 burned, uint256 toTreasury);
    event SendParked(address indexed to, address indexed token, uint256 amount);
    event OwedPulled(address indexed to, address indexed token, uint256 amount);
    event RouterSet(address router, bool allowed);
    event FloorSet(address token, address oracle, uint16 maxSlippageBps);
    event BurnSet(address token, uint16 bps);
    event RecipientsSet(address senior, address junior, address treasury);
    event SplitSet(uint16 seniorBps, uint16 juniorBps);
    event KeeperSet(address keeper);
    event MaxSweepSet(uint256 max);
    event PriceSeeded(address token, uint256 price);
    event MaxPriceMoveSet(uint16 bps);
    event MaxCumulativeMoveSet(uint16 bps);

    error NotKeeper();
    error RouterNotAllowed();
    error NoFloor();
    error BelowFloor(uint256 got, uint256 floor);
    error NothingToDo();
    error BadSplit();
    error BadToken();
    error SweepTooLarge(uint256 value, uint256 max);
    error PriceNotSeeded();
    error PriceOutsideBand(uint256 price, uint256 lastPrice);
    error BadPrice();

    constructor(IERC20 usdc_, address owner_, address senior_, address junior_, address treasury_) Ownable(owner_) {
        usdc = usdc_;
        senior = senior_;
        junior = junior_;
        treasury = treasury_;
        keeper = owner_;
    }

    modifier onlyKeeper() {
        if (msg.sender != keeper && msg.sender != owner()) revert NotKeeper();
        _;
    }

    /* SWEEPS */

    /// @notice Swap `amountIn` of `token` to USDC through `router` with `swapData`, then split everything.
    /// @dev Deltas are measured, never trusted from the router. The floor is computed from the oracle, so a bad
    ///      `swapData` can only fail, not leak. `maxSweepUsdc` bounds the USDC that comes OUT of one sweep (the oracle
    ///      value of `amountIn` and the measured `got` are both capped), not the value of the tokens that go in: with
    ///      a stale-low oracle one sweep can move far more token value than the cap. What bounds a stale or moved
    ///      oracle is the price band: the sweep refuses while the token is unseeded, when the oracle price is more
    ///      than `maxPriceMoveBps` away, either way, from `lastPrice` (the seed, then the last accepted sweep that
    ///      sold at least `maxSweepUsdc / 100` of value: a dust sweep never moves it), and when it is more than
    ///      `maxCumulativeMoveBps` from `seedRef` (written only by `seedPrice`), so accepted steps compound only up
    ///      to that bound. A real move beyond it needs the owner's `seedPrice`. The band is not a price source: the
    ///      floor oracle must not be movable by the keeper or by the swap venue. Positive slippage at the cap is
    ///      refused (`got > maxSweepUsdc`), so the keeper sizes sweeps below the cap.
    function sweep(address token, address router, bytes calldata swapData, uint256 amountIn)
        external
        onlyKeeper
        nonReentrant
    {
        if (!isRouter[router]) revert RouterNotAllowed();
        if (token == address(usdc) || burnBps[token] != 0) revert BadToken();
        if (address(floors[token].oracle) == address(0)) revert NoFloor();
        IERC20 t = IERC20(token);
        if (amountIn == 0 || amountIn > _unparked(t)) revert NothingToDo();
        uint256 price = _bandedPrice(token);

        uint256 value = amountIn * price / ORACLE_SCALE; // USDC units for amountIn token units
        if (value > maxSweepUsdc) revert SweepTooLarge(value, maxSweepUsdc);
        uint256 floor = value * (BPS - floors[token].maxSlippageBps) / BPS;

        uint256 before = usdc.balanceOf(address(this));
        uint256 tokenBefore = t.balanceOf(address(this));
        t.forceApprove(router, amountIn);
        Address.functionCall(router, swapData);
        t.forceApprove(router, 0);
        uint256 got = usdc.balanceOf(address(this)) - before;
        if (got < floor) revert BelowFloor(got, floor);
        if (got > maxSweepUsdc) revert SweepTooLarge(got, maxSweepUsdc); // the cap also binds the measured USDC out
        uint256 spent = tokenBefore - t.balanceOf(address(this)); // measured, never trusted from the router
        if (spent > amountIn) revert BadToken(); // the approval bounds it; belt and braces
        if (value >= maxSweepUsdc / 100) lastPrice[token] = price; // a dust sweep cannot walk the reference
        // Anything left of `token` (partial fill) simply waits for the next sweep.
        emit Swept(token, spent, got, floor);
        _split();
    }

    /// @notice Split USDC that arrived directly (no swap needed). Permissionless: it only splits USDC already held
    ///         (net of what is parked) to the recipients the owner set, so a caller cannot redirect anything.
    /// @dev Alone this does not stop a junior-deposit snipe (deposit, then flush, in one tx); the bound is the keeper
    ///      calling it every tick.
    function distribute() external nonReentrant {
        _split();
    }

    /// @notice Burn-split tokens: `burnBps` to the burn address, the rest to treasury.
    function sweepBurn(address token) external onlyKeeper nonReentrant {
        uint16 bps = burnBps[token];
        if (bps == 0) revert BadToken();
        IERC20 t = IERC20(token);
        uint256 bal = _unparked(t);
        if (bal == 0) revert NothingToDo();
        uint256 burn = bal * bps / BPS;
        _send(t, BURN, burn);
        _send(t, treasury, bal - burn);
        emit Burned(token, burn, bal - burn);
    }

    /// @dev Balance minus what is parked for recipients: parked amounts are already assigned (`pullOwed`), never
    ///      sold or burned. Zero when a rebase left the balance under `totalParked`.
    function _unparked(IERC20 t) internal view returns (uint256) {
        uint256 bal = t.balanceOf(address(this));
        uint256 parked = totalParked[address(t)];
        return bal > parked ? bal - parked : 0;
    }

    /// @dev The oracle price of `token`; refuses while `token` is unseeded, when the price is more than
    ///      `maxPriceMoveBps` from `lastPrice`, or more than `maxCumulativeMoveBps` from `seedRef` (both
    ///      `PriceOutsideBand`, the second reports `seedRef` as its second value).
    function _bandedPrice(address token) internal view returns (uint256 price) {
        price = floors[token].oracle.price();
        uint256 last = lastPrice[token];
        if (last == 0) revert PriceNotSeeded();
        if (_apart(price, last) * BPS > last * maxPriceMoveBps) revert PriceOutsideBand(price, last);
        uint256 ref = seedRef[token];
        if (_apart(price, ref) * BPS > ref * maxCumulativeMoveBps) revert PriceOutsideBand(price, ref);
    }

    function _apart(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : b - a;
    }

    function _split() internal {
        uint256 bal = usdc.balanceOf(address(this));
        uint256 parked = totalParked[address(usdc)];
        if (bal <= parked) revert NothingToDo();
        bal -= parked; // parked amounts are already assigned
        uint256 toSenior = bal * seniorBps / BPS;
        uint256 toJunior = bal * juniorBps / BPS;
        uint256 toTreasury = bal - toSenior - toJunior;
        _send(usdc, senior, toSenior);
        _send(usdc, junior, toJunior);
        _send(usdc, treasury, toTreasury);
        emit Split(toSenior, toJunior, toTreasury);
    }

    /// @dev Best-effort transfer. On failure the amount is parked for `to` and the sweep continues.
    function _send(IERC20 token, address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, bytes memory ret) =
            address(token).call(abi.encodeWithSelector(IERC20.transfer.selector, to, amount));
        if (ok && (ret.length == 0 || abi.decode(ret, (bool)))) return;
        owed[to][address(token)] += amount;
        totalParked[address(token)] += amount;
        emit SendParked(to, address(token), amount);
    }

    /// @notice Pull a parked amount. Anyone can trigger it; it only ever goes to the recorded recipient.
    function pullOwed(address to, address token) external nonReentrant {
        uint256 amount = owed[to][token];
        if (amount == 0) revert NothingToDo();
        owed[to][token] = 0;
        totalParked[token] -= amount;
        IERC20(token).safeTransfer(to, amount);
        emit OwedPulled(to, token, amount);
    }

    /* OWNER */

    function setRouter(address router, bool allowed) external onlyOwner {
        isRouter[router] = allowed;
        emit RouterSet(router, allowed);
    }

    /// @dev The oracle must never read the venue the token is swapped on: no spot price of the swap pool (an
    ///      outsider moves it around the sweep and the floor moves with it). ORPH's only market is the seeded v4 pool,
    ///      which has no on-chain TWAP, so ORPH needs an oracle that does not read that pool. The cap on a sweep
    ///      bounds USDC out, not token value; a stale oracle is bounded only by the band against `lastPrice`.
    ///      Pointing `token` at a different oracle clears both anchors (`lastPrice`, `seedRef`): the owner re-seeds
    ///      (`seedPrice`) after checking the new oracle, so seeding before `setFloor` fails closed. Changing only
    ///      `maxSlippageBps` keeps them. The oracle is assumed immutable: a proxy upgrade or feed change behind the
    ///      same address keeps the anchors, so the owner re-seeds after any such change.
    function setFloor(address token, IOracle oracle, uint16 maxSlippageBps) external onlyOwner {
        if (maxSlippageBps > 1000) revert BadSplit(); // never accept more than 10% below oracle
        if (floors[token].oracle != oracle) {
            delete lastPrice[token];
            delete seedRef[token];
        }
        floors[token] = Floor(oracle, maxSlippageBps);
        emit FloorSet(token, address(oracle), maxSlippageBps);
    }

    /// @notice Set the reference price the sweep band is measured from (also the escape after a real price move).
    function seedPrice(address token, uint256 price) external onlyOwner {
        if (price == 0) revert BadPrice();
        lastPrice[token] = price;
        seedRef[token] = price;
        emit PriceSeeded(token, price);
    }

    function setMaxPriceMoveBps(uint16 bps) external onlyOwner {
        if (bps > maxCumulativeMoveBps) revert BadSplit(); // a step may not exceed the cumulative bound
        maxPriceMoveBps = bps;
        emit MaxPriceMoveSet(bps);
    }

    function setMaxCumulativeMoveBps(uint16 bps) external onlyOwner {
        if (bps < maxPriceMoveBps || bps > 5_000) revert BadSplit(); // at least a step, at most 50%
        maxCumulativeMoveBps = bps;
        emit MaxCumulativeMoveSet(bps);
    }

    function setBurn(address token, uint16 bps) external onlyOwner {
        if (bps > BPS || token == address(usdc)) revert BadToken();
        burnBps[token] = bps;
        emit BurnSet(token, bps);
    }

    function setRecipients(address senior_, address junior_, address treasury_) external onlyOwner {
        senior = senior_;
        junior = junior_;
        treasury = treasury_;
        emit RecipientsSet(senior_, junior_, treasury_);
    }

    function setSplit(uint16 seniorBps_, uint16 juniorBps_) external onlyOwner {
        if (uint256(seniorBps_) + juniorBps_ > BPS) revert BadSplit();
        seniorBps = seniorBps_;
        juniorBps = juniorBps_;
        emit SplitSet(seniorBps_, juniorBps_);
    }

    function setMaxSweepUsdc(uint256 max) external onlyOwner {
        maxSweepUsdc = max;
        emit MaxSweepSet(max);
    }

    function setKeeper(address keeper_) external onlyOwner {
        keeper = keeper_;
        emit KeeperSet(keeper_);
    }
}
