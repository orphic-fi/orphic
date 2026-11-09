import type { Address } from 'viem'

// Flip to true once the Monday deploy batch has landed and the addresses below are filled in.
// While false: figures come from the Morpho API only and write buttons are disabled.
export const DEPLOYED = true

export const OPENS_LABEL = 'Opens Monday 9 Nov'

/** Share token symbols shown in summaries. */
export const SENIOR_SYMBOL = 'osUSDC'
export const JUNIOR_SYMBOL = 'ojUSDC'

export const ZERO: Address = '0x0000000000000000000000000000000000000000'

export const addresses = {
  hyperEvm: {
    // HyperEVM USDC, 6 decimals. Verified on-chain (asset() of Felix USDC).
    usdc: '0xb88339CB7199b77E23DB6E890353E22632Ba630f' as Address,
    // Orphic senior: Morpho Vault V2, deployed 8 Nov 2026 (block 50747831).
    senior: '0x3F7382bd8BFC6C548CAa2D7B4dfCe628B12A9759' as Address,
    // Orphic junior: JuniorVault, deployed 8 Nov 2026 (block 50748319).
    junior: '0x20D5F4f78858D257eA047EB5F47773E361697F2E' as Address,
    // FeeRouter, deployed 8 Nov 2026.
    feeRouter: '0xC2d2C5e56798Bfd0EEc67EEC12ddC2b521b1aA37' as Address,
    // Felix USDC v1.1 (MetaMorpho), senior's liquidity adapter target, and the adapter that holds it.
    felixVault: '0x8A862fD6c12f9ad34C9c2ff45AB2b6712e8CEa27' as Address,
    felixAdapter: '0x0cdfdbC51744Ba1ed88bB8752098105fb43f37AC' as Address,
    // ORPH stake token. Placeholder until deployment.
    orph: ZERO,
    // Reference vault used for APY and TVL while our vault does not exist.
    referenceVault: '0x51254785367d73A10a2Ea7d44B8e97b749BfbE8b' as Address,
    referenceLabel: 'reference: Felix USDC V2',
  },
  elysium: {
    // Bridged USDC on Elysium. Derivable only once the mainnet router is published.
    usdc: ZERO,
    // Entry contract on Elysium that bridges to HyperEVM. Placeholder.
    bridgeEntry: ZERO,
  },
} as const

export const ops = {
  lastSettle: null as number | null,
  paused: false,
  settleDay: 'Monday',
  settleHour: '09:00 ET',
  caps: {
    seniorUsd: 425_000,
    juniorUsd: 75_000,
  },
}

export const morphoChainId = 999
