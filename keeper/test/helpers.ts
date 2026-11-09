import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Hex } from "viem";
import { loadConfig, type SeniorConfig } from "../src/config.js";
import { parseApiMarkets, type ApiMarketItem, type FetchLike } from "../src/data/morpho.js";
import type { FelixData, MarketData, VaultState } from "../src/types.js";

const here = dirname(fileURLToPath(import.meta.url));
export const fixturesDir = resolve(here, "fixtures");

export const K62: Hex = "0xe7aa046832007a975d4619260d221229e99cc27da2e6ef162881202b4cd2349b";
export const K77: Hex = "0x96c47d3797394dd25e33f814216793a89d2e6edcc54d1dac3ab4c2b2d82a73b9";
export const WHYPE: Hex = "0xd7d38220652d19c87099c3b23de9a70a1893620a050c635d1a94bd947c9c59a8";
export const UBTC: Hex = "0x45af9c72aa97978e143a646498c8922058b7c6f18b6f7b05d7316c8cf7ab942f";
export const BANNED: Hex = "0x8eecdd03f1e12e03c04abefdb3f536067e071ad2c3f63e7b04c9a034889d0ba5";
export const FULL: Hex = "0xaaaa000000000000000000000000000000000000000000000000000000000001";
export const WILD: Hex = "0xaaaa000000000000000000000000000000000000000000000000000000000002";

export function fixture<T = unknown>(name: string): T {
  return JSON.parse(readFileSync(resolve(fixturesDir, name), "utf8")) as T;
}

export function cfg(overrides: Partial<SeniorConfig> = {}): SeniorConfig {
  const base = loadConfig();
  return structuredClone({ ...base, ...overrides, constraints: { ...base.constraints, ...(overrides.constraints ?? {}) }, economics: { ...base.economics, ...(overrides.economics ?? {}) } });
}

/** The pre-deploy shape of the config: every Orphic address still a placeholder. Tests of placeholder handling use this. */
export function placeholderCfg(overrides: Partial<SeniorConfig> = {}): SeniorConfig {
  const c = cfg(overrides);
  c.vault = "0xTODO";
  c.junior = "0xTODO";
  c.orph = "0xTODO";
  c.poolId = "0xTODO";
  c.adapters = { ...c.adapters, morphoMarketV1: "0xTODO", morphoVaultV1: "0xTODO" };
  delete c.felixAdapter;
  return c;
}

export function markets(): MarketData[] {
  const raw = fixture<{ data: { markets: { items: ApiMarketItem[] } } }>("markets-api.json");
  return parseApiMarkets(raw.data.markets.items);
}

export function felix(overrides: Partial<FelixData> = {}): FelixData {
  return { address: "0x8A862fD6c12f9ad34C9c2ff45AB2b6712e8CEa27", totalAssets: 40_000_000, apy: 0.058, netApy: 0.052, fee: 0.1, source: "api", ...overrides };
}

export function state(overrides: Partial<VaultState> = {}, c: SeniorConfig = cfg()): VaultState {
  const base: VaultState = {
    totalAssets: 2_000_000,
    idle: 40_000,
    positions: { felix: 1_960_000, [K62]: 0, [K77]: 0, [WHYPE]: 0, [UBTC]: 0 },
    caps: c.dryRunCaps,
    source: "fixture",
  };
  return { ...base, ...overrides, positions: { ...base.positions, ...(overrides.positions ?? {}) }, caps: { ...base.caps, ...(overrides.caps ?? {}) } };
}

/** A state already sitting on the target mix. */
export function stateAtTarget(total = 2_000_000, c: SeniorConfig = cfg()): VaultState {
  const positions: Record<string, number> = {};
  let idle = 0;
  for (const t of c.targets) {
    if (t.key === "idle") idle = total * t.weight;
    else positions[t.key] = total * t.weight;
  }
  return { totalAssets: total, idle, positions, caps: c.dryRunCaps, source: "fixture" };
}

/** fetch stub that routes GraphQL queries and the HyperLend URL to fixtures. */
export function fakeFetch(opts: { failMarkets?: boolean; failAll?: boolean } = {}): FetchLike {
  return async (url, init) => {
    if (opts.failAll) throw new Error("network down");
    const body = init?.body ? (JSON.parse(String(init.body)) as { query: string }) : undefined;
    let payload: unknown;
    if (url.includes("hyperlend")) payload = fixture("hyperlend-api.json");
    else if (body?.query.includes("markets(")) {
      if (opts.failMarkets) return new Response("boom", { status: 500 });
      payload = fixture("markets-api.json");
    } else if (body?.query.includes("vaults(")) payload = fixture("vaults-api.json");
    else if (body?.query.includes("assets(")) payload = fixture("price-api.json");
    else return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });
  };
}
