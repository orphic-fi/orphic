import { useCallback, useMemo } from 'react'
import type { Address } from 'viem'
import { useReadContract, useReadContracts } from 'wagmi'
import { erc20Abi } from '../abi/erc20'
import { juniorAbi } from '../abi/junior'
import { vaultV2Abi } from '../abi/vaultV2'
import { ELYSIUM_IDS, asSupported, hyperEvm } from '../chains'
import { DEPLOYED, ZERO, addresses, ops } from '../config/addresses'
import { DEMO, DEMO_LOADED_AT_MS, demoFixture, demoScenario } from '../config/demo'
import { useMorphoVaultV2 } from '../lib/morpho'
import { useSession } from './useSession'

export type VaultKind = 'senior' | 'junior'

export const USDC_DECIMALS = 6
export const ORPH_DECIMALS = 18
export const SHARE_DECIMALS = 18

/** True when the UI should behave as if contracts exist: deployed, or demo fixtures. */
export const LIVE = DEPLOYED || DEMO

/** Required ORPH (wei) for a USDC deposit amount (6 decimals): amount * stakePerAsset / 1e6. */
export function requiredStake(amount: bigint, stakePerAsset: bigint): bigint {
  return (amount * stakePerAsset) / 10n ** BigInt(USDC_DECIMALS)
}

export interface VaultState {
  kind: VaultKind
  apy: number | null
  apyLoading: boolean
  apyError: boolean
  apyUnlisted?: boolean
  /** Unix ms of the last successful APY read. */
  apyReadAt: number | undefined
  /** Unix ms of the last successful chain read. */
  chainReadAt: number | undefined
  tvl: number | null
  cap: number | null
  capUsed: number | null
  /** Depositor balance in USDC units (6 decimals). */
  balanceAssets: bigint | undefined
  /** Depositor share balance. Senior shares use USDC decimals, junior shares 18. */
  balanceShares: bigint | undefined
  usdcBalance: bigint | undefined
  allowance: bigint | undefined
  /** Senior: maxWithdraw(user) in USDC. Junior: share balance. */
  maxWithdraw: bigint | undefined
  /** Senior shares per 1e6 USDC (osUSDC for 1 USDC), used for the deposit preview. */
  seniorSharesPerUsdc: bigint | undefined
  /** Junior pricePerShare, 1e18. */
  pricePerShare: bigint | undefined
  /** Junior lastSettle() unix seconds; undefined when unknown. */
  lastSettle: number | undefined
  /** Junior open exit request. */
  exit: { shares: bigint; readyAt: number } | null
  stakeBps: number
  paused: boolean
  stake: {
    token: Address | undefined
    address: Address
    perAsset: bigint | undefined
    pendingPerAsset: bigint | undefined
    eta: number | undefined
    walletCap: bigint | undefined
    orphBalance: bigint | undefined
    orphAllowance: bigint | undefined
  }
  cover: { usd: number; hours: number } | null
  target: Address
  usdc: Address
  onElysium: boolean
  onHyperEvm: boolean
  refetch: () => void
}

const emptyStake = (address: Address): VaultState['stake'] => ({
  token: undefined,
  address,
  perAsset: undefined,
  pendingPerAsset: undefined,
  eta: undefined,
  walletCap: undefined,
  orphBalance: undefined,
  orphAllowance: undefined,
})

export function useVault(kind: VaultKind): VaultState {
  const { address: account, chainId } = useSession()
  const onElysium = chainId !== undefined && ELYSIUM_IDS.includes(chainId)
  const onHyperEvm = chainId === hyperEvm.id
  const walletChainId = asSupported(chainId)
  const probe = account ?? addresses.hyperEvm.referenceVault

  const vaultAddress = kind === 'senior' ? addresses.hyperEvm.senior : addresses.hyperEvm.junior
  const target = onElysium ? addresses.elysium.bridgeEntry : vaultAddress
  const usdc = onElysium ? addresses.elysium.usdc : addresses.hyperEvm.usdc

  const morphoAddress = DEPLOYED ? addresses.hyperEvm.senior : addresses.hyperEvm.referenceVault
  const morpho = useMorphoVaultV2(morphoAddress)

  const seniorReads = useReadContracts({
    contracts: [
      { address: vaultAddress, abi: vaultV2Abi, functionName: 'totalAssets', chainId: hyperEvm.id },
      { address: vaultAddress, abi: vaultV2Abi, functionName: 'balanceOf', args: [probe], chainId: hyperEvm.id },
      { address: vaultAddress, abi: vaultV2Abi, functionName: 'maxWithdraw', args: [probe], chainId: hyperEvm.id },
      { address: vaultAddress, abi: vaultV2Abi, functionName: 'maxRate', chainId: hyperEvm.id },
      { address: addresses.hyperEvm.junior, abi: juniorAbi, functionName: 'coverInProgress', chainId: hyperEvm.id },
      { address: vaultAddress, abi: vaultV2Abi, functionName: 'convertToShares', args: [10n ** BigInt(USDC_DECIMALS)], chainId: hyperEvm.id },
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
      { address: vaultAddress, abi: juniorAbi, functionName: 'balanceOf', args: [probe], chainId: hyperEvm.id },
      { address: vaultAddress, abi: juniorAbi, functionName: 'pricePerShare', chainId: hyperEvm.id },
      { address: vaultAddress, abi: juniorAbi, functionName: 'seeded', chainId: hyperEvm.id },
      { address: vaultAddress, abi: juniorAbi, functionName: 'depositsPaused', chainId: hyperEvm.id },
      { address: vaultAddress, abi: juniorAbi, functionName: 'stakeToken', chainId: hyperEvm.id },
      { address: vaultAddress, abi: juniorAbi, functionName: 'stakePerAsset', chainId: hyperEvm.id },
      { address: vaultAddress, abi: juniorAbi, functionName: 'pendingStakePerAsset', chainId: hyperEvm.id },
      { address: vaultAddress, abi: juniorAbi, functionName: 'stakeEta', chainId: hyperEvm.id },
      { address: vaultAddress, abi: juniorAbi, functionName: 'walletCap', chainId: hyperEvm.id },
      { address: vaultAddress, abi: juniorAbi, functionName: 'lastSettle', chainId: hyperEvm.id },
      { address: vaultAddress, abi: juniorAbi, functionName: 'exitOf', args: [probe], chainId: hyperEvm.id },
    ],
    query: { enabled: DEPLOYED && kind === 'junior', refetchInterval: 30_000 },
  })

  const stakeTokenRead = juniorReads.data?.[6]?.result as Address | undefined
  const orphToken: Address = stakeTokenRead && stakeTokenRead !== ZERO ? stakeTokenRead : addresses.hyperEvm.orph
  const orphReads = useReadContracts({
    contracts: [
      { address: orphToken, abi: erc20Abi, functionName: 'balanceOf', args: [probe], chainId: hyperEvm.id },
      { address: orphToken, abi: erc20Abi, functionName: 'allowance', args: [probe, addresses.hyperEvm.junior], chainId: hyperEvm.id },
    ],
    query: { enabled: DEPLOYED && kind === 'junior' && !!account && orphToken !== ZERO, refetchInterval: 20_000 },
  })

  const walletReads = useReadContracts({
    contracts: [
      { address: usdc, abi: erc20Abi, functionName: 'balanceOf', args: [probe], chainId: walletChainId },
      { address: usdc, abi: erc20Abi, functionName: 'allowance', args: [probe, target], chainId: walletChainId },
    ],
    query: { enabled: DEPLOYED && !!account && (onElysium || onHyperEvm), refetchInterval: 20_000 },
  })

  const refetchSenior = seniorReads.refetch
  const refetchSeniorAssets = seniorAssets.refetch
  const refetchJunior = juniorReads.refetch
  const refetchWallet = walletReads.refetch
  const refetchMorpho = morpho.refetch
  const refetchOrph = orphReads.refetch
  const refetch = useCallback(() => {
    void refetchSenior()
    void refetchSeniorAssets()
    void refetchJunior()
    void refetchWallet()
    void refetchMorpho()
    void refetchOrph()
  }, [refetchSenior, refetchSeniorAssets, refetchJunior, refetchWallet, refetchMorpho, refetchOrph])

  return useMemo<VaultState>(() => {
    const common = {
      apy: morpho.data?.netApy ?? morpho.data?.apy ?? null,
      apyLoading: morpho.isLoading,
      apyError: morpho.isError,
      apyUnlisted: morpho.data?.unlisted ?? false,
      apyReadAt: morpho.dataUpdatedAt || undefined,
      target,
      usdc,
      onElysium,
      onHyperEvm,
      refetch,
    }

    if (DEMO) {
      const f = demoFixture(demoScenario())
      const now = DEMO_LOADED_AT_MS
      if (kind === 'senior') {
        const tvl = Number(f.senior.totalAssets) / 10 ** USDC_DECIMALS
        const cap = ops.caps.seniorUsd
        const perHour = ((Number(f.senior.totalAssets) * Number(f.senior.maxRate)) / 1e18) * 3600
        const cover =
          f.senior.coverInProgress > 0n
            ? { usd: Number(f.senior.coverInProgress) / 10 ** USDC_DECIMALS, hours: perHour > 0 ? Number(f.senior.coverInProgress) / perHour : Infinity }
            : null
        return {
          ...common,
          kind,
          chainReadAt: now,
          tvl,
          cap,
          capUsed: Math.min(1, tvl / cap),
          balanceAssets: f.senior.assets,
          balanceShares: f.senior.shares,
          usdcBalance: f.wallet.usdc,
          allowance: f.wallet.usdcAllowance,
          maxWithdraw: f.senior.availableLiquidity < f.senior.maxWithdraw ? f.senior.availableLiquidity : f.senior.maxWithdraw,
          // osUSDC per 1 USDC, 18 decimals: 1e18 * 1e6 / pricePerShare(6dp)
          seniorSharesPerUsdc: (10n ** BigInt(SHARE_DECIMALS) * 10n ** BigInt(USDC_DECIMALS)) / f.senior.pricePerShare,
          pricePerShare: undefined,
          lastSettle: undefined,
          exit: null,
          stakeBps: 0,
          paused: false,
          stake: emptyStake(addresses.hyperEvm.orph),
          cover,
        }
      }
      const tvl = Number(f.junior.totalAssets) / 10 ** USDC_DECIMALS
      const cap = Number(f.junior.depositCap) / 10 ** USDC_DECIMALS
      return {
        ...common,
        kind,
        apy: null,
        chainReadAt: now,
        tvl,
        cap,
        capUsed: Math.min(1, tvl / cap),
        balanceAssets: (f.junior.shares * f.junior.pricePerShare) / 10n ** 18n / 10n ** BigInt(SHARE_DECIMALS - USDC_DECIMALS),
        balanceShares: f.junior.shares,
        usdcBalance: f.wallet.usdc,
        allowance: f.wallet.usdcAllowance,
        maxWithdraw: f.junior.shares,
        seniorSharesPerUsdc: undefined,
        pricePerShare: f.junior.pricePerShare,
        lastSettle: Number(f.junior.lastSettle),
        exit: f.junior.exit.shares > 0n ? { shares: f.junior.exit.shares, readyAt: Number(f.junior.exit.readyAt) } : null,
        stakeBps: Number(f.junior.stakeBps),
        paused: f.junior.paused,
        stake: {
          token: f.junior.stakeToken,
          address: f.junior.stakeToken,
          perAsset: f.junior.stakePerAsset,
          pendingPerAsset: f.junior.pendingStakePerAsset,
          eta: Number(f.junior.stakeEta),
          walletCap: f.junior.walletCap,
          orphBalance: f.wallet.orph,
          orphAllowance: f.wallet.orphAllowance,
        },
        cover: null,
      }
    }

    if (kind === 'senior') {
      const totalAssets = seniorReads.data?.[0]?.result as bigint | undefined
      const maxRate = seniorReads.data?.[3]?.result as bigint | undefined
      const coverRaw = seniorReads.data?.[4]?.result as bigint | undefined
      let cover: { usd: number; hours: number } | null = null
      if (DEPLOYED && coverRaw !== undefined && coverRaw > 0n && totalAssets !== undefined && maxRate !== undefined) {
        // hours = cover / (totalAssets * maxRate / 1e18 * 3600); maxRate is per second, WAD scaled.
        const perHour = ((Number(totalAssets) * Number(maxRate)) / 1e18) * 3600
        cover = { usd: Number(coverRaw) / 10 ** USDC_DECIMALS, hours: perHour > 0 ? Number(coverRaw) / perHour : Infinity }
      }
      const tvl = DEPLOYED && totalAssets !== undefined ? Number(totalAssets) / 10 ** USDC_DECIMALS : null // reference TVL is Felix, not ours
      const cap = ops.caps.seniorUsd
      return {
        ...common,
        kind,
        chainReadAt: seniorReads.dataUpdatedAt || undefined,
        tvl,
        cap,
        capUsed: DEPLOYED && tvl !== null ? Math.min(1, tvl / cap) : 0,
        balanceAssets: seniorAssets.data as bigint | undefined,
        balanceShares: seniorShares,
        usdcBalance: walletReads.data?.[0]?.result as bigint | undefined,
        allowance: walletReads.data?.[1]?.result as bigint | undefined,
        maxWithdraw: seniorReads.data?.[2]?.result as bigint | undefined,
        seniorSharesPerUsdc: seniorReads.data?.[5]?.result as bigint | undefined,
        pricePerShare: undefined,
        lastSettle: undefined,
        exit: null,
        stakeBps: 0,
        paused: ops.paused,
        stake: emptyStake(addresses.hyperEvm.orph),
        cover,
      }
    }

    const totalAssets = juniorReads.data?.[0]?.result as bigint | undefined
    const depositCap = juniorReads.data?.[1]?.result as bigint | undefined
    const shares = juniorReads.data?.[2]?.result as bigint | undefined
    const pps = juniorReads.data?.[3]?.result as bigint | undefined
    const seeded = juniorReads.data?.[4]?.result as boolean | undefined
    const paused = juniorReads.data?.[5]?.result as boolean | undefined
    const lastSettle = juniorReads.data?.[11]?.result as bigint | undefined
    const exitRaw = juniorReads.data?.[12]?.result as readonly [bigint, bigint, number] | undefined
    const tvl = DEPLOYED && totalAssets !== undefined ? Number(totalAssets) / 10 ** USDC_DECIMALS : null
    const cap = DEPLOYED && depositCap !== undefined ? Number(depositCap) / 10 ** USDC_DECIMALS : ops.caps.juniorUsd
    const balanceAssets =
      shares !== undefined && pps !== undefined ? (shares * pps) / 10n ** 18n / 10n ** BigInt(SHARE_DECIMALS - USDC_DECIMALS) : undefined
    return {
      ...common,
      kind,
      apy: null,
      apyLoading: false,
      apyError: false,
      chainReadAt: juniorReads.dataUpdatedAt || undefined,
      tvl,
      cap,
      capUsed: tvl !== null && cap ? Math.min(1, tvl / cap) : 0,
      balanceAssets,
      balanceShares: shares,
      usdcBalance: walletReads.data?.[0]?.result as bigint | undefined,
      allowance: walletReads.data?.[1]?.result as bigint | undefined,
      maxWithdraw: shares,
      seniorSharesPerUsdc: undefined,
      pricePerShare: pps,
      lastSettle: lastSettle !== undefined ? Number(lastSettle) : undefined,
      exit: exitRaw && exitRaw[0] > 0n ? { shares: exitRaw[0], readyAt: Number(exitRaw[1]) } : null,
      stakeBps: 2000, // design target: stakePerAsset is set from the 7-day TWAP so the stake is about 20% of the deposit
      paused: (paused ?? true) || seeded === false, // unknown state reads as paused, never as open
      stake: {
        token: stakeTokenRead,
        address: orphToken,
        perAsset: juniorReads.data?.[7]?.result as bigint | undefined,
        pendingPerAsset: juniorReads.data?.[8]?.result as bigint | undefined,
        eta: juniorReads.data?.[9]?.result !== undefined ? Number(juniorReads.data[9].result as bigint) : undefined,
        walletCap: juniorReads.data?.[10]?.result as bigint | undefined,
        orphBalance: orphReads.data?.[0]?.result as bigint | undefined,
        orphAllowance: orphReads.data?.[1]?.result as bigint | undefined,
      },
      cover: null,
    }
  }, [kind, morpho, seniorReads, seniorAssets, seniorShares, juniorReads, walletReads, orphReads, stakeTokenRead, orphToken, target, usdc, onElysium, onHyperEvm, refetch])
}
