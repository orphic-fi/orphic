import { useCallback, useMemo } from 'react'
import type { Address } from 'viem'
import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { erc20Abi } from '../abi/erc20'
import { juniorAbi } from '../abi/junior'
import { vaultV2Abi } from '../abi/vaultV2'
import { ELYSIUM_IDS, asSupported, hyperEvm } from '../chains'
import { DEPLOYED, addresses, ops } from '../config/addresses'
import { useMorphoVaultV2 } from '../lib/morpho'

export type VaultKind = 'senior' | 'junior'

export const USDC_DECIMALS = 6

// Placeholder until an ORPH price source exists: 1 ORPH priced at 1 USDC for the stake line.
export const ORPH_PRICE_USD = 1

export interface VaultState {
  kind: VaultKind
  /** Decimal ratio, e.g. 0.0512. null when not available. */
  apy: number | null
  apyLoading: boolean
  apyError: boolean
  /** USD */
  tvl: number | null
  /** USD */
  cap: number | null
  capUsed: number | null
  /** Depositor balance in USDC units (6 decimals), undefined when unknown. */
  balanceAssets: bigint | undefined
  /** Depositor share balance (junior) or vault share balance (senior). */
  balanceShares: bigint | undefined
  /** USDC wallet balance, 6 decimals. */
  usdcBalance: bigint | undefined
  allowance: bigint | undefined
  maxWithdraw: bigint | undefined
  stakeBps: number
  paused: boolean
  /** Senior only. Junior cover being recognised into senior's price, in USDC units; null when none or unknown. */
  cover: { usd: number; hours: number } | null
  /** Target contract the deposit is sent to on the connected chain. */
  target: Address
  /** USDC address on the connected chain. */
  usdc: Address
  onElysium: boolean
  onHyperEvm: boolean
  refetch: () => void
}

export function useVault(kind: VaultKind): VaultState {
  const { address: account, chainId } = useAccount()
  const onElysium = chainId !== undefined && ELYSIUM_IDS.includes(chainId)
  const onHyperEvm = chainId === hyperEvm.id
  const walletChainId = asSupported(chainId)

  const vaultAddress = kind === 'senior' ? addresses.hyperEvm.senior : addresses.hyperEvm.junior
  const target = onElysium ? addresses.elysium.bridgeEntry : vaultAddress
  const usdc = onElysium ? addresses.elysium.usdc : addresses.hyperEvm.usdc

  // Senior APY and TVL come from the Morpho API. Until our vault exists, read the reference vault.
  const morphoAddress = DEPLOYED ? addresses.hyperEvm.senior : addresses.hyperEvm.referenceVault
  const morpho = useMorphoVaultV2(morphoAddress)

  const seniorReads = useReadContracts({
    contracts: [
      { address: vaultAddress, abi: vaultV2Abi, functionName: 'totalAssets', chainId: hyperEvm.id },
      { address: vaultAddress, abi: vaultV2Abi, functionName: 'balanceOf', args: [account ?? addresses.hyperEvm.referenceVault], chainId: hyperEvm.id },
      { address: vaultAddress, abi: vaultV2Abi, functionName: 'maxWithdraw', args: [account ?? addresses.hyperEvm.referenceVault], chainId: hyperEvm.id },
      { address: vaultAddress, abi: vaultV2Abi, functionName: 'maxRate', chainId: hyperEvm.id },
      { address: addresses.hyperEvm.junior, abi: juniorAbi, functionName: 'coverInProgress', chainId: hyperEvm.id },
    ],
    query: { enabled: DEPLOYED && kind === 'senior', refetchInterval: 30_000 },
  })
  const seniorShares = seniorReads.data?.[1]?.result as bigint | undefined
  const seniorAssets = useReadContract({
    address: vaultAddress,
    abi: vaultV2Abi,
    functionName: 'convertToAssets',
    args: [seniorShares ?? 0n],
    chainId: hyperEvm.id,
    query: { enabled: DEPLOYED && kind === 'senior' && seniorShares !== undefined },
  })

  const juniorReads = useReadContracts({
    contracts: [
      { address: vaultAddress, abi: juniorAbi, functionName: 'totalAssets', chainId: hyperEvm.id },
      { address: vaultAddress, abi: juniorAbi, functionName: 'depositCap', chainId: hyperEvm.id },
      { address: vaultAddress, abi: juniorAbi, functionName: 'balanceOf', args: [account ?? addresses.hyperEvm.referenceVault], chainId: hyperEvm.id },
      { address: vaultAddress, abi: juniorAbi, functionName: 'pricePerShare', chainId: hyperEvm.id },
      { address: vaultAddress, abi: juniorAbi, functionName: 'stakeBps', chainId: hyperEvm.id },
      { address: vaultAddress, abi: juniorAbi, functionName: 'paused', chainId: hyperEvm.id },
    ],
    query: { enabled: DEPLOYED && kind === 'junior', refetchInterval: 30_000 },
  })

  const walletReads = useReadContracts({
    contracts: [
      { address: usdc, abi: erc20Abi, functionName: 'balanceOf', args: [account ?? addresses.hyperEvm.referenceVault], chainId: walletChainId },
      { address: usdc, abi: erc20Abi, functionName: 'allowance', args: [account ?? addresses.hyperEvm.referenceVault, target], chainId: walletChainId },
    ],
    query: { enabled: DEPLOYED && !!account && (onElysium || onHyperEvm), refetchInterval: 20_000 },
  })

  // TanStack binds refetch once per observer, so these identities are stable across renders.
  const refetchSenior = seniorReads.refetch
  const refetchSeniorAssets = seniorAssets.refetch
  const refetchJunior = juniorReads.refetch
  const refetchWallet = walletReads.refetch
  const refetchMorpho = morpho.refetch
  const refetch = useCallback(() => {
    void refetchSenior()
    void refetchSeniorAssets()
    void refetchJunior()
    void refetchWallet()
    void refetchMorpho()
  }, [refetchSenior, refetchSeniorAssets, refetchJunior, refetchWallet, refetchMorpho])

  return useMemo<VaultState>(() => {

    if (kind === 'senior') {
      const totalAssets = seniorReads.data?.[0]?.result as bigint | undefined
      const maxRate = seniorReads.data?.[3]?.result as bigint | undefined
      const coverRaw = seniorReads.data?.[4]?.result as bigint | undefined
      let cover: { usd: number; hours: number } | null = null
      if (DEPLOYED && coverRaw !== undefined && coverRaw > 0n && totalAssets !== undefined && maxRate !== undefined) {
        // hours = cover / (totalAssets * maxRate / 1e18 * 3600); maxRate is per second, WAD scaled.
        const perHour = (Number(totalAssets) * Number(maxRate)) / 1e18 * 3600
        cover = { usd: Number(coverRaw) / 10 ** USDC_DECIMALS, hours: perHour > 0 ? Number(coverRaw) / perHour : Infinity }
      }
      const tvl = DEPLOYED && totalAssets !== undefined ? Number(totalAssets) / 10 ** USDC_DECIMALS : null // reference TVL is Felix, not ours
      const cap = ops.caps.seniorUsd
      return {
        kind,
        apy: morpho.data?.netApy ?? morpho.data?.apy ?? null,
        apyLoading: morpho.isLoading,
        apyError: morpho.isError,
        tvl,
        cap,
        // Before deployment the reference TVL is not ours; cap used is 0.
        capUsed: DEPLOYED && tvl !== null ? Math.min(1, tvl / cap) : 0,
        balanceAssets: seniorAssets.data as bigint | undefined,
        balanceShares: seniorShares,
        usdcBalance: walletReads.data?.[0]?.result as bigint | undefined,
        allowance: walletReads.data?.[1]?.result as bigint | undefined,
        maxWithdraw: seniorReads.data?.[2]?.result as bigint | undefined,
        stakeBps: 0,
        paused: ops.paused,
        cover,
        target,
        usdc,
        onElysium,
        onHyperEvm,
        refetch,
      }
    }

    const totalAssets = juniorReads.data?.[0]?.result as bigint | undefined
    const depositCap = juniorReads.data?.[1]?.result as bigint | undefined
    const shares = juniorReads.data?.[2]?.result as bigint | undefined
    const pps = juniorReads.data?.[3]?.result as bigint | undefined
    const stakeBps = juniorReads.data?.[4]?.result as bigint | undefined
    const paused = juniorReads.data?.[5]?.result as boolean | undefined
    const tvl = DEPLOYED && totalAssets !== undefined ? Number(totalAssets) / 10 ** USDC_DECIMALS : null
    const cap = DEPLOYED && depositCap !== undefined ? Number(depositCap) / 10 ** USDC_DECIMALS : ops.caps.juniorUsd
    const balanceAssets = shares !== undefined && pps !== undefined ? (shares * pps) / 10n ** 18n : undefined
    return {
      kind,
      apy: null,
      apyLoading: false,
      apyError: false,
      tvl,
      cap,
      capUsed: tvl !== null && cap ? Math.min(1, tvl / cap) : 0,
      balanceAssets,
      balanceShares: shares,
      usdcBalance: walletReads.data?.[0]?.result as bigint | undefined,
      allowance: walletReads.data?.[1]?.result as bigint | undefined,
      maxWithdraw: shares,
      stakeBps: stakeBps !== undefined ? Number(stakeBps) : 2000,
      paused: paused ?? ops.paused,
      cover: null,
      target,
      usdc,
      onElysium,
      onHyperEvm,
      refetch,
    }
  }, [kind, morpho, seniorReads, seniorAssets, seniorShares, juniorReads, walletReads, target, usdc, onElysium, onHyperEvm, refetch])
}
