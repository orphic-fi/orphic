// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// OpenZeppelin VestingWallet with a cliff. The only code here is the constructor wiring; vesting logic is OZ's.
// Linear vest over `duration` from `start`, nothing claimable before `start + cliff`. Beneficiary is the owner.

import {VestingWallet} from "@openzeppelin/contracts/finance/VestingWallet.sol";
import {VestingWalletCliff} from "@openzeppelin/contracts/finance/VestingWalletCliff.sol";

contract TeamVesting is VestingWalletCliff {
    constructor(address beneficiary, uint64 start, uint64 duration, uint64 cliff)
        VestingWallet(beneficiary, start, duration)
        VestingWalletCliff(cliff)
    {}
}
