import type { Address } from 'viem'

// Flip to true once the Monday deploy batch has landed and the addresses below are filled in.
// While false: figures come from the Morpho API only and write buttons are disabled.
export const DEPLOYED = false

export const OPENS_LABEL = 'Opens Monday 9 Nov'

/** Share token symbols shown in summaries. */
export const SENIOR_SYMBOL = 'osUSDC'
export const JUNIOR_SYMBOL = 'ojUSDC'

export const ZERO: Address = '0x0000000000000000000000000000000000000000'

export const addresses = {
  hyperEvm: {
    // HyperEVM USDC, 6 decimals. Verified on-chain (asset() of Felix USDC).
    usdc: '0xb88339CB7199b77E23DB6E890353E22632Ba630f' as Address,
    // Orphic senior: a Morpho Vault V2. Placeholder until deployment.
    senior: ZERO,
    // Orphic junior: custom contract. Placeholder until deployment.
    junior: ZERO,
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
