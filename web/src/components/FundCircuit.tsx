import { useState } from 'react'
import { parseUnits, type Address } from 'viem'
import { useReadContract, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { erc20Abi } from '../abi/erc20'
import { hyperEvm } from '../chains'
import { addresses } from '../config/addresses'
import { useSession } from '../hooks/useSession'
import { USDC_DECIMALS } from '../hooks/useVault'
import { fmtUsd, truncateAddress } from '../lib/format'
import s from './RunAgent.module.css'

/** Send USDC on HyperEVM from the connected wallet to the user's Circuit wallet. A plain ERC-20 transfer they sign. */
export default function FundCircuit({ to, onSent }: { to: Address; onSent?: () => void }) {
  const { address, isConnected, chainId } = useSession()
  const { switchChain } = useSwitchChain()
  const [amount, setAmount] = useState('50')
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash, chainId: hyperEvm.id })
  const bal = useReadContract({
    address: addresses.hyperEvm.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: hyperEvm.id,
    query: { enabled: !!address, refetchInterval: 20_000 },
  })
  const balance = bal.data !== undefined ? Number(bal.data) / 10 ** USDC_DECIMALS : null
  const onHyperEvm = chainId === hyperEvm.id
  const send = () => {
    reset()
    writeContract({ address: addresses.hyperEvm.usdc, abi: erc20Abi, functionName: 'transfer', args: [to, parseUnits(amount || '0', USDC_DECIMALS)], chainId: hyperEvm.id })
  }
  if (receipt.isSuccess) {
    onSent?.()
  }
  return (
    <div className={s.holdings}>
      <div className={s.holdingsHead}>
        <span>Your wallet (MetaMask)</span>
        <span>{isConnected && address ? truncateAddress(address) : 'not connected'}</span>
      </div>
      {!isConnected ? (
        <div className={s.muted}>Connect a wallet (top right) to send USDC to the agent wallet without copying addresses.</div>
      ) : (
        <>
          <div className={s.holding}>
            <span>
              USDC <span className={s.muted}>on HyperEVM</span>
            </span>
            <span>{balance !== null ? fmtUsd(balance, 2) : '–'}</span>
          </div>
          <div className={s.holding}>
            <span className={s.muted}>Send</span>
            <input className={s.inlineInput} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          {receipt.isSuccess ? (
            <div className={s.ok}>Sent. It shows in the agent wallet within a minute.</div>
          ) : !onHyperEvm ? (
            <button type="button" className={s.secondary} onClick={() => switchChain({ chainId: hyperEvm.id })}>
              Switch to HyperEVM to send
            </button>
          ) : (
            <button type="button" className={s.secondary} disabled={isPending || receipt.isLoading || !amount || (balance !== null && Number(amount) > balance)} onClick={send}>
              {isPending ? 'Confirm in MetaMask…' : receipt.isLoading ? 'Sending…' : `Send ${amount || '0'} USDC to the agent wallet`}
            </button>
          )}
          {error && <div className={s.err}>{(error as Error).message.split('\n')[0].slice(0, 140)}</div>}
        </>
      )}
    </div>
  )
}
