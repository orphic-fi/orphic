import type { Address } from 'viem'

/**
 * Demo mode: fixture values for screenshots. Enabled only by VITE_DEMO=1 on the dev server.
 * A production build with demo on throws at startup (see main.tsx), so it cannot ship.
 */
export const DEMO = import.meta.env.VITE_DEMO === '1'

export type DemoScenario = 'base' | 'cover'

export function demoScenario(): DemoScenario {
  if (!DEMO || typeof window === 'undefined') return 'base'
  return new URLSearchParams(window.location.search).get('scenario') === 'cover' ? 'cover' : 'base'
}

export const DEMO_ACCOUNT: Address = '0x2D00000000000000000000000000000000000FecC'

const DAY = 86_400

/** Fixed at module load so demo renders stay pure. */
export const DEMO_LOADED_AT_MS = Date.now()

/** Most recent Sunday 00:00 UTC at or before now. */
export function lastSundayUtc(nowSec: number): number {
  const d = new Date(nowSec * 1000)
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000
  return midnight - d.getUTCDay() * DAY
}

export function demoFixture(scenario: DemoScenario) {
  const now = Math.floor(DEMO_LOADED_AT_MS / 1000)
  const lastSettle = lastSundayUtc(now)
  return {
    senior: {
      totalAssets: 212_400_000_000n, // $212,400
      shares: 998_400_000_000_000_000_000n, // 998.4 osUSDC, 18 decimals
      assets: 1_000_000_000n, // $1,000.00
      maxWithdraw: 1_000_000_000n,
      availableLiquidity: 21_240_000_000n, // $21,240 idle
      maxRate: scenario === 'cover' ? 63_419_583_967n : 0n,
      coverInProgress: scenario === 'cover' ? 1_850_000_000n : 0n,
      // 1 osUSDC = 1.0016 USDC
      pricePerShare: 1_001_600n,
    },
    junior: {
      totalAssets: 38_200_000_000n, // $38,200
      depositCap: 75_000_000_000n,
      shares: 4_000_000_000_000_000_000_000n, // 4,000 ojUSDC
      pricePerShare: 1_000_000_000_000_000_000n, // 1.00
      stakeBps: 2000n,
      paused: false,
      stakeToken: '0x0000000000000000000000000000000000000001' as Address,
      stakePerAsset: 40_000n * 10n ** 18n, // 40,000 ORPH per USDC unit (1e6)
      pendingStakePerAsset: 0n,
      stakeEta: 0n,
      walletCap: 10_000_000_000n, // $10,000
      lastSettle: BigInt(lastSettle),
      settlesLength: 1n,
      exit: { shares: 1_000n * 10n ** 18n, readyAt: BigInt(lastSettle + 7 * DAY) },
    },
    wallet: {
      usdc: 5_250_000_000n, // $5,250.00
      usdcAllowance: 0n,
      orph: 250_000_000n * 10n ** 18n, // 250,000,000 ORPH
      orphAllowance: 0n,
    },
    block: 50_666_120n,
  }
}
