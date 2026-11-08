// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Id} from "morpho-blue/interfaces/IMorpho.sol";

/// HyperEVM (chain 999) addresses, each read back on-chain on 7 Nov 2026. See FACTS.md.
abstract contract Addresses {
    address constant USDC = 0xb88339CB7199b77E23DB6E890353E22632Ba630f;
    address constant USDT0 = 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb;
    address constant WHYPE = 0x5555555555555555555555555555555555555555;
    address constant MORPHO = 0x68e37dE8d93d3496ae143F2E900490f6280C57cD;
    address constant V2_FACTORY = 0xD7217E5687FF1071356C780b5fe4803D9D967da7;
    address constant MARKET_ADAPTER_FACTORY = 0xaEff6Ef4B7bbfbAadB18b634A8F11392CBeB72Be;
    address constant VAULT_ADAPTER_FACTORY = 0xdf5202e29654e02011611A086f15477880580CAc;
    address constant METAMORPHO_V11_FACTORY = 0xec051b19d654C48c357dC974376DeB6272f24e53;
    address constant FELIX_USDC_V1 = 0x8A862fD6c12f9ad34C9c2ff45AB2b6712e8CEa27;
    address constant FELIX_USDC_V2 = 0x51254785367d73A10a2Ea7d44B8e97b749BfbE8b;
    address constant ADAPTIVE_CURVE_IRM = 0xD4a426F010986dCad727e8dd6eed44cA4A9b7483;
    address constant SAFE_SINGLETON_141 = 0x41675C099F32341bf84BFc5382aF534df5C7461a;
    address constant SAFE_PROXY_FACTORY_141 = 0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67;
    address constant ZODIAC_ROLES_V2 = 0x9646fDAD06d3e24444381f44362a3B0eB343D337;
    address constant CORE_WRITER = 0x3333333333333333333333333333333333333333;

    Id constant MKT_KHYPE_625 = Id.wrap(0xe7aa046832007a975d4619260d221229e99cc27da2e6ef162881202b4cd2349b);
    Id constant MKT_KHYPE_77 = Id.wrap(0x96c47d3797394dd25e33f814216793a89d2e6edcc54d1dac3ab4c2b2d82a73b9);
    Id constant MKT_WHYPE_77 = Id.wrap(0xd7d38220652d19c87099c3b23de9a70a1893620a050c635d1a94bd947c9c59a8);
    Id constant MKT_UBTC_77 = Id.wrap(0x45af9c72aa97978e143a646498c8922058b7c6f18b6f7b05d7316c8cf7ab942f);

    uint256 constant MGMT_FEE_PER_SEC = uint256(0.005e18) / uint256(365 days); // 0.5% a year, to junior
    uint256 constant MAX_RATE_PER_SEC = uint256(2e18) / uint256(365 days); // 200% a year ceiling, as Felix
    uint256 constant TIMELOCK = 3 days;

    // Orphic roles (Cashout, 8 Nov 01:34)
    address constant JUNIOR_OWNER = 0x2DBE1Ba83084dAF698Acea79CBAfe0493f42FecC; // hardware wallet: junior and router owner
    address constant SENIOR_SAFE = 0x9EDfDc92A46adbfa7b6189295376bEF4599c5F29; // Safe: senior owner and curator after setup
}
