import { useQuery } from '@tanstack/react-query'
import { parseAbi, type Address, type Hex } from 'viem'
import { useReadContracts } from 'wagmi'
import { hyperEvm } from '../chains'
import { addresses } from '../config/addresses'

/**
 * Venue rates read from the venues themselves, not from an indexer:
 * - Morpho markets: Morpho Blue's market state plus the Adaptive Curve IRM's borrowRateView, so supply APY =
 *   borrow rate × utilisation × (1 − fee), compounded. Same arithmetic Morpho's own app uses.
 * - Felix USDC: the vault's withdraw queue and its supply position in each market, weighted by assets, net of the
 *   vault's own fee. This is the spot rate the vault is earning now; the 7-day average still needs history.
 * - HyperLend USDC: the pool's getReserveData for USDC, currentLiquidityRate in ray, compounded per second.
 * - HLP: Hyperliquid's own info API (vaultDetails), which reports apr and the vault's account value and pnl history;
 *   the 30-day realised figure is computed here from that history.
 */

export const MORPHO_BLUE = '0x68e37dE8d93d3496ae143F2E900490f6280C57cD' as Address
export const ADAPTIVE_CURVE_IRM = '0xD4a426F010986dCad727e8dd6eed44cA4A9b7483' as Address
export const HYPERLEND_POOL = '0x00a89d7a5a02160f20150ebea7a2b5e4879a1a8b' as Address
export const HYPERLEND_AUSDC = '0x744E4f26ee30213989216E1632D9BE3547C4885b' as Address
export const HLP_VAULT = '0xdfc24b077bc1425ad1dea75bcb6f8158e10df303'

export const MORPHO_MARKETS = [
  { id: '0xe7aa046832007a975d4619260d221229e99cc27da2e6ef162881202b4cd2349b', name: 'kHYPE 62.5%', collateral: 'kHYPE' },
  { id: '0x96c47d3797394dd25e33f814216793a89d2e6edcc54d1dac3ab4c2b2d82a73b9', name: 'kHYPE 77%', collateral: 'kHYPE' },
  { id: '0xd7d38220652d19c87099c3b23de9a70a1893620a050c635d1a94bd947c9c59a8', name: 'WHYPE 77%', collateral: 'WHYPE' },
  { id: '0x45af9c72aa97978e143a646498c8922058b7c6f18b6f7b05d7316c8cf7ab942f', name: 'UBTC 77%', collateral: 'UBTC' },
] as const

const morphoAbi = parseAbi([
  'function market(bytes32 id) view returns (uint128 totalSupplyAssets, uint128 totalSupplyShares, uint128 totalBorrowAssets, uint128 totalBorrowShares, uint128 lastUpdate, uint128 fee)',
  'function idToMarketParams(bytes32 id) view returns (address loanToken, address collateralToken, address oracle, address irm, uint256 lltv)',
  'function position(bytes32 id, address user) view returns (uint256 supplyShares, uint128 borrowShares, uint128 collateral)',
])
const irmAbi = parseAbi([
  'function borrowRateView((address loanToken, address collateralToken, address oracle, address irm, uint256 lltv) marketParams, (uint128 totalSupplyAssets, uint128 totalSupplyShares, uint128 totalBorrowAssets, uint128 totalBorrowShares, uint128 lastUpdate, uint128 fee) market) view returns (uint256)',
])
const metaMorphoAbi = parseAbi([
  'function withdrawQueueLength() view returns (uint256)',
  'function withdrawQueue(uint256) view returns (bytes32)',
  'function fee() view returns (uint96)',
  'function totalAssets() view returns (uint256)',
])
const aavePoolAbi = parseAbi([
  'function getReserveData(address asset) view returns ((uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
])
const erc20Abi = parseAbi(['function totalSupply() view returns (uint256)'])

const SECONDS = 31_536_000
const compound = (apr: number) => Math.exp(apr) - 1

export interface MarketRate {
  id: Hex
  name: string
  collateral: string
  supplyApy: number
  utilization: number
  supplyUsd: number
}

/** Morpho market rates straight from Morpho Blue and the IRM. */
export function useMorphoMarketRates() {
  const ids = MORPHO_MARKETS.map((m) => m.id as Hex)
  const base = useReadContracts({
    contracts: ids.flatMap((id) => [
      { address: MORPHO_BLUE, abi: morphoAbi, functionName: 'market', args: [id], chainId: hyperEvm.id },
      { address: MORPHO_BLUE, abi: morphoAbi, functionName: 'idToMarketParams', args: [id], chainId: hyperEvm.id },
    ]),
    query: { refetchInterval: 60_000 },
  })
  const pairs = ids.map((_, i) => ({
    m: base.data?.[i * 2]?.result as readonly [bigint, bigint, bigint, bigint, bigint, bigint] | undefined,
    p: base.data?.[i * 2 + 1]?.result as readonly [Address, Address, Address, Address, bigint] | undefined,
  }))
  const ready = pairs.every((x) => x.m && x.p)
  const rates = useReadContracts({
    contracts: ready
      ? pairs.map(({ m, p }) => ({
          address: ADAPTIVE_CURVE_IRM,
          abi: irmAbi,
          functionName: 'borrowRateView' as const,
          args: [
            { loanToken: p![0], collateralToken: p![1], oracle: p![2], irm: p![3], lltv: p![4] },
            { totalSupplyAssets: m![0], totalSupplyShares: m![1], totalBorrowAssets: m![2], totalBorrowShares: m![3], lastUpdate: m![4], fee: m![5] },
          ],
          chainId: hyperEvm.id,
        }))
      : [],
    query: { enabled: ready, refetchInterval: 60_000 },
  })
  const data: MarketRate[] | undefined =
    ready && rates.data
      ? MORPHO_MARKETS.map((mk, i) => {
          const m = pairs[i].m!
          const borrowRate = Number((rates.data![i]?.result as bigint | undefined) ?? 0n) / 1e18
          const supply = Number(m[0])
          const util = supply === 0 ? 0 : Number(m[2]) / supply
          const fee = Number(m[5]) / 1e18
          return { id: mk.id as Hex, name: mk.name, collateral: mk.collateral, supplyApy: compound(borrowRate * SECONDS * util * (1 - fee)), utilization: util, supplyUsd: supply / 1e6 }
        })
      : undefined
  return { data, isLoading: base.isLoading || rates.isLoading, error: base.error ?? rates.error }
}

/** Felix's spot rate, computed from its markets: weighted market supply APY, net of the vault's fee. */
export function useFelixSpotRate(markets: MarketRate[] | undefined) {
  const felix = addresses.hyperEvm.felixVault as Address
  const head = useReadContracts({
    contracts: [
      { address: felix, abi: metaMorphoAbi, functionName: 'withdrawQueueLength', chainId: hyperEvm.id },
      { address: felix, abi: metaMorphoAbi, functionName: 'fee', chainId: hyperEvm.id },
      { address: felix, abi: metaMorphoAbi, functionName: 'totalAssets', chainId: hyperEvm.id },
    ],
    query: { refetchInterval: 60_000 },
  })
  const n = Number((head.data?.[0]?.result as bigint | undefined) ?? 0n)
  const queue = useReadContracts({
    contracts: Array.from({ length: n }, (_, i) => ({ address: felix, abi: metaMorphoAbi, functionName: 'withdrawQueue' as const, args: [BigInt(i)], chainId: hyperEvm.id })),
    query: { enabled: n > 0, refetchInterval: 300_000 },
  })
  const qids = (queue.data ?? []).map((r) => r.result as Hex | undefined).filter((x): x is Hex => !!x)
  const pos = useReadContracts({
    contracts: qids.flatMap((id) => [
      { address: MORPHO_BLUE, abi: morphoAbi, functionName: 'position' as const, args: [id, felix], chainId: hyperEvm.id },
      { address: MORPHO_BLUE, abi: morphoAbi, functionName: 'market' as const, args: [id], chainId: hyperEvm.id },
      { address: MORPHO_BLUE, abi: morphoAbi, functionName: 'idToMarketParams' as const, args: [id], chainId: hyperEvm.id },
    ]),
    query: { enabled: qids.length > 0, refetchInterval: 60_000 },
  })
  const triples = qids.map((id, i) => ({
    id,
    pos: pos.data?.[i * 3]?.result as readonly [bigint, bigint, bigint] | undefined,
    m: pos.data?.[i * 3 + 1]?.result as readonly [bigint, bigint, bigint, bigint, bigint, bigint] | undefined,
    p: pos.data?.[i * 3 + 2]?.result as readonly [Address, Address, Address, Address, bigint] | undefined,
  }))
  const ready = qids.length > 0 && triples.every((t) => t.pos && t.m && t.p)
  const irm = useReadContracts({
    contracts: ready
      ? triples.map(({ m, p }) => ({
          address: ADAPTIVE_CURVE_IRM,
          abi: irmAbi,
          functionName: 'borrowRateView' as const,
          args: [
            { loanToken: p![0], collateralToken: p![1], oracle: p![2], irm: p![3], lltv: p![4] },
            { totalSupplyAssets: m![0], totalSupplyShares: m![1], totalBorrowAssets: m![2], totalBorrowShares: m![3], lastUpdate: m![4], fee: m![5] },
          ],
          chainId: hyperEvm.id,
        }))
      : [],
    query: { enabled: ready, refetchInterval: 60_000 },
  })
  void markets
  if (!ready || !irm.data || !head.data)
    return {
      spotApy: null as number | null,
      totalAssetsUsd: head.data?.[2]?.result ? Number(head.data[2].result as bigint) / 1e6 : null,
      isLoading: head.isLoading || queue.isLoading || pos.isLoading || irm.isLoading,
    }
  const total = Number(head.data[2].result as bigint)
  const vaultFee = Number((head.data[1].result as bigint | undefined) ?? 0n) / 1e18
  let weighted = 0
  triples.forEach(({ pos: ps, m }, i) => {
    const supplyShares = Number(ps![0])
    const assets = Number(m![1]) === 0 ? 0 : (supplyShares * Number(m![0])) / Number(m![1])
    const borrowRate = Number((irm.data![i]?.result as bigint | undefined) ?? 0n) / 1e18
    const util = Number(m![0]) === 0 ? 0 : Number(m![2]) / Number(m![0])
    const marketFee = Number(m![5]) / 1e18
    const apr = borrowRate * SECONDS * util * (1 - marketFee)
    weighted += total === 0 ? 0 : (assets / total) * apr
  })
  return { spotApy: compound(weighted * (1 - vaultFee)), totalAssetsUsd: total / 1e6, isLoading: false }
}

/** HyperLend USDC from the pool contract: the supply rate it is paying this second. */
export function useHyperLendUsdc() {
  const r = useReadContracts({
    contracts: [
      { address: HYPERLEND_POOL, abi: aavePoolAbi, functionName: 'getReserveData', args: [addresses.hyperEvm.usdc as Address], chainId: hyperEvm.id },
      { address: HYPERLEND_AUSDC, abi: erc20Abi, functionName: 'totalSupply', chainId: hyperEvm.id },
    ],
    query: { refetchInterval: 60_000 },
  })
  const rd = r.data?.[0]?.result as { currentLiquidityRate: bigint } | undefined
  const apr = rd ? Number(rd.currentLiquidityRate) / 1e27 : null
  return {
    apy: apr === null ? null : (1 + apr / SECONDS) ** SECONDS - 1,
    tvlUsd: r.data?.[1]?.result ? Number(r.data[1].result as bigint) / 1e6 : null,
    isLoading: r.isLoading,
  }
}

export interface HlpRate {
  aprReported: number
  realised30dAnnualised: number | null
  accountValueUsd: number
}

async function fetchHlp(): Promise<HlpRate> {
  const res = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'vaultDetails', vaultAddress: HLP_VAULT }),
  })
  if (!res.ok) throw new Error(`Hyperliquid ${res.status}`)
  const d = (await res.json()) as { apr: number; portfolio: [string, { accountValueHistory: [number, string][]; pnlHistory: [number, string][] }][] }
  const month = d.portfolio.find(([k]) => k === 'month')?.[1]
  let realised: number | null = null
  let last = 0
  if (month && month.accountValueHistory.length > 1) {
    const av = month.accountValueHistory.map(([, v]) => Number(v))
    const pnl = month.pnlHistory.map(([, v]) => Number(v))
    const t0 = month.accountValueHistory[0][0]
    const t1 = month.accountValueHistory[month.accountValueHistory.length - 1][0]
    const days = Math.max(1, (t1 - t0) / 86_400_000)
    const avg = av.reduce((a, b) => a + b, 0) / av.length
    last = av[av.length - 1]
    const gain = pnl[pnl.length - 1] - pnl[0]
    realised = avg > 0 ? (gain / avg) * (365 / days) : null
  }
  return { aprReported: d.apr, realised30dAnnualised: realised, accountValueUsd: last }
}

export function useHlp() {
  return useQuery({ queryKey: ['hyperliquid', 'hlp', HLP_VAULT], queryFn: fetchHlp, staleTime: 300_000, refetchInterval: 600_000, retry: 1 })
}
