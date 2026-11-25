// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";

/// @notice Size gate. HyperEVM enforces EIP-170 (24,576 B runtime) and EIP-3860 (49,152 B initcode); measured with
///         read-only eth_call creates on 12 Nov 2026. foundry.toml's `code_size_limit` is raised for the tests, so
///         without this test an overflow would pass the suite and fail at deployment. No fork needed.
///         `type(X).runtimeCode` is unavailable for contracts with immutables, so the compiled artifacts are read
///         (`getDeployedCode` keeps the immutable slots at their full 32-byte length). Every deployable contract in
///         `src` belongs here: add new ones when they are added.
contract SizeTest is Test {
    uint256 constant MAX_RUNTIME = 24_576;
    uint256 constant MAX_INITCODE = 49_152;

    function _check(string memory artifact) internal {
        uint256 runtime = vm.getDeployedCode(artifact).length;
        uint256 creation = vm.getCode(artifact).length;
        emit log_named_uint(string.concat(artifact, " runtime"), runtime);
        emit log_named_uint(string.concat(artifact, " initcode"), creation);
        assertGt(runtime, 0, "empty runtime");
        assertLe(runtime, MAX_RUNTIME, "runtime over EIP-170");
        assertLe(creation, MAX_INITCODE, "initcode over EIP-3860");
    }

    function test_JuniorVaultFitsLimits() public {
        _check("JuniorVault.sol:JuniorVault");
    }

    function test_FeeRouterFitsLimits() public {
        _check("FeeRouter.sol:FeeRouter");
    }

    function test_ORPHFitsLimits() public {
        _check("ORPH.sol:ORPH");
    }

    function test_TeamVestingFitsLimits() public {
        _check("TeamVesting.sol:TeamVesting");
    }

    function test_SeniorShareGateFitsLimits() public {
        _check("SeniorShareGate.sol:SeniorShareGate");
    }

    function test_HoneypotProbeFitsLimits() public {
        _check("HoneypotProbe.sol:HoneypotProbe");
    }

    /// @dev The launch-day launcher (script 05 deploys it).
    function test_SeedLauncherFitsLimits() public {
        _check("SeedLauncher.sol:SeedLauncher");
    }
}
