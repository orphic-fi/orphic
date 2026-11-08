import { useEffect, useMemo, useState } from 'react'
import { formatUnits, parseUnits, type Address } from 'viem'
import { useAccount, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { erc20Abi } from '../abi/erc20'
import { juniorAbi } from '../abi/junior'
import { vaultV2Abi } from '../abi/vaultV2'
import { asSupported, hyperEvm } from '../chains'
import { DEPLOYED, OPENS_LABEL, ZERO, addresses } from '../config/addresses'
import { ORPH_DECIMALS, USDC_DECIMALS, requiredStake, useVault, type VaultKind } from '../hooks/useVault'
import { NA, fmtNum, fmtPct, fmtTime, fmtUnits, fmtUsd } from '../lib/format'
import s from './VaultArea.module.css'

const COPY = {
  senior: {
    name: 'senior',
    desc: 'USDC in a Morpho vault we curate. Paid first each week. Withdraw to available liquidity any time.',
    apyLabel: 'est. APY, live from Morpho',
    secondary: 'Withdraw',
    secondaryVerb: 'Withdraw',
  },
  junior: {
    name: 'junior',
    desc: "First loss. 20% of your deposit staked in ORPH. Exit after 7 days' notice, priced at the first weekly settle after the notice ends.",
    apyLabel: 'est. APY, after first settle',
    secondary: 'Request exit',
    secondaryVerb: 'Request exit',
  },
} as const

type Mode = 'deposit' | 'exit'

function parseAmount(v: string, decimals: number): bigint | null {
  if (!v) return null
  if (!new RegExp(`^\\d*(\\.\\d{0,${decimals}})?$`).test(v)) return null
  try {
    const n = parseUnits(v, decimals)
    return n > 0n ? n : null
  } catch {
    return null
  }
}

export default function VaultArea({ kind }: { kind: VaultKind }) {
  const copy = COPY[kind]
  const v = useVault(kind)
  const { address: account, isConnected, chainId } = useAccount()
  const { switchChain, isPending: switching } = useSwitchChain()
  const [mode, setMode] = useState<Mode>('deposit')
  const [raw, setRaw] = useState('')
  const [lastAction, setLastAction] = useState<string | null>(null)

  // Junior exits are denominated in shares (18 decimals, matching pricePerShare). Everything else is USDC.
  const inputDecimals = kind === 'junior' && mode === 'exit' ? 18 : USDC_DECIMALS
  const amount = useMemo(() => parseAmount(raw, inputDecimals), [raw, inputDecimals])

  const { writeContract, data: txHash, isPending: signing, error: writeError, reset } = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash: txHash })

  // Clear the input once, when a sent transaction confirms (state adjusted during render, not in an effect).
  const [handledHash, setHandledHash] = useState<string | undefined>(undefined)
  if (receipt.isSuccess && txHash && handledHash !== txHash) {
    setHandledHash(txHash)
    setRaw('')
  }

  const refetch = v.refetch
  useEffect(() => {
    if (receipt.isSuccess) refetch()
  }, [receipt.isSuccess, refetch])

  const unsupportedChain = isConnected && !v.onElysium && !v.onHyperEvm
  const needsApproval =
    mode === 'deposit' && amount !== null && v.allowance !== undefined && v.allowance < amount

  // Junior stake: ORPH required for the entered amount, from the contract's stakePerAsset.
  const stakeRequired = v.stake.token !== undefined && v.stake.token !== ZERO && v.stake.perAsset !== undefined && v.stake.perAsset > 0n
  const orphNeeded = kind === 'junior' && mode === 'deposit' && amount !== null && stakeRequired ? requiredStake(amount, v.stake.perAsset!) : 0n
  const orphShort = orphNeeded > 0n && v.stake.orphBalance !== undefined && orphNeeded > v.stake.orphBalance
  const needsOrphApproval = orphNeeded > 0n && v.stake.orphAllowance !== undefined && orphNeeded > v.stake.orphAllowance

  // Junior week-one wallet cap: current balance at pricePerShare plus the new amount must stay within it.
  const walletCap = kind === 'junior' && v.stake.walletCap !== undefined && v.stake.walletCap > 0n ? v.stake.walletCap : null
  const walletRoom = walletCap !== null ? (walletCap > (v.balanceAssets ?? 0n) ? walletCap - (v.balanceAssets ?? 0n) : 0n) : null
  const overWalletCap = mode === 'deposit' && amount !== null && walletRoom !== null && amount > walletRoom

  const insufficient =
    mode === 'deposit'
      ? amount !== null && v.usdcBalance !== undefined && amount > v.usdcBalance
      : amount !== null && v.maxWithdraw !== undefined && amount > v.maxWithdraw
  const blocked = insufficient || orphShort || overWalletCap

  // Clock for the stake ETA comparison, refreshed each minute.
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = window.setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 60_000)
    return () => window.clearInterval(id)
  }, [])
  const stakeEtaLine =
    kind === 'junior' && v.stake.eta !== undefined && v.stake.eta > 0
      ? v.stake.eta <= nowSec
        ? 'Pending rate ready to apply'
        : `Stake rate changes to ${fmtUnits(v.stake.pendingPerAsset, ORPH_DECIMALS)} ORPH per USDC on ${fmtTime(v.stake.eta)}`
      : null

  const routing = !isConnected
    ? 'Connect a wallet on HyperEVM or Elysium'
    : v.onHyperEvm
      ? 'Deposits from HyperEVM settle in one transaction'
      : v.onElysium
        ? 'Deposits from Elysium bridge to HyperEVM first (about a minute)'
        : 'Unsupported chain. Switch to HyperEVM or Elysium'

  function setMax() {
    if (mode === 'deposit') {
      if (v.usdcBalance === undefined) return
      let max = v.usdcBalance
      // Junior: also bounded by the ORPH in the wallet at the current rate, and by the wallet cap.
      if (kind === 'junior' && stakeRequired && v.stake.orphBalance !== undefined) {
        const byOrph = (v.stake.orphBalance * 10n ** BigInt(USDC_DECIMALS)) / v.stake.perAsset!
        if (byOrph < max) max = byOrph
      }
      if (walletRoom !== null && walletRoom < max) max = walletRoom
      setRaw(formatUnits(max, USDC_DECIMALS))
    } else if (v.maxWithdraw !== undefined) {
      setRaw(formatUnits(v.maxWithdraw, inputDecimals))
    }
  }

  function submit() {
    if (!account || amount === null) return
    reset()
    if (mode === 'deposit') {
      if (needsApproval) {
        setLastAction('Approve USDC')
        writeContract({ address: v.usdc, abi: erc20Abi, functionName: 'approve', args: [v.target, amount], chainId: asSupported(chainId) })
        return
      }
      if (needsOrphApproval) {
        setLastAction('Approve ORPH')
        writeContract({ address: v.stake.address, abi: erc20Abi, functionName: 'approve', args: [addresses.hyperEvm.junior, orphNeeded], chainId: hyperEvm.id })
        return
      }
      setLastAction('Deposit')
      const abi = kind === 'senior' ? vaultV2Abi : juniorAbi
      writeContract({ address: v.target as Address, abi, functionName: 'deposit', args: [amount, account], chainId: asSupported(chainId) })
      return
    }
    if (kind === 'senior') {
      setLastAction('Withdraw')
      writeContract({
        address: addresses.hyperEvm.senior,
        abi: vaultV2Abi,
        functionName: 'withdraw',
        args: [amount, account, account],
        chainId: hyperEvm.id,
      })
    } else {
      setLastAction('Request exit')
      writeContract({ address: addresses.hyperEvm.junior, abi: juniorAbi, functionName: 'requestExit', args: [amount], chainId: hyperEvm.id })
    }
  }

  // Exits are always on HyperEVM, where the vault lives.
  const exitNeedsSwitch = mode === 'exit' && isConnected && !v.onHyperEvm

  let primaryLabel: string
  let primaryDisabled = false
  let onPrimary: () => void = submit
  if (!DEPLOYED) {
    primaryLabel = OPENS_LABEL
    primaryDisabled = true
  } else if (!isConnected) {
    primaryLabel = 'Connect to continue'
    primaryDisabled = true
  } else if (unsupportedChain || exitNeedsSwitch) {
    primaryLabel = switching ? 'Switching' : 'Switch to HyperEVM'
    onPrimary = () => switchChain({ chainId: hyperEvm.id })
  } else if (mode === 'deposit' && v.paused) {
    primaryLabel = 'Deposits paused'
    primaryDisabled = true
  } else if (signing || receipt.isLoading) {
    primaryLabel = signing ? 'Confirm in wallet' : 'Pending'
    primaryDisabled = true
  } else if (mode === 'deposit') {
    primaryLabel = needsApproval ? 'Approve USDC' : needsOrphApproval ? 'Approve ORPH' : 'Deposit'
    primaryDisabled = amount === null || blocked
  } else {
    primaryLabel = copy.secondaryVerb
    primaryDisabled = amount === null || insufficient
  }

  const status = writeError
    ? `${lastAction ?? 'Transaction'} failed: ${shortError(writeError)}`
    : receipt.isSuccess
      ? `${lastAction ?? 'Transaction'} confirmed`
      : receipt.isError
        ? `${lastAction ?? 'Transaction'} reverted`
        : txHash
          ? `${lastAction ?? 'Transaction'} sent`
          : ''

  const apyText = v.apy === null ? (kind === 'junior' ? 'n/a until first settle' : v.apyLoading ? 'loading' : NA) : fmtPct(v.apy)

  return (
    <section className={s.area} aria-labelledby={`${kind}-name`}>
      <div className={s.head}>
        <h2 id={`${kind}-name`} className={s.name}>
          {copy.name}
        </h2>
        <span className={s.tag}>{kind === 'senior' ? 'paid first' : 'first loss'}</span>
      </div>
      <p className={s.desc}>{copy.desc}</p>

      <div className={s.apyBlock}>
        <div className={`${s.apy} ${v.apy === null ? s.apyNa : ''}`} aria-live="polite">
          {apyText}
        </div>
        <div className={s.apyLabel}>{copy.apyLabel}</div>
        {kind === 'senior' && !DEPLOYED && <div className={s.caption}>{addresses.hyperEvm.referenceLabel}</div>}
        {kind === 'senior' && v.apyError && <div className={s.caption}>Morpho API unreachable. Retrying.</div>}
        {kind === 'senior' && DEPLOYED && v.cover && (
          <div className={s.caption}>
            Cover in progress: {fmtUsd(v.cover.usd, 2)} being recognised, about {Number.isFinite(v.cover.hours) ? fmtNum(v.cover.hours, 0) : NA} hours to
            full. Withdrawing before then realises the gap.
          </div>
        )}
      </div>

      <dl className={s.rows}>
        <div className={s.row}>
          <dt>TVL</dt>
          <dd>{fmtUsd(v.tvl)}</dd>
        </div>
        <div className={`${s.row} ${s.capRow}`}>
          <div className={s.capTop}>
            <dt>Cap</dt>
            <dd>
              {fmtUsd(v.cap)} <span style={{ color: 'var(--muted)' }}>({v.capUsed === null ? NA : fmtPct(v.capUsed)} used)</span>
            </dd>
          </div>
          <div className={s.bar} role="presentation">
            <div className={s.barFill} style={{ width: `${Math.round((v.capUsed ?? 0) * 100)}%` }} />
          </div>
        </div>
        <div className={s.row}>
          <dt>Your balance</dt>
          <dd>{isConnected && DEPLOYED ? `${fmtUnits(v.balanceAssets, USDC_DECIMALS)} USDC` : NA}</dd>
        </div>
      </dl>

      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault()
          if (!primaryDisabled) onPrimary()
        }}
      >
        <label className={s.inputWrap}>
          <span className="sr-only">
            {mode === 'deposit' ? 'Amount to deposit' : `Amount to ${copy.secondaryVerb.toLowerCase()}`}
          </span>
          <input
            className={s.input}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={raw}
            disabled={!DEPLOYED}
            onChange={(e) => {
              const next = e.target.value.replace(',', '.')
              if (next === '' || new RegExp(`^\\d*(\\.\\d{0,${inputDecimals}})?$`).test(next)) setRaw(next)
            }}
          />
          <span className={s.unit}>{mode === 'exit' && kind === 'junior' ? 'shares' : 'USDC'}</span>
          <button type="button" className={s.max} onClick={setMax} disabled={!DEPLOYED || !isConnected}>
            MAX
          </button>
        </label>
        <div className={s.hint}>
          {mode === 'deposit' ? (
            <>
              {routing}
              {kind === 'junior' && (
                <>
                  <br />
                  {!DEPLOYED ? (
                    <>Required ORPH: n/a until Monday</>
                  ) : v.stake.token === ZERO ? (
                    <>No stake required yet</>
                  ) : stakeRequired ? (
                    <>
                      Requires <span className={s.hintStrong}>{fmtUnits(orphNeeded, ORPH_DECIMALS)} ORPH</span> ({v.stakeBps / 100}% of deposit at the
                      current rate)
                    </>
                  ) : (
                    <>Required ORPH: loading</>
                  )}
                  {stakeEtaLine && (
                    <>
                      <br />
                      {stakeEtaLine}
                    </>
                  )}
                  {walletCap !== null && (
                    <>
                      <br />
                      Week-one limit: {fmtUsd(Number(walletCap) / 10 ** USDC_DECIMALS)} per wallet
                    </>
                  )}
                </>
              )}
              {insufficient && (
                <>
                  <br />
                  Amount exceeds wallet balance
                </>
              )}
              {orphShort && (
                <>
                  <br />
                  Not enough ORPH in wallet: {fmtUnits(v.stake.orphBalance, ORPH_DECIMALS)} ORPH available
                </>
              )}
              {overWalletCap && (
                <>
                  <br />
                  Exceeds week-one limit by {fmtUnits(amount! - walletRoom!, USDC_DECIMALS)} USDC
                </>
              )}
            </>
          ) : kind === 'senior' ? (
            <>Withdraws from available liquidity on HyperEVM</>
          ) : (
            <>Priced at the first weekly settle after your 7-day notice ends. Claim after that settle</>
          )}
        </div>
        <div className={s.actions}>
          <button type="submit" className={s.primary} disabled={primaryDisabled}>
            {primaryLabel}
          </button>
          <button
            type="button"
            className={s.secondary}
            disabled={!DEPLOYED}
            onClick={() => {
              setMode(mode === 'deposit' ? 'exit' : 'deposit')
              setRaw('')
              reset()
            }}
          >
            {mode === 'deposit' ? copy.secondary : 'Deposit'}
          </button>
        </div>
        <div className={`${s.status} ${writeError || receipt.isError ? s.statusErr : ''}`} aria-live="polite">
          {status}
        </div>
      </form>
    </section>
  )
}

function shortError(e: Error): string {
  const m = e.message || String(e)
  const first = m.split('\n')[0]
  return first.length > 120 ? first.slice(0, 117) + '...' : first
}
