// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// CUSTOM, UNAUDITED. Everything in this file is new code written for Orphic.
// It holds junior depositors' USDC. Keep it small, keep it tested, keep it capped.

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IMorpho, MarketParams, Id} from "morpho-blue/interfaces/IMorpho.sol";
import {MarketParamsLib} from "morpho-blue/libraries/MarketParamsLib.sol";
import {MorphoBalancesLib} from "morpho-blue/libraries/periphery/MorphoBalancesLib.sol";
import {IVaultV2} from "vault-v2/interfaces/IVaultV2.sol";
import {IAdapter} from "vault-v2/interfaces/IAdapter.sol";

/// @title JuniorVault
/// @notice First-loss tranche for Orphic. ERC-20 share token over USDC.
///  - deposit: pulls USDC, and (once the stake token is set) a stake of `stakePerAsset` ORPH per USDC, held here and
///    released on full exit. Shares are minted at the price frozen at the last settle.
///  - exit: requestExit locks shares, claimExit pays them at the price of the first settle at or after 7 days' notice.
///  - settle: permissionless, no inputs, at most once per SETTLE_INTERVAL. Covers any senior shortfall from idle USDC,
///    then freezes a new share price from net asset value.
///  - agent: a single key that can only call (target, selector) pairs on the allowlist, and only with this contract as
///    the receiver where the call has one. Funds can move to allowlisted venues and back, nowhere else.
///  - pause: blocks deposits only. Exits, claims and settle always work.
contract JuniorVault is ERC20, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using MarketParamsLib for MarketParams;
    using MorphoBalancesLib for IMorpho;

    /* CONSTANTS AND IMMUTABLES */

    uint256 public constant WAD = 1e18;
    uint256 public constant NOTICE = 7 days;
    uint256 public constant SETTLE_INTERVAL = 7 days - 1 hours; // weekly, with an hour of slack for the keeper
    uint256 public constant MAX_MARKETS = 16;
    uint256 public constant SEED_ASSETS = 1e6; // 1 USDC of dead shares against first-depositor price games
    uint256 public constant PRICE_UNIT = 1e24; // senior shares used to quote its price with enough precision

    IERC20 public immutable asset; // USDC, 6 decimals
    IVaultV2 public immutable senior; // Morpho Vault V2 we curate
    IMorpho public immutable morpho; // Morpho Blue
    uint256 internal immutable assetScale; // 10 ** (18 - asset decimals)

    /* STATE */

    uint256 public pricePerShare = WAD; // assets per share, 18 decimals of precision, frozen between settles
    uint256 public lastSettle;
    uint256 public depositCap;
    bool public depositsPaused;
    bool public seeded;
    address public agent;

    IERC20 public stakeToken; // ORPH, zero until setStakeToken (one-way)
    uint256 public stakePerAsset; // ORPH wei required per 1 unit (1e6) of USDC deposited
    mapping(address => uint256) public stakeOf; // ORPH held for each depositor
    mapping(address => uint256) public stakedShares; // shares minted to each depositor while staking, drives release

    struct Settle {
        uint64 timestamp;
        uint192 price;
    }
    Settle[] public settles;

    struct ExitRequest {
        uint128 shares;
        uint64 readyAt;
        uint32 settleHint; // settles.length at request time, where the claim search starts
    }
    mapping(address => ExitRequest) public exitOf;
    mapping(uint256 => uint256) public maturingShares; // readyAt day => shares that mature that day
    uint256 public lastMaturedDay; // last day bucket folded into pricedExitShares by settle
    uint256 public seniorPriceBase; // senior real assets per PRICE_UNIT shares at the last settle, after any cover
    uint256 public seniorSupplyBase; // senior share supply at the last sync: only these shares were exposed to a loss
    uint256 public seniorBaseTime; // when the baseline was taken, for the management fee drift
    uint256 public pendingExitShares; // shares locked and not yet priced, still part of the live supply
    uint256 public pricedExitShares; // shares priced at a past settle, excluded from the live supply
    uint256 public reservedAssets; // USDC owed to priced exits, excluded from NAV

    // Valuation universe doubles as the agent's venue list.
    MarketParams[] public markets; // Morpho Blue markets the agent may supply to
    mapping(Id => bool) public isMarket;
    address[] public vaults; // ERC-4626 vaults the agent may deposit to (Felix v1.1, senior for fee shares)
    mapping(address => bool) public isVault;

    // Agent allowlist. receiverOffset is the calldata byte offset (after the 4-byte selector) of the address that must
    // equal this contract, or type(uint256).max when the call has no receiver to check.
    struct Rule {
        bool allowed;
        uint256 receiverOffset;
    }
    mapping(address => mapping(bytes4 => Rule)) public rules;
    mapping(address => mapping(address => bool)) public approvals; // token => spender the agent may approve

    /* EVENTS */

    event Deposit(address indexed caller, address indexed receiver, uint256 assets, uint256 shares, uint256 stake);
    event ExitRequested(address indexed owner, uint256 shares, uint256 readyAt);
    event ExitClaimed(address indexed owner, uint256 shares, uint256 assets, uint256 price);
    event Settled(uint256 indexed index, uint256 nav, uint256 supply, uint256 price, uint256 cover);
    event Cover(uint256 shortfall, uint256 paid);
    event AgentCall(address indexed target, bytes4 indexed selector, uint256 value);
    event RuleSet(address indexed target, bytes4 indexed selector, bool allowed, uint256 receiverOffset);
    event ApprovalRuleSet(address indexed token, address indexed spender, bool allowed);
    event MarketAdded(Id indexed id);
    event VaultAdded(address indexed vault);
    event MarketRemoved(Id indexed id);
    event VaultRemoved(address indexed vault);
    event StakeTokenSet(address token, uint256 stakePerAsset);
    event StakePerAssetSet(uint256 stakePerAsset);
    event DepositCapSet(uint256 cap);
    event DepositsPaused(bool paused);
    event AgentSet(address agent);

    /* ERRORS */

    error Paused();
    error CapExceeded();
    error ZeroAmount();
    error NotAgent();
    error NotAllowed();
    error BadReceiver();
    error TooSoon();
    error NothingToClaim();
    error NotReady();
    error AlreadySet();
    error TooMany();
    error InsufficientLiquidity();
    error WrongAsset();
    error VenueBroken();

    constructor(IERC20 asset_, IVaultV2 senior_, IMorpho morpho_, address owner_, uint256 depositCap_)
        ERC20("Orphic Junior USDC", "ojUSDC")
        Ownable(owner_)
    {
        asset = asset_;
        senior = senior_;
        morpho = morpho_;
        uint8 dec = ERC20(address(asset_)).decimals();
        assetScale = 10 ** (18 - dec);
        depositCap = depositCap_;
        lastSettle = block.timestamp;
        lastMaturedDay = block.timestamp / 1 days;
        settles.push(Settle(uint64(block.timestamp), uint192(WAD)));
        seniorPriceBase = _seniorRealPrice();
        seniorSupplyBase = senior_.totalSupply();
        seniorBaseTime = block.timestamp;
    }

    /// @notice Owner funds 1 USDC of dead shares before deposits open, so no first depositor can play the price.
    function seed() external onlyOwner {
        if (seeded) revert AlreadySet();
        seeded = true;
        asset.safeTransferFrom(msg.sender, address(this), SEED_ASSETS);
        _mint(address(0xdead), _toShares(SEED_ASSETS));
    }

    /* DEPOSIT */

    function deposit(uint256 assets, address receiver) external nonReentrant returns (uint256 shares) {
        if (depositsPaused || !seeded) revert Paused();
        if (assets == 0) revert ZeroAmount();
        (uint256 nav, bool complete) = _navComplete();
        if (!complete) revert VenueBroken();
        if (nav + assets > depositCap) revert CapExceeded();
        _syncSenior(); // every junior deposit also refreshes what senior exposure we stand behind
        shares = _toShares(assets);
        uint256 stake;
        if (address(stakeToken) != address(0)) {
            stake = assets * stakePerAsset / 1e6;
            stakeToken.safeTransferFrom(msg.sender, address(this), stake);
            stakeOf[receiver] += stake;
            stakedShares[receiver] += shares;
        }
        asset.safeTransferFrom(msg.sender, address(this), assets);
        _mint(receiver, shares);
        emit Deposit(msg.sender, receiver, assets, shares, stake);
    }

    /* EXIT */

    /// @notice Lock shares for exit. One open request per address; a new request merges and restarts the notice.
    function requestExit(uint256 shares) external nonReentrant {
        if (shares == 0) revert ZeroAmount();
        _transfer(msg.sender, address(this), shares);
        ExitRequest storage r = exitOf[msg.sender];
        if (r.shares != 0) {
            // Merge: a request already priced cannot be reopened, claim it first.
            if (r.readyAt / 1 days <= lastMaturedDay) revert AlreadySet();
            maturingShares[r.readyAt / 1 days] -= r.shares;
        }
        // Notice ends at the first UTC midnight at least 7 days out, so maturity buckets and prices line up exactly.
        uint64 readyAt = uint64((block.timestamp + NOTICE + 1 days - 1) / 1 days * 1 days);
        r.shares += uint128(shares);
        r.readyAt = readyAt;
        r.settleHint = uint32(settles.length);
        maturingShares[readyAt / 1 days] += r.shares;
        pendingExitShares += shares;
        emit ExitRequested(msg.sender, shares, readyAt);
    }

    /// @notice Pay a matured exit at the price of the first settle at or after readyAt.
    function claimExit() external nonReentrant {
        ExitRequest memory r = exitOf[msg.sender];
        if (r.shares == 0) revert NothingToClaim();
        uint256 price = _priceAtOrAfter(r.readyAt, r.settleHint);
        uint256 assets = uint256(r.shares) * price / WAD / assetScale;
        if (asset.balanceOf(address(this)) < assets) revert InsufficientLiquidity();
        delete exitOf[msg.sender];
        pricedExitShares -= r.shares;
        reservedAssets = reservedAssets >= assets ? reservedAssets - assets : 0;
        _burn(address(this), r.shares);
        // Release stake pro rata to the staked shares leaving; a full exit releases everything.
        uint256 stake = stakeOf[msg.sender];
        if (stake != 0) {
            uint256 held = stakedShares[msg.sender];
            uint256 burned = r.shares > held ? held : r.shares;
            uint256 release = held == burned ? stake : stake * burned / held;
            stakedShares[msg.sender] = held - burned;
            stakeOf[msg.sender] = stake - release;
            stakeToken.safeTransfer(msg.sender, release);
        }
        if (pricedExitShares == 0) reservedAssets = 0; // rounding dust
        asset.safeTransfer(msg.sender, assets);
        emit ExitClaimed(msg.sender, r.shares, assets, price);
    }

    function _priceAtOrAfter(uint64 readyAt, uint32 hint) internal view returns (uint256) {
        uint256 n = settles.length;
        for (uint256 i = hint; i < n; i++) {
            if (settles[i].timestamp >= readyAt) return settles[i].price;
        }
        revert NotReady();
    }

    /* SETTLE */

    /// @notice Weekly close. Anyone can call, nothing to pass. Covers senior, then freezes the new price.
    function settle() external nonReentrant {
        if (block.timestamp < lastSettle + SETTLE_INTERVAL) revert TooSoon();
        senior.accrueInterest(); // mints our management-fee shares in senior before we value them
        uint256 cover = _coverSenior();
        (uint256 nav, bool complete) = _navComplete(); // net of assets reserved for exits priced earlier
        if (!complete) revert VenueBroken(); // never freeze a wrong price; owner force-removes the venue first
        uint256 supply = totalSupply() - pricedExitShares; // shares still exposed to this epoch's result
        uint256 price = supply == 0 ? WAD : nav * assetScale * WAD / supply;
        pricePerShare = price;
        lastSettle = block.timestamp;
        settles.push(Settle(uint64(block.timestamp), uint192(price)));
        // Fold every exit whose notice has run into the priced set and earmark what it is owed.
        uint256 today = block.timestamp / 1 days; // bucket d is due once block.timestamp >= d * 1 days
        uint256 matured;
        for (uint256 d = lastMaturedDay + 1; d <= today; d++) {
            matured += maturingShares[d];
        }
        lastMaturedDay = today;
        if (matured != 0) {
            pendingExitShares -= matured;
            pricedExitShares += matured;
            uint256 owed = matured * price / WAD / assetScale;
            reservedAssets += owed > nav ? nav : owed;
        }
        emit Settled(settles.length - 1, nav, supply, price, cover);
    }

    /// @dev Senior's real assets per share below where they should be is a loss we cover, up to our idle USDC.
    ///      Real assets = idle USDC + adapters, independent of Vault V2's maxRate smoothing, so a cover already paid is
    ///      never paid twice. "Should be" is last settle's level less the management fee dilution since then (that
    ///      fee is ours, not a loss). Only shares that existed at the last settle are billed: senior deposits made
    ///      after the loss bought in at the depressed price and are not owed anything.
    function _coverSenior() internal returns (uint256 paid) {
        uint256 price = _seniorRealPrice();
        uint256 supply = senior.totalSupply();
        uint256 expected = _expectedSeniorPrice();
        if (price < expected && supply != 0) {
            uint256 exposed = supply < seniorSupplyBase ? supply : seniorSupplyBase;
            uint256 shortfall = (expected - price) * exposed / PRICE_UNIT;
            uint256 idle = asset.balanceOf(address(this));
            idle = idle > reservedAssets ? idle - reservedAssets : 0; // priced exits are fixed claims, not first loss
            paid = shortfall < idle ? shortfall : idle;
            if (paid != 0) asset.safeTransfer(address(senior), paid);
            emit Cover(shortfall, paid);
            price = _seniorRealPrice(); // includes what we just paid
        }
        seniorPriceBase = price;
        seniorSupplyBase = supply;
        seniorBaseTime = block.timestamp;
    }

    /// @notice Refresh the senior baseline while no loss is outstanding, so shares deposited since the last settle
    ///         become covered. Permissionless; the keeper calls it hourly. Does nothing if senior is below baseline,
    ///         so it can never be used after a loss to enlarge the bill.
    function syncSenior() external {
        _syncSenior();
    }

    function _syncSenior() internal {
        uint256 price = _seniorRealPrice();
        if (price < _expectedSeniorPrice()) return;
        seniorPriceBase = price;
        seniorSupplyBase = senior.totalSupply();
        seniorBaseTime = block.timestamp;
    }

    /// @dev Baseline less the management fee drift, less 1 ppm so Vault V2 rounding never reads as a loss.
    function _expectedSeniorPrice() internal view returns (uint256) {
        uint256 elapsed = block.timestamp - seniorBaseTime;
        return seniorPriceBase - seniorPriceBase * senior.managementFee() * elapsed / WAD - seniorPriceBase / 1e6;
    }

    /// @dev Senior real assets per PRICE_UNIT shares, Vault V2 convention (virtual shares, +1 asset).
    function _seniorRealPrice() internal view returns (uint256) {
        uint256 real = asset.balanceOf(address(senior));
        uint256 n = senior.adaptersLength();
        for (uint256 i = 0; i < n; i++) {
            real += IAdapter(senior.adapters(i)).realAssets();
        }
        (,, uint256 pendingFeeShares) = senior.accrueInterestView(); // fee shares owed to us but not yet minted
        return PRICE_UNIT * (real + 1) / (senior.totalSupply() + pendingFeeShares + senior.virtualShares());
    }

    /// @notice USDC that senior's share price still has to recognise from the last cover. For the front end.
    function coverInProgress() external view returns (uint256) {
        uint256 recognised = senior.convertToAssets(PRICE_UNIT);
        uint256 real = _seniorRealPrice();
        if (real <= recognised) return 0;
        return (real - recognised) * senior.totalSupply() / PRICE_UNIT;
    }

    /* VALUATION */

    /// @notice Idle USDC plus every allowlisted position, minus assets already owed to priced exits.
    ///         A venue whose view reverts counts as zero here (display never freezes); settle and deposit refuse
    ///         to act on an incomplete valuation, see _navComplete.
    function totalAssets() public view returns (uint256 total) {
        (total,) = _navComplete();
    }

    function _navComplete() internal view returns (uint256 total, bool complete) {
        complete = true;
        total = asset.balanceOf(address(this));
        for (uint256 i = 0; i < markets.length; i++) {
            try this.marketAssets(i) returns (uint256 a) {
                total += a;
            } catch {
                complete = false;
            }
        }
        for (uint256 i = 0; i < vaults.length; i++) {
            try this.vaultAssets(i) returns (uint256 a) {
                total += a;
            } catch {
                complete = false;
            }
        }
        total = total > reservedAssets ? total - reservedAssets : 0;
    }

    function marketAssets(uint256 i) external view returns (uint256) {
        return morpho.expectedSupplyAssets(markets[i], address(this));
    }

    function vaultAssets(uint256 i) external view returns (uint256) {
        IERC4626 v = IERC4626(vaults[i]);
        uint256 bal = v.balanceOf(address(this));
        return bal == 0 ? 0 : v.convertToAssets(bal);
    }

    /// @dev Mint at the worse of the frozen price and the live price, so a deposit just before settle cannot take
    ///      the epoch's accrued yield from earlier depositors.
    function _toShares(uint256 assets) internal view returns (uint256) {
        uint256 supply = totalSupply() - pricedExitShares;
        uint256 live = supply == 0 ? WAD : totalAssets() * assetScale * WAD / supply;
        uint256 p = live > pricePerShare ? live : pricePerShare;
        return assets * assetScale * WAD / p;
    }

    function settlesLength() external view returns (uint256) {
        return settles.length;
    }

    function marketsLength() external view returns (uint256) {
        return markets.length;
    }

    function vaultsLength() external view returns (uint256) {
        return vaults.length;
    }

    /* AGENT */

    /// @notice The only way the agent moves money. Target and selector must be allowlisted; the receiver word must be us.
    function execute(address target, bytes calldata data) external nonReentrant returns (bytes memory) {
        if (msg.sender != agent) revert NotAgent();
        if (data.length < 4) revert NotAllowed();
        if (target == address(stakeToken) && target != address(0)) revert NotAllowed();
        bytes4 selector = bytes4(data[:4]);
        if (selector == IERC20.approve.selector) {
            (address spender,) = abi.decode(data[4:], (address, uint256));
            if (!approvals[target][spender]) revert NotAllowed();
            if (spender != address(morpho) && !isVault[spender]) revert NotAllowed(); // removed venues die at once
        } else {
            Rule memory rule = rules[target][selector];
            if (!rule.allowed) revert NotAllowed();
            if (target == address(morpho)) {
                // every Morpho call starts with MarketParams: only registered markets, ever
                if (data.length < 4 + 160) revert NotAllowed();
                MarketParams memory mp = abi.decode(data[4:164], (MarketParams));
                if (!isMarket[mp.id()]) revert NotAllowed();
            } else if (!isVault[target]) {
                revert NotAllowed();
            }
            if (rule.receiverOffset != type(uint256).max) {
                uint256 off = 4 + rule.receiverOffset;
                if (data.length < off + 32) revert BadReceiver();
                address receiver = abi.decode(data[off:off + 32], (address));
                if (receiver != address(this)) revert BadReceiver();
            }
        }
        emit AgentCall(target, selector, 0);
        uint256 idleBefore = asset.balanceOf(address(this));
        bytes memory ret = Address.functionCall(target, data);
        uint256 idleAfter = asset.balanceOf(address(this));
        // the agent may never deploy USDC that priced exits are owed
        if (idleAfter < idleBefore && idleAfter < reservedAssets) revert InsufficientLiquidity();
        return ret;
    }

    /* OWNER */

    function setAgent(address agent_) external onlyOwner {
        agent = agent_;
        emit AgentSet(agent_);
    }

    function setRule(address target, bytes4 selector, bool allowed, uint256 receiverOffset) external onlyOwner {
        // targets are the valuation universe and nothing else: never the asset, never the stake token, never arbitrary
        if (allowed && target != address(morpho) && !isVault[target]) revert NotAllowed();
        if (
            selector == IERC20.transfer.selector || selector == IERC20.transferFrom.selector
                || selector == IERC20.approve.selector
        ) revert NotAllowed(); // share tokens are venues too; raw moves of them are never a rule
        rules[target][selector] = Rule(allowed, receiverOffset);
        emit RuleSet(target, selector, allowed, receiverOffset);
    }

    function setApprovalRule(address token, address spender, bool allowed) external onlyOwner {
        if (allowed && spender != address(morpho) && !isVault[spender]) revert NotAllowed(); // only trusted venues
        if (token == address(stakeToken) && address(stakeToken) != address(0)) revert NotAllowed();
        approvals[token][spender] = allowed;
        emit ApprovalRuleSet(token, spender, allowed);
    }

    function addMarket(MarketParams calldata mp) external onlyOwner {
        if (mp.loanToken != address(asset)) revert WrongAsset();
        if (markets.length >= MAX_MARKETS) revert TooMany();
        Id id = mp.id();
        if (isMarket[id]) revert AlreadySet();
        isMarket[id] = true;
        markets.push(mp);
        emit MarketAdded(id);
    }

    function removeMarket(uint256 i) external onlyOwner {
        if (morpho.expectedSupplyAssets(markets[i], address(this)) != 0) revert NotAllowed(); // exit first
        Id id = markets[i].id();
        isMarket[id] = false;
        markets[i] = markets[markets.length - 1];
        markets.pop();
        emit MarketRemoved(id);
    }

    function removeVault(uint256 i) external onlyOwner {
        address vault = vaults[i];
        if (IERC4626(vault).balanceOf(address(this)) != 0) revert NotAllowed(); // exit first
        isVault[vault] = false;
        vaults[i] = vaults[vaults.length - 1];
        vaults.pop();
        emit VaultRemoved(vault);
    }

    /// @notice Drop a venue without calling it, for one whose view reverts. Any position there is abandoned
    ///         from the valuation on purpose; the agent can still not reach it afterwards.
    function forceRemoveMarket(uint256 i) external onlyOwner {
        Id id = markets[i].id();
        isMarket[id] = false;
        markets[i] = markets[markets.length - 1];
        markets.pop();
        emit MarketRemoved(id);
    }

    function forceRemoveVault(uint256 i) external onlyOwner {
        address vault = vaults[i];
        isVault[vault] = false;
        vaults[i] = vaults[vaults.length - 1];
        vaults.pop();
        emit VaultRemoved(vault);
    }

    function addVault(address vault) external onlyOwner {
        if (vault == address(this) || vault == address(asset)) revert WrongAsset();
        if (IERC4626(vault).asset() != address(asset)) revert WrongAsset();
        if (vaults.length >= MAX_MARKETS) revert TooMany();
        if (isVault[vault]) revert AlreadySet();
        isVault[vault] = true;
        vaults.push(vault);
        emit VaultAdded(vault);
    }

    /// @notice One-way. Turns the stake gate on. Stakes are quoted in ORPH wei per 1 USDC (1e6).
    function setStakeToken(IERC20 token, uint256 stakePerAsset_) external onlyOwner {
        if (address(stakeToken) != address(0)) revert AlreadySet();
        if (address(token) == address(asset) || isVault[address(token)] || address(token) == address(morpho)) {
            revert WrongAsset();
        }
        stakeToken = token;
        stakePerAsset = stakePerAsset_;
        emit StakeTokenSet(address(token), stakePerAsset_);
    }

    function setStakePerAsset(uint256 stakePerAsset_) external onlyOwner {
        stakePerAsset = stakePerAsset_;
        emit StakePerAssetSet(stakePerAsset_);
    }

    function setDepositCap(uint256 cap) external onlyOwner {
        depositCap = cap;
        emit DepositCapSet(cap);
    }

    function setDepositsPaused(bool paused) external onlyOwner {
        depositsPaused = paused;
        emit DepositsPaused(paused);
    }
}
