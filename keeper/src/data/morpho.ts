import { createPublicClient, http, type Address, type Hex, type PublicClient } from "viem";
import type { SeniorConfig } from "../config.js";
import type { FelixData, MarketData, MarketParams } from "../types.js";
import { morphoBlueAbi, irmAbi } from "../abi/morphoBlue.js";
import { erc4626Abi } from "../abi/erc20.js";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const SECONDS_PER_YEAR = 365 * 24 * 3600;
const WAD = 1e18;

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

export const MARKETS_QUERY = `
query OrphicMarkets($chainId: Int!, $loan: [String!]!) {
  markets(where: { chainId_in: [$chainId], loanAssetAddress_in: $loan }, first: 200) {
    items {
      marketId
      lltv
      irmAddress
      loanAsset { symbol address }
      collateralAsset { symbol address }
      oracle { address }
      state { supplyAssetsUsd borrowAssetsUsd liquidityAssetsUsd supplyApy utilization fee }
    }
  }
}`;

export const VAULTS_QUERY = `
query OrphicVaults($chainId: Int!) {
  vaults(where: { chainId_in: [$chainId] }, first: 200) {
    items { address symbol state { totalAssetsUsd apy netApy fee } }
  }
}`;

export const ASSET_PRICE_QUERY = `
query OrphicAssets($chainId: Int!, $symbols: [String!]!) {
  assets(where: { chainId_in: [$chainId], symbol_in: $symbols }, first: 10) {
    items { address symbol price { usd } }
  }
}`;

async function gql<T>(fetchFn: FetchLike, url: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetchFn(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Morpho API HTTP ${res.status}`);
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors?.length) throw new Error(`Morpho API: ${body.errors.map((e) => e.message).join("; ")}`);
  if (!body.data) throw new Error("Morpho API: empty data");
  return body.data;
}

/** Raw market item shape returned by the Morpho API. Exported for fixtures. */
export interface ApiMarketItem {
  marketId: string;
  lltv: string | number;
  irmAddress: string;
  loanAsset: { symbol: string; address: string };
  collateralAsset: { symbol: string; address: string } | null;
  oracle: { address: string } | null;
  state: {
    supplyAssetsUsd: number | null;
    borrowAssetsUsd: number | null;
    liquidityAssetsUsd: number | null;
    supplyApy: number | null;
    utilization: number | null;
    fee?: number | null;
  } | null;
}

export function parseApiMarkets(items: ApiMarketItem[]): MarketData[] {
  const out: MarketData[] = [];
  for (const it of items) {
    const id = it.marketId as Hex | undefined;
    if (!id || !it.state || !it.collateralAsset || !it.oracle) continue;
    const lltvWad = BigInt(String(it.lltv));
    out.push({
      id: id.toLowerCase() as Hex,
      params: {
        loanToken: it.loanAsset.address as Address,
        collateralToken: it.collateralAsset.address as Address,
        oracle: it.oracle.address as Address,
        irm: it.irmAddress as Address,
        lltv: lltvWad,
      },
      collateralSymbol: it.collateralAsset.symbol,
      lltv: Number(lltvWad) / WAD,
      supplyAssets: it.state.supplyAssetsUsd ?? 0,
      borrowAssets: it.state.borrowAssetsUsd ?? 0,
      liquidityAssets: it.state.liquidityAssetsUsd ?? 0,
      supplyApy: it.state.supplyApy ?? 0,
      utilization: it.state.utilization ?? 0,
      fee: it.state.fee ?? 0,
      source: "api",
    });
  }
  return out;
}

export async function fetchMarketsFromApi(cfg: SeniorConfig, fetchFn: FetchLike = fetch): Promise<MarketData[]> {
  const data = await gql<{ markets: { items: ApiMarketItem[] } }>(fetchFn, cfg.morphoApi, MARKETS_QUERY, {
    chainId: cfg.chainId,
    loan: [cfg.usdc.toLowerCase()],
  });
  const parsed = parseApiMarkets(data.markets.items);
  if (parsed.length === 0) throw new Error("Morpho API returned no USDC markets");
  return parsed;
}

export async function fetchFelixFromApi(cfg: SeniorConfig, fetchFn: FetchLike = fetch): Promise<FelixData> {
  const data = await gql<{ vaults: { items: { address: string; symbol: string; state: { totalAssetsUsd: number; apy: number; netApy: number; fee: number } | null }[] } }>(
    fetchFn,
    cfg.morphoApi,
    VAULTS_QUERY,
    { chainId: cfg.chainId },
  );
  const hit = data.vaults.items.find((v) => v.address.toLowerCase() === cfg.felix.address.toLowerCase());
  if (!hit || !hit.state) throw new Error("Felix vault not found in Morpho API");
  return {
    address: cfg.felix.address,
    totalAssets: hit.state.totalAssetsUsd ?? 0,
    apy: hit.state.apy ?? 0,
    netApy: hit.state.netApy ?? hit.state.apy ?? 0,
    fee: hit.state.fee ?? 0,
    source: "api",
  };
}

export async function fetchHypePriceFromApi(cfg: SeniorConfig, fetchFn: FetchLike = fetch): Promise<number> {
  const data = await gql<{ assets: { items: { address: string; symbol: string; price: { usd: number } | null }[] } }>(
    fetchFn,
    cfg.morphoApi,
    ASSET_PRICE_QUERY,
    { chainId: cfg.chainId, symbols: ["WHYPE", "HYPE"] },
  );
  const hit = data.assets.items.find((a) => a.price && a.price.usd > 0);
  if (!hit || !hit.price) throw new Error("no HYPE price in Morpho API");
  return hit.price.usd;
}

// ---------------------------------------------------------------------------
// On-chain fallback
// ---------------------------------------------------------------------------

export function makePublicClient(rpcUrl: string): PublicClient {
  return createPublicClient({ transport: http(rpcUrl, { timeout: 20_000, retryCount: 2 }) });
}

/** Adaptive Curve IRM returns a per-second borrow rate in WAD. Convert to APY fraction. */
export function perSecondWadToApy(ratePerSecondWad: bigint): number {
  const r = Number(ratePerSecondWad) / WAD;
  return Math.exp(r * SECONDS_PER_YEAR) - 1;
}

export async function fetchMarketsFromChain(
  cfg: SeniorConfig,
  ids: Hex[],
  client: PublicClient,
  usdcDecimals = cfg.usdcDecimals,
): Promise<MarketData[]> {
  const out: MarketData[] = [];
  const scale = 10 ** usdcDecimals;
  for (const id of ids) {
    const [p, m] = await Promise.all([
      client.readContract({ address: cfg.morphoBlue, abi: morphoBlueAbi, functionName: "idToMarketParams", args: [id] }),
      client.readContract({ address: cfg.morphoBlue, abi: morphoBlueAbi, functionName: "market", args: [id] }),
    ]);
    const params: MarketParams = { loanToken: p[0], collateralToken: p[1], oracle: p[2], irm: p[3], lltv: p[4] };
    if (params.loanToken.toLowerCase() !== cfg.usdc.toLowerCase()) continue;
    const supply = Number(m[0]) / scale;
    const borrow = Number(m[2]) / scale;
    const fee = Number(m[5]) / WAD;
    const util = supply > 0 ? borrow / supply : 0;

    let supplyApy = 0;
    try {
      const marketStruct = { totalSupplyAssets: m[0], totalSupplyShares: m[1], totalBorrowAssets: m[2], totalBorrowShares: m[3], lastUpdate: m[4], fee: m[5] };
      const paramsStruct = { loanToken: params.loanToken, collateralToken: params.collateralToken, oracle: params.oracle, irm: params.irm, lltv: params.lltv };
      const borrowRate = await client.readContract({
        address: params.irm,
        abi: irmAbi,
        functionName: "borrowRateView",
        args: [paramsStruct, marketStruct],
      });
      const borrowApy = perSecondWadToApy(borrowRate);
      supplyApy = borrowApy * util * (1 - fee);
    } catch {
      supplyApy = 0;
    }

    let collateralSymbol = "?";
    try {
      collateralSymbol = await client.readContract({ address: params.collateralToken, abi: erc4626Abi, functionName: "symbol" });
    } catch {
      // symbol is cosmetic
    }

    out.push({
      id: id.toLowerCase() as Hex,
      params,
      collateralSymbol,
      lltv: Number(params.lltv) / WAD,
      supplyAssets: supply,
      borrowAssets: borrow,
      liquidityAssets: Math.max(0, supply - borrow),
      supplyApy,
      utilization: util,
      fee,
      source: "chain",
    });
  }
  return out;
}

export async function fetchFelixFromChain(cfg: SeniorConfig, client: PublicClient, apyFallback = 0): Promise<FelixData> {
  const total = await client.readContract({ address: cfg.felix.address, abi: erc4626Abi, functionName: "totalAssets" });
  return {
    address: cfg.felix.address,
    totalAssets: Number(total) / 10 ** cfg.usdcDecimals,
    apy: apyFallback,
    netApy: apyFallback,
    fee: 0,
    source: "chain",
  };
}

// ---------------------------------------------------------------------------
// Combined loader with fallback
// ---------------------------------------------------------------------------

export interface MorphoLoadResult {
  markets: MarketData[];
  felix: FelixData;
  hypePriceUsd: number;
  hypePriceSource: "api" | "config";
  warnings: string[];
}

export async function loadMorphoData(
  cfg: SeniorConfig,
  opts: { fetchFn?: FetchLike; client?: PublicClient; marketIds: Hex[] },
): Promise<MorphoLoadResult> {
  const fetchFn = opts.fetchFn ?? fetch;
  const warnings: string[] = [];

  let markets: MarketData[];
  try {
    markets = await fetchMarketsFromApi(cfg, fetchFn);
  } catch (err) {
    warnings.push(`Morpho API markets failed: ${(err as Error).message}; using on-chain fallback`);
    if (!opts.client) throw new Error("Morpho API failed and no RPC client for fallback");
    markets = await fetchMarketsFromChain(cfg, opts.marketIds, opts.client);
  }

  let felix: FelixData;
  try {
    felix = await fetchFelixFromApi(cfg, fetchFn);
  } catch (err) {
    warnings.push(`Morpho API vault failed: ${(err as Error).message}; using on-chain fallback (APY unknown)`);
    if (!opts.client) throw new Error("Morpho API failed and no RPC client for fallback");
    felix = await fetchFelixFromChain(cfg, opts.client);
  }

  let hypePriceUsd = cfg.economics.fallbackHypePriceUsd;
  let hypePriceSource: "api" | "config" = "config";
  try {
    hypePriceUsd = await fetchHypePriceFromApi(cfg, fetchFn);
    hypePriceSource = "api";
  } catch (err) {
    warnings.push(`HYPE price from API failed: ${(err as Error).message}; using config fallback`);
  }

  return { markets, felix, hypePriceUsd, hypePriceSource, warnings };
}
