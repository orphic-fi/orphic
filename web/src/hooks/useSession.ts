import { useAccount } from 'wagmi'
import { hyperEvm } from '../chains'
import { DEMO, DEMO_ACCOUNT } from '../config/demo'

/** Wallet session, or the demo account on HyperEVM when VITE_DEMO=1. */
export function useSession() {
  const acct = useAccount()
  if (DEMO) {
    return { address: DEMO_ACCOUNT, isConnected: true, chainId: hyperEvm.id as number | undefined }
  }
  return { address: acct.address, isConnected: acct.isConnected, chainId: acct.chainId }
}
