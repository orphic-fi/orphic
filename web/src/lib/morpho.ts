import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { morphoChainId } from '../config/addresses'

const ENDPOINT = 'https://api.morpho.org/graphql'

export interface VaultV2Stats {
  netApy: number | null
  apy: number | null
  totalAssetsUsd: number | null
}

interface GqlResponse {
  data?: { vaultV2ByAddress?: { netApy?: number | null; apy?: number | null; totalAssetsUsd?: number | null } | null }
  errors?: { message: string }[]
}

async function fetchVaultV2(address: Address): Promise<VaultV2Stats> {
  const query = `{ vaultV2ByAddress(address:"${address}", chainId:${morphoChainId}){ netApy apy totalAssetsUsd } }`
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`Morpho API ${res.status}`)
  const json = (await res.json()) as GqlResponse
  if (json.errors?.length) throw new Error(json.errors[0].message)
  const v = json.data?.vaultV2ByAddress
  if (!v) throw new Error('Vault not found on Morpho API')
  return {
    netApy: v.netApy ?? null,
    apy: v.apy ?? null,
    totalAssetsUsd: v.totalAssetsUsd ?? null,
  }
}

export function useMorphoVaultV2(address: Address) {
  return useQuery({
    queryKey: ['morpho', 'vaultV2', morphoChainId, address],
    queryFn: () => fetchVaultV2(address),
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
  })
}
