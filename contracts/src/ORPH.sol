// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// Standard OpenZeppelin ERC-20 with permit. Fixed supply, minted once to the recipient given at deploy.
// No owner, no mint, no pause, no fee logic. Nothing here is custom beyond the constructor.

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract ORPH is ERC20, ERC20Permit {
    constructor(address recipient, uint256 supply) ERC20("Orphic", "ORPH") ERC20Permit("Orphic") {
        _mint(recipient, supply);
    }
}
