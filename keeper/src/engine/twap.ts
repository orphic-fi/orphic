/**
 * ORPH price record. Uniswap v4 has no on-chain TWAP, so the keeper samples the
 * pool every tick and keeps its own time-weighted average.
 */

const Q96 = 2n ** 96n;
const Q192 = 2n ** 192n;
const WAD = 10n ** 18n;

export interface PriceSample {
  /** Unix seconds. */
  timestamp: number;
  sqrtPriceX96: string;
  tick?: number;
  orphPerHype: number;
  hypeUsd: number;
  orphUsd: number;
}

/**
 * sqrtPriceX96 is sqrt(currency1 / currency0) in Q64.96. With currency0 = HYPE and
 * currency1 = ORPH, price = (sqrtPriceX96 / 2^96)^2 = ORPH per HYPE. Both tokens
 * have 18 decimals so no decimal adjustment is needed. 2^96 means exactly 1.
 */
export function sqrtPriceX96ToOrphPerHype(sqrtPriceX96: bigint): number {
  if (sqrtPriceX96 <= 0n) return 0;
  const scaled = (sqrtPriceX96 * sqrtPriceX96 * WAD) / Q192; // price * 1e18
  return Number(scaled) / 1e18;
}

export { Q96 };

/**
 * Time-weighted average of orphUsd over the window [now - window, now].
 * Each sample holds its price until the next sample (piecewise constant). The last
 * sample holds until now. A sample taken before the window is clipped to the window
 * start so the early part of the window is not left unweighted. Returns null when
 * nothing falls inside the window.
 */
export function twap(samples: PriceSample[], nowTs: number, windowSec: number): { twap: number; sampleCount: number } | null {
  const sorted = [...samples].filter((s) => s.orphUsd > 0 && Number.isFinite(s.orphUsd)).sort((a, b) => a.timestamp - b.timestamp);
  const start = nowTs - windowSec;
  let weighted = 0;
  let total = 0;
  let count = 0;
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]!;
    const from = Math.max(s.timestamp, start);
    const to = Math.min(i + 1 < sorted.length ? sorted[i + 1]!.timestamp : nowTs, nowTs);
    if (to <= from) continue;
    weighted += s.orphUsd * (to - from);
    total += to - from;
    count++;
  }
  if (total <= 0) return null;
  return { twap: weighted / total, sampleCount: count };
}

/** stakePerAsset = floor(usdPerAsset / orphUsdTwap * 1e18), ORPH wei per 1 USDC. */
export function stakePerAsset(usdPerAsset: number, orphUsdTwap: number): bigint {
  if (!(orphUsdTwap > 0) || !(usdPerAsset > 0)) return 0n;
  const usdWei = BigInt(Math.round(usdPerAsset * 1e18));
  const twapWei = BigInt(Math.round(orphUsdTwap * 1e18));
  return (usdWei * WAD) / twapWei;
}

/** Drop samples older than the retention window. */
export function pruneSamples(samples: PriceSample[], nowTs: number, retentionSec: number): PriceSample[] {
  return samples.filter((s) => s.timestamp >= nowTs - retentionSec);
}
