import { useQuery } from '@tanstack/react-query'

export interface FundingNow {
  apy8: number
  apy24: number
  apy7d: number
  negativeHours24: number
}

/** Hourly funding for one coin from Hyperliquid's public info endpoint, annualised in percent. */
export async function fetchFunding(coin = 'HYPE'): Promise<FundingNow> {
  const r = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'fundingHistory', coin, startTime: Date.now() - 8 * 86_400_000 }),
  })
  if (!r.ok) throw new Error(`funding ${r.status}`)
  const rows = (await r.json()) as { time: number; fundingRate: string }[]
  const rates = rows.sort((a, b) => a.time - b.time).map((x) => Number(x.fundingRate))
  const ann = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length) * 24 * 365 * 100 : NaN)
  return { apy8: ann(rates.slice(-8)), apy24: ann(rates.slice(-24)), apy7d: ann(rates.slice(-168)), negativeHours24: rates.slice(-24).filter((x) => x < 0).length }
}

export function useFunding(coin = 'HYPE') {
  return useQuery({ queryKey: ['funding', coin], queryFn: () => fetchFunding(coin), staleTime: 5 * 60_000, refetchInterval: 10 * 60_000 })
}
