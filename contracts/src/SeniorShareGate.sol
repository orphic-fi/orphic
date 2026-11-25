// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// CUSTOM, UNAUDITED. Small on purpose: one view, no state, no owner.

import {IReceiveSharesGate} from "vault-v2/interfaces/IGate.sol";

interface IJuniorCover {
    function coverPending() external view returns (uint256);
    function coverInProgress() external view returns (uint256);
}

/// @title SeniorShareGate
/// @notice Morpho Vault V2 receive-shares gate for Orphic's senior vault. While senior is carrying a loss that junior
///         has not yet covered, or a cover that senior's smoothed share price has not yet recognised, nobody new may
///         receive senior shares: no deposits, no transfers in. That closes the two ways an outsider could take part of
///         junior's cover (review H-2, exit then buy back; review M-1, deposit in the cover block). Existing holders
///         can still withdraw. Junior itself is always allowed, so its management-fee shares keep minting.
///         If junior's views revert, receiving is refused: a blocked deposit costs nothing, a leaked cover does.
contract SeniorShareGate is IReceiveSharesGate {
    address public immutable junior;

    constructor(address junior_) {
        junior = junior_;
    }

    function canReceiveShares(address account) external view returns (bool) {
        if (account == junior) return true;
        (bool ok, bytes memory ret) = junior.staticcall(abi.encodeCall(IJuniorCover.coverPending, ()));
        if (!ok || ret.length != 32 || abi.decode(ret, (uint256)) != 0) return false;
        (ok, ret) = junior.staticcall(abi.encodeCall(IJuniorCover.coverInProgress, ()));
        return ok && ret.length == 32 && abi.decode(ret, (uint256)) == 0;
    }
}
