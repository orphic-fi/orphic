import type { Address } from "viem";
import type { HyperlendRate } from "../types.js";
import type { FetchLike } from "./morpho.js";

/** Raw shape: map keyed by token address, values already in percent (6.91 means 6.91%). */
export type HyperlendRaw = Record<
  string,
  { supplyAPR?: number | string; supplyAPY?: number | string; borrowAPR?: number | string; borrowAPY?: number | string; symbol?: string }
>;

const pct = (v: number | string | undefined): number => {
  const n = typeof v === "string" ? Number(v) : v ?? 0;
  return Number.isFinite(n) ? n / 100 : 0;
};

export function parseHyperlend(raw: HyperlendRaw): HyperlendRate[] {
  return Object.entries(raw)
    .filter(([k]) => /^0x[0-9a-fA-F]{40}$/.test(k))
    .map(([token, v]) => ({
      token: token as Address,
      symbol: v.symbol,
      supplyApr: pct(v.supplyAPR),
      supplyApy: pct(v.supplyAPY),
      borrowApr: pct(v.borrowAPR),
      borrowApy: pct(v.borrowAPY),
    }));
}

/**
 * HyperLend is a data source only. There is no adapter for it yet, so the result is
 * included in the report for the dashboard and never enters the allocation decision.
 */
export async function fetchHyperlend(url: string, fetchFn: FetchLike = fetch): Promise<HyperlendRate[]> {
  const res = await fetchFn(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HyperLend HTTP ${res.status}`);
  const body = (await res.json()) as HyperlendRaw;
  return parseHyperlend(body);
}

export function hyperlendUsdc(rates: HyperlendRate[], usdc: Address): HyperlendRate | undefined {
  return rates.find((r) => r.token.toLowerCase() === usdc.toLowerCase());
}
