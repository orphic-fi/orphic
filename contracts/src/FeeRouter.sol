// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// CUSTOM, UNAUDITED. Every fee Orphic earns lands here and leaves in one of two shapes:
//  - any token: swapped to USDC on an allowlisted router, floor-checked against a Morpho-style oracle, then split
//    senior / junior / treasury (default 50 / 25 / 25). Senior is paid by transferring USDC to the senior vault,
//    which raises its share price on the next accrual with no fee switch.
//  - burn-split tokens (ORPH creation fees, school tuition): a fixed share burned, the rest to treasury.
// Controls, in order of importance: the floor, the router allowlist, the keeper role. A failed send never reverts
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
    mapping(address => bool) public isRouter;

    struct Floor {
        IOracle oracle; // price of `token` in USDC, Morpho IOracle scale
        uint16 maxSlippageBps; // how far below oracle a swap may land
    }
    mapping(address => Floor) public floors;
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

    error NotKeeper();
    error RouterNotAllowed();
    error NoFloor();
    error BelowFloor(uint256 got, uint256 floor);
    error NothingToDo();
    error BadSplit();
    error BadToken();

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

    /// @notice Swap the whole balance of `token` to USDC through `router` with `swapData`, then split everything.
    /// @dev Deltas are measured, never trusted from the router. The floor is computed from the oracle, so a bad
    ///      `swapData` can only fail, not leak.
    function sweep(address token, address router, bytes calldata swapData) external onlyKeeper nonReentrant {
        if (!isRouter[router]) revert RouterNotAllowed();
        if (token == address(usdc) || burnBps[token] != 0) revert BadToken();
        Floor memory f = floors[token];
        if (address(f.oracle) == address(0)) revert NoFloor();
        IERC20 t = IERC20(token);
        uint256 amountIn = t.balanceOf(address(this));
        if (amountIn == 0) revert NothingToDo();

        uint256 floor = amountIn * f.oracle.price() / ORACLE_SCALE; // USDC units for amountIn token units
        floor = floor * (BPS - f.maxSlippageBps) / BPS;

        uint256 before = usdc.balanceOf(address(this));
        t.forceApprove(router, amountIn);
        Address.functionCall(router, swapData);
        t.forceApprove(router, 0);
        uint256 got = usdc.balanceOf(address(this)) - before;
        if (got < floor) revert BelowFloor(got, floor);
        // Anything left of `token` (partial fill) simply waits for the next sweep.
        emit Swept(token, amountIn - t.balanceOf(address(this)), got, floor);
        _split();
    }

    /// @notice Split USDC that arrived directly (no swap needed).
    function distribute() external onlyKeeper nonReentrant {
        _split();
    }

    /// @notice Burn-split tokens: `burnBps` to the burn address, the rest to treasury.
    function sweepBurn(address token) external onlyKeeper nonReentrant {
        uint16 bps = burnBps[token];
        if (bps == 0) revert BadToken();
        IERC20 t = IERC20(token);
        uint256 bal = t.balanceOf(address(this));
        if (bal == 0) revert NothingToDo();
        uint256 burn = bal * bps / BPS;
        _send(t, BURN, burn);
        _send(t, treasury, bal - burn);
        emit Burned(token, burn, bal - burn);
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

    function setFloor(address token, IOracle oracle, uint16 maxSlippageBps) external onlyOwner {
        if (maxSlippageBps > 1000) revert BadSplit(); // never accept more than 10% below oracle
        floors[token] = Floor(oracle, maxSlippageBps);
        emit FloorSet(token, address(oracle), maxSlippageBps);
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

    function setKeeper(address keeper_) external onlyOwner {
        keeper = keeper_;
        emit KeeperSet(keeper_);
    }
}
