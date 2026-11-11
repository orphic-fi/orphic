// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// CUSTOM, UNAUDITED. Owner-only venue and rule admin for JuniorVault, moved out of its bytecode (EIP-170 headroom).
// Every function is `public`, so JuniorVault reaches it by DELEGATECALL and it runs on JuniorVault's storage with
// JuniorVault as `address(this)` and `msg.sender`. The `onlyOwner` check stays in JuniorVault's wrapper: calling this
// library directly only touches the library's own (empty) storage and holds nothing.

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IMorpho, MarketParams, Id} from "morpho-blue/interfaces/IMorpho.sol";
import {MarketParamsLib} from "morpho-blue/libraries/MarketParamsLib.sol";
import {MorphoBalancesLib} from "morpho-blue/libraries/periphery/MorphoBalancesLib.sol";

library VenueAdmin {
    using SafeERC20 for IERC20;
    using MarketParamsLib for MarketParams;
    using MorphoBalancesLib for IMorpho;

    uint256 internal constant MAX_MARKETS = 16;

    /// @dev Same layout as the agent allowlist entry JuniorVault stores.
    struct Rule {
        bool allowed;
        uint256 receiverOffset;
    }

    // Same signatures as JuniorVault's own, so selectors and topics are identical.
    error WrongAsset();
    error TooMany();
    error AlreadySet();
    error NotAllowed();

    event MarketAdded(Id indexed id);
    event VaultAdded(address indexed vault);
    event MarketRemoved(Id indexed id);
    event VaultRemoved(address indexed vault);
    event RuleSet(address indexed target, bytes4 indexed selector, bool allowed, uint256 receiverOffset);
    event ApprovalRuleSet(address indexed token, address indexed spender, bool allowed);

    function addMarket(
        MarketParams[] storage markets,
        mapping(Id => bool) storage isMarket,
        MarketParams calldata mp,
        address asset
    ) public {
        if (mp.loanToken != asset) revert WrongAsset();
        if (markets.length >= MAX_MARKETS) revert TooMany();
        Id id = mp.id();
        if (isMarket[id]) revert AlreadySet();
        isMarket[id] = true;
        markets.push(mp);
        emit MarketAdded(id);
    }

    function removeMarket(
        MarketParams[] storage markets,
        mapping(Id => bool) storage isMarket,
        uint256 i,
        IMorpho morpho,
        address asset
    ) public {
        if (morpho.expectedSupplyAssets(markets[i], address(this)) != 0) revert NotAllowed(); // exit first
        _dropMarket(markets, isMarket, i, address(morpho), asset);
    }

    function forceRemoveMarket(
        MarketParams[] storage markets,
        mapping(Id => bool) storage isMarket,
        uint256 i,
        address morpho,
        address asset
    ) public {
        _dropMarket(markets, isMarket, i, morpho, asset);
    }

    /// @dev Morpho serves every market, so its USDC allowance is zeroed only when the last market is gone; a removed
    ///      market is already dead for the agent (`isMarket`), the allowance only matters once none is left.
    function _dropMarket(
        MarketParams[] storage markets,
        mapping(Id => bool) storage isMarket,
        uint256 i,
        address morpho,
        address asset
    ) private {
        Id id = markets[i].id();
        isMarket[id] = false;
        markets[i] = markets[markets.length - 1];
        markets.pop();
        if (markets.length == 0) IERC20(asset).forceApprove(morpho, 0);
        emit MarketRemoved(id);
    }

    function addVault(address[] storage vaults, mapping(address => bool) storage isVault, address vault, address asset)
        public
    {
        if (vault == address(this) || vault == asset) revert WrongAsset();
        if (IERC4626(vault).asset() != asset) revert WrongAsset();
        if (vaults.length >= MAX_MARKETS) revert TooMany();
        if (isVault[vault]) revert AlreadySet();
        isVault[vault] = true;
        vaults.push(vault);
        emit VaultAdded(vault);
    }

    function removeVault(address[] storage vaults, mapping(address => bool) storage isVault, uint256 i, address asset)
        public
    {
        if (IERC4626(vaults[i]).balanceOf(address(this)) != 0) revert NotAllowed(); // exit first
        _dropVault(vaults, isVault, i, asset);
    }

    function forceRemoveVault(
        address[] storage vaults,
        mapping(address => bool) storage isVault,
        uint256 i,
        address asset
    ) public {
        _dropVault(vaults, isVault, i, asset);
    }

    /// @dev The USDC allowance this contract gave the vault is zeroed with it, so a re-listed or hostile vault finds none.
    function _dropVault(address[] storage vaults, mapping(address => bool) storage isVault, uint256 i, address asset)
        private
    {
        address vault = vaults[i];
        isVault[vault] = false;
        vaults[i] = vaults[vaults.length - 1];
        vaults.pop();
        IERC20(asset).forceApprove(vault, 0);
        emit VaultRemoved(vault);
    }

    function setRule(
        mapping(address => mapping(bytes4 => Rule)) storage rules,
        mapping(address => bool) storage isVault,
        address morpho,
        address target,
        bytes4 selector,
        bool allowed,
        uint256 receiverOffset
    ) public {
        // targets are the valuation universe and nothing else: never the asset, never the stake token, never arbitrary
        if (allowed && target != morpho && !isVault[target]) revert NotAllowed();
        if (
            selector == IERC20.transfer.selector || selector == IERC20.transferFrom.selector
                || selector == IERC20.approve.selector
        ) revert NotAllowed(); // share tokens are venues too; raw moves of them are never a rule
        rules[target][selector] = Rule(allowed, receiverOffset);
        emit RuleSet(target, selector, allowed, receiverOffset);
    }

    function setApprovalRule(
        mapping(address => mapping(address => bool)) storage approvals,
        mapping(address => bool) storage isVault,
        address morpho,
        address stakeToken,
        address token,
        address spender,
        bool allowed
    ) public {
        if (allowed && spender != morpho && !isVault[spender]) revert NotAllowed(); // only trusted venues
        if (token == stakeToken && stakeToken != address(0)) revert NotAllowed();
        approvals[token][spender] = allowed;
        emit ApprovalRuleSet(token, spender, allowed);
    }
}
