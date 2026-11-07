import { defineChain } from 'viem'

export const hyperEvm = defineChain({
  id: 999,
  name: 'HyperEVM',
  nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
  },
  blockExplorers: {
    default: { name: 'HyperEVMScan', url: 'https://hyperevmscan.io' },
  },
  contracts: {
    multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' },
  },
})

// Chain id 99901 is UNVERIFIED. Kinetiq publishes the id and explorer at launch (9 Nov 2026).
// 99901 comes from third-party chain registry PRs only. Confirm against the published value
// before pointing anyone at mainnet.
const elysiumRpc = (import.meta.env.VITE_ELYSIUM_RPC as string | undefined) || ''

export const elysium = defineChain({
  id: 99901,
  name: 'Elysium',
  nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
  rpcUrls: {
    default: { http: elysiumRpc ? [elysiumRpc] : [] },
  },
  contracts: {
    multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' },
  },
})

export const elysiumTestnet = defineChain({
  id: 99801,
  name: 'Elysium testnet',
  nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.elysium.kinetiq.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Elysium testnet explorer', url: 'https://elysium.kinetiq.xyz/testnet-explorer' },
  },
  testnet: true,
})

export const ELYSIUM_IDS: readonly number[] = [elysium.id, elysiumTestnet.id]
export const HYPEREVM_IDS: readonly number[] = [hyperEvm.id]

export function chainLabel(chainId: number | undefined): string {
  if (chainId === undefined) return 'Elysium / HyperEVM'
  if (chainId === hyperEvm.id) return 'HyperEVM'
  if (chainId === elysium.id) return 'Elysium'
  if (chainId === elysiumTestnet.id) return 'Elysium testnet'
  return 'Unsupported chain'
}

export type SupportedChainId = typeof hyperEvm.id | typeof elysium.id | typeof elysiumTestnet.id

export function asSupported(chainId: number | undefined): SupportedChainId | undefined {
  if (chainId === hyperEvm.id || chainId === elysium.id || chainId === elysiumTestnet.id) return chainId
  return undefined
}
