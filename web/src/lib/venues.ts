import { useQuery } from '@tanstack/react-query'
import { morphoChainId } from '../config/addresses'

/**
 * Live rates for the venues Orphic's agents may use. Every number is an advertised or indexed rate from the venue's own
 * data source, labelled as an estimate on the page; none of them is Orphic's promise. Felix comes from the Morpho API
 * (7-day average, see morpho.ts); the Morpho Blue markets from the same API (spot supply APY); HyperLend and HLP from
 * DefiLlama's yields feed, which is the only keyless source that indexes both.
 */

export const MORPHO_MARKETS = [
  { id: '0xe7aa046832007a975d4619260d221229e99cc27da2e6ef162881202b4cd2349b', name: 'kHYPE 62.5%' },
  { id: '0x96c47d3797394dd25e33f814216793a89d2e6edcc54d1dac3ab4c2b2d82a73b9', name: 'kHYPE 77%' },
  { id: '0xd7d38220652d19c87099c3b23de9a70a1893620a050c635d1a94bd947c9c59a8', name: 'WHYPE 77%' },
  { id: '0x45af9c72aa97978e143a646498c8922058b7c6f18b6f7b05d7316c8cf7ab942f', name: 'UBTC 77%' },
] as const

export interface MarketRate {
  id: string
  name: string
  collateral: string
  supplyApy: number
  utilization: number
  supplyUsd: number
}

async function fetchMarkets(): Promise<MarketRate[]> {
  const keys = MORPHO_MARKETS.map((m) => `"${m.id}"`).join(',')
  const query = `{ markets(where:{chainId_in:[${morphoChainId}], uniqueKey_in:[${keys}]}){ items { marketId collateralAsset{symbol} state{ supplyApy utilization supplyAssetsUsd } } } }`
  const res = await fetch('https://api.morpho.org/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) })
  if (!res.ok) throw new Error(`Morpho API ${res.status}`)
  const json = (await res.json()) as {
    data?: { markets?: { items?: { marketId: string; collateralAsset?: { symbol?: string }; state?: { supplyApy?: number; utilization?: number; supplyAssetsUsd?: number } }[] } }
    errors?: { message: string }[]
  }
  if (json.errors?.length) throw new Error(json.errors[0].message)
  return (json.data?.markets?.items ?? []).map((m) => ({
    id: m.marketId,
    name: MORPHO_MARKETS.find((k) => k.id.toLowerCase() === m.marketId.toLowerCase())?.name ?? m.marketId.slice(0, 10),
    collateral: m.collateralAsset?.symbol ?? '?',
    supplyApy: m.state?.supplyApy ?? 0,
    utilization: m.state?.utilization ?? 0,
    supplyUsd: m.state?.supplyAssetsUsd ?? 0,
  }))
}

export function useMorphoMarkets() {
  return useQuery({ queryKey: ['morpho', 'markets', morphoChainId], queryFn: fetchMarkets, staleTime: 60_000, refetchInterval: 120_000, retry: 1 })
}

/** DefiLlama pool ids, checked 19 Nov 2026. */
const LLAMA = {
  hyperlendUsdc: '9d21c8a0-4ea9-4585-81a7-e3d09ab24a45',
  hlp: 'c676790b-ba37-5aa8-9ccf-d9a533daafdc',
} as const

export interface LlamaRate {
  apy: number | null
  tvlUsd: number | null
}

async function fetchLlama(): Promise<Record<keyof typeof LLAMA, LlamaRate>> {
  const res = await fetch('https://yields.llama.fi/pools')
  if (!res.ok) throw new Error(`DefiLlama ${res.status}`)
  const json = (await res.json()) as { data?: { pool: string; apy?: number | null; apyBase?: number | null; tvlUsd?: number | null }[] }
  const byId = new Map((json.data ?? []).map((p) => [p.pool, p]))
  const pick = (id: string): LlamaRate => {
    const p = byId.get(id)
    const apy = p?.apyBase ?? p?.apy ?? null
    return { apy: apy === null ? null : apy / 100, tvlUsd: p?.tvlUsd ?? null }
  }
  return { hyperlendUsdc: pick(LLAMA.hyperlendUsdc), hlp: pick(LLAMA.hlp) }
}

export function useLlamaRates() {
  return useQuery({ queryKey: ['llama', 'pools', 'orphic-venues'], queryFn: fetchLlama, staleTime: 300_000, refetchInterval: 600_000, retry: 1 })
}
