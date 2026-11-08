import { useEffect, useMemo, useState } from 'react'
import { formatUnits, parseUnits, type Address } from 'viem'
import { useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { erc20Abi } from '../abi/erc20'
import { juniorAbi } from '../abi/junior'
import { vaultV2Abi } from '../abi/vaultV2'
import { asSupported, hyperEvm } from '../chains'
import { JUNIOR_SYMBOL, OPENS_LABEL, SENIOR_SYMBOL, ZERO, addresses } from '../config/addresses'
import { DEMO } from '../config/demo'
import { useSession } from '../hooks/useSession'
import { LIVE, ORPH_DECIMALS, SHARE_DECIMALS, USDC_DECIMALS, requiredStake, type VaultKind, type VaultState } from '../hooks/useVault'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'
import { NA, fmtNum, fmtPct, fmtTime, fmtUnits, fmtUsd, truncateAddress } from '../lib/format'
import { fmtClockUtc, fmtDateUtc, noticeEnds, settleAtOrAfter } from '../lib/schedule'
import s from './VaultArea.module.css'

const COPY = {
  senior: {
    name: 'senior',
    chip: 'paid first',
    desc: 'USDC in a Morpho vault we curate. Paid first each week. Withdraw to available liquidity any time.',
    apyLabel: 'est. APY, live from Morpho',
    secondary: 'Withdraw',
  },
  junior: {
    name: 'junior',
    chip: 'first loss',
    desc: "First loss. 20% of your deposit staked in ORPH. Exit after 7 days' notice, priced at the first weekly settle after the notice ends.",
    apyLabel: 'est. APY, after first settle',
    secondary: 'Request exit',
  },
} as const

type Mode = 'deposit' | 'exit'

function amountRegex(decimals: number) {
  return new RegExp(`^\\d*(\\.\\d{0,${decimals}})?$`)
}

function parseAmount(v: string, decimals: number): bigint | null {
  if (!v || !amountRegex(decimals).test(v)) return null
  try {
    const n = parseUnits(v, decimals)
    return n > 0n ? n : null
  } catch {
    return null
  }
}

function readTitle(ms: number | undefined) {
  return ms ? `read ${fmtClockUtc(ms)} UTC` : undefined
}

export default function VaultArea({ kind, state: v }: { kind: VaultKind; state: VaultState }) {
  const copy = COPY[kind]
  const { address: account, isConnected, chainId } = useSession()
  const { switchChain, isPending: switching } = useSwitchChain()
  const [mode, setMode] = useState<Mode>('deposit')
  const [raw, setRaw] = useState('')
  const [lastAction, setLastAction] = useState<string | null>(null)

  // Junior exits are denominated in shares (18 decimals). Everything else is USDC.
  const inputDecimals = kind === 'junior' && mode === 'exit' ? SHARE_DECIMALS : USDC_DECIMALS
  const amount = useMemo(() => parseAmount(raw, inputDecimals), [raw, inputDecimals])

  const { writeContract, data: txHash, isPending: signing, error: writeError, reset } = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash: txHash })

  // Clear the input once, when a sent transaction confirms (state adjusted during render, not in an effect).
  const [handledHash, setHandledHash] = useState<string | undefined>(undefined)
  const [confirmed, setConfirmed] = useState<{ action: string; hash: string } | null>(null)
  if (receipt.isSuccess && txHash && handledHash !== txHash) {
    setHandledHash(txHash)
    setConfirmed({ action: lastAction ?? 'transaction', hash: txHash })
    if (lastAction === 'deposit' || lastAction === 'withdraw' || lastAction === 'request exit' || lastAction === 'claim') setRaw('')
  }

  const refetch = v.refetch
  useEffect(() => {
    if (receipt.isSuccess) refetch()
  }, [receipt.isSuccess, refetch])

  // Clock for date comparisons, refreshed each minute.
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = window.setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 60_000)
    return () => window.clearInterval(id)
  }, [])

  // Animated readouts: previous to new over 240 ms, never on first paint.
  const apyShown = useAnimatedNumber(v.apy)
  const tvlShown = useAnimatedNumber(v.tvl)
  const capUsedShown = useAnimatedNumber(v.capUsed)
  const balanceShown = useAnimatedNumber(v.balanceAssets !== undefined ? Number(v.balanceAssets) / 10 ** USDC_DECIMALS : null)
  const sharesShown = useAnimatedNumber(v.balanceShares !== undefined ? Number(v.balanceShares) / 10 ** SHARE_DECIMALS : null)

  // Cover recognition bar: fraction of the outstanding cover recognised since this page loaded.
  const coverRatePerSec = v.cover && Number.isFinite(v.cover.hours) && v.cover.hours > 0 ? v.cover.usd / (v.cover.hours * 3600) : 0
  const [coverTick, setCoverTick] = useState(0)
  useEffect(() => {
    if (!v.cover) return
    const id = window.setInterval(() => setCoverTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [v.cover])
  const coverElapsed = coverTick // seconds since mount, driven by the interval
  const coverProgress = v.cover && coverRatePerSec > 0 ? Math.min(1, (coverElapsed * coverRatePerSec) / v.cover.usd) : 0

  const unsupportedChain = isConnected && !v.onElysium && !v.onHyperEvm
  const needsApproval = mode === 'deposit' && amount !== null && v.allowance !== undefined && v.allowance < amount

  // Junior stake.
  const stakeRequired = v.stake.token !== undefined && v.stake.token !== ZERO && v.stake.perAsset !== undefined && v.stake.perAsset > 0n
  const orphNeeded = kind === 'junior' && mode === 'deposit' && amount !== null && stakeRequired ? requiredStake(amount, v.stake.perAsset!) : 0n
  const orphShort = orphNeeded > 0n && v.stake.orphBalance !== undefined && orphNeeded > v.stake.orphBalance
  const needsOrphApproval = orphNeeded > 0n && v.stake.orphAllowance !== undefined && orphNeeded > v.stake.orphAllowance

  // Junior wallet cap.
  const walletCap = kind === 'junior' && v.stake.walletCap !== undefined && v.stake.walletCap > 0n ? v.stake.walletCap : null
  const walletRoom = walletCap !== null ? (walletCap > (v.balanceAssets ?? 0n) ? walletCap - (v.balanceAssets ?? 0n) : 0n) : null
  const overWalletCap = mode === 'deposit' && amount !== null && walletRoom !== null && amount > walletRoom

  const insufficient = mode === 'deposit' && amount !== null && v.usdcBalance !== undefined && amount > v.usdcBalance
  const aboveAvailable = mode === 'exit' && amount !== null && v.maxWithdraw !== undefined && amount > v.maxWithdraw
  const blocked = insufficient || orphShort || overWalletCap || aboveAvailable

  const routing = !isConnected
    ? 'Connect a wallet on HyperEVM or Elysium'
    : v.onHyperEvm
      ? 'Deposits from HyperEVM settle in one transaction'
      : v.onElysium
        ? 'Deposits from Elysium bridge to HyperEVM first (about a minute)'
        : 'Unsupported chain. Switch to HyperEVM or Elysium'

  const stakeEtaLine =
    kind === 'junior' && v.stake.eta !== undefined && v.stake.eta > 0
      ? v.stake.eta <= nowSec
        ? 'Pending rate ready to apply'
        : `Stake rate changes to ${fmtUnits(v.stake.pendingPerAsset, ORPH_DECIMALS)} ORPH per USDC on ${fmtTime(v.stake.eta)}`
      : null

  // Deposit preview.
  const previewShares: bigint | null = (() => {
    if (amount === null || mode !== 'deposit') return null
    if (kind === 'senior') return v.seniorSharesPerUsdc !== undefined ? (amount * v.seniorSharesPerUsdc) / 10n ** BigInt(USDC_DECIMALS) : null
    if (v.pricePerShare === undefined || v.pricePerShare === 0n) return null
    return (amount * 10n ** BigInt(SHARE_DECIMALS - USDC_DECIMALS) * 10n ** 18n) / v.pricePerShare
  })()

  // Junior exit schedule.
  const open = kind === 'junior' ? v.exit : null
  const readyAt = open ? open.readyAt : noticeEnds(nowSec)
  const settleAt = settleAtOrAfter(readyAt, LIVE ? v.lastSettle : undefined)
  const settled = v.lastSettle !== undefined && v.lastSettle >= readyAt
  const claimable = !!open && settled
  const exitStop = !open ? 0 : nowSec < readyAt ? 1 : !settled ? 2 : 3

  function setMax() {
    if (mode === 'deposit') {
      if (v.usdcBalance === undefined) return
      let max = v.usdcBalance
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
    if (!account) return
    reset()
    setConfirmed(null)
    if (mode === 'deposit') {
      if (amount === null) return
      if (needsApproval) {
        setLastAction('approve usdc')
        writeContract({ address: v.usdc, abi: erc20Abi, functionName: 'approve', args: [v.target, amount], chainId: asSupported(chainId) })
        return
      }
      if (needsOrphApproval) {
        setLastAction('approve orph')
        writeContract({ address: v.stake.address, abi: erc20Abi, functionName: 'approve', args: [addresses.hyperEvm.junior, orphNeeded], chainId: hyperEvm.id })
        return
      }
      setLastAction('deposit')
      const abi = kind === 'senior' ? vaultV2Abi : juniorAbi
      writeContract({ address: v.target as Address, abi, functionName: 'deposit', args: [amount, account], chainId: asSupported(chainId) })
      return
    }
    if (kind === 'senior') {
      if (amount === null) return
      setLastAction('withdraw')
      writeContract({ address: addresses.hyperEvm.senior, abi: vaultV2Abi, functionName: 'withdraw', args: [amount, account, account], chainId: hyperEvm.id })
      return
    }
    if (open) {
      setLastAction('claim')
      writeContract({ address: addresses.hyperEvm.junior, abi: juniorAbi, functionName: 'claimExit', chainId: hyperEvm.id })
      return
    }
    if (amount === null) return
    setLastAction('request exit')
    writeContract({ address: addresses.hyperEvm.junior, abi: juniorAbi, functionName: 'requestExit', args: [amount], chainId: hyperEvm.id })
  }

  const exitNeedsSwitch = mode === 'exit' && isConnected && !v.onHyperEvm
  const busy = signing || receipt.isLoading

  let primaryLabel: string
  let primaryDisabled = false
  let onPrimary: () => void = submit
  if (!LIVE) {
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
  } else if (busy) {
    primaryLabel = signing ? 'Confirm in wallet' : 'Pending'
    primaryDisabled = true
  } else if (mode === 'deposit') {
    primaryLabel = needsApproval ? 'Approve USDC' : needsOrphApproval ? 'Approve ORPH' : 'Deposit'
    primaryDisabled = amount === null || blocked
  } else if (kind === 'senior') {
    primaryLabel = 'Withdraw'
    primaryDisabled = amount === null || blocked
  } else if (open) {
    primaryLabel = claimable ? 'Claim' : `Claim after ${fmtDateUtc(settleAt)}`
    primaryDisabled = !claimable
  } else {
    primaryLabel = 'Request exit'
    primaryDisabled = amount === null || blocked
  }

  const explorer = hyperEvm.blockExplorers.default.url
  const status = writeError ? (
    <span className={s.statusErr}>
      {lastAction ?? 'transaction'} failed: {shortError(writeError)}
    </span>
  ) : receipt.isError ? (
    <span className={s.statusErr}>{lastAction ?? 'transaction'} reverted</span>
  ) : confirmed ? (
    <>
      {confirmed.action} confirmed <span style={{ color: 'var(--faint)' }}>·</span>{' '}
      <a href={`${explorer}/tx/${confirmed.hash}`} target="_blank" rel="noreferrer">
        {truncateAddress(confirmed.hash)}
      </a>
    </>
  ) : txHash ? (
    <>{lastAction ?? 'transaction'} sent</>
  ) : null

  const apyText = v.apy === null ? (kind === 'junior' ? 'n/a until first settle' : v.apyLoading ? 'loading' : NA) : fmtPct(apyShown)

  // Stepper state.
  const steps: { label: string; done: boolean }[] = [
    { label: 'approve usdc', done: amount !== null && v.allowance !== undefined && v.allowance >= amount },
    ...(kind === 'junior' ? [{ label: 'approve orph', done: amount !== null && (!stakeRequired || (v.stake.orphAllowance !== undefined && v.stake.orphAllowance >= orphNeeded)) }] : []),
    { label: 'deposit', done: confirmed?.action === 'deposit' },
  ]
  const currentStep = steps.findIndex((st) => !st.done)

  const summary = (() => {
    if (amount === null || mode !== 'deposit') return null
    const usdcText = `${fmtUnits(amount, USDC_DECIMALS)} USDC`
    if (kind === 'senior') {
      return `You deposit ${usdcText} and receive about ${previewShares !== null ? fmtUnits(previewShares, SHARE_DECIMALS) : NA} ${SENIOR_SYMBOL}`
    }
    const stakeText = stakeRequired ? `, stake ${fmtUnits(orphNeeded, ORPH_DECIMALS, 0)} ORPH (returned on exit)` : ''
    return `You deposit ${usdcText}${stakeText} and receive ${previewShares !== null ? fmtUnits(previewShares, SHARE_DECIMALS) : NA} ${JUNIOR_SYMBOL}`
  })()

  const lockedWorth = open && v.pricePerShare !== undefined ? Number((open.shares * v.pricePerShare) / 10n ** 18n) / 10 ** SHARE_DECIMALS : null

  return (
    <section className={s.area} data-kind={kind} aria-labelledby={`${kind}-name`}>
      <div className={s.head}>
        <h2 id={`${kind}-name`} className={s.name}>
          {copy.name}
        </h2>
        <span className={s.chip}>{copy.chip}</span>
      </div>
      <p className={s.desc}>{copy.desc}</p>

      <div className={s.apyBlock}>
        <div className={`${s.apy} ${v.apy === null ? s.apyNa : ''}`} aria-live="polite" title={readTitle(v.apyReadAt)}>
          {apyText}
        </div>
        <div className={s.apyLabel}>{copy.apyLabel}</div>
        {kind === 'senior' && !LIVE && <div className={s.caption}>{addresses.hyperEvm.referenceLabel}</div>}
        {kind === 'senior' && v.apyError && <div className={s.caption}>Morpho API unreachable. Retrying.</div>}
        {kind === 'senior' && !v.apyError && v.apy === null && v.apyUnlisted && <div className={s.caption}>APY shows once Morpho indexes the vault. Senior assets currently sit in Felix USDC; see the Felix rate for a reference.</div>}
        {kind === 'senior' && LIVE && v.cover && (
          <div className={s.cover}>
            Cover in progress: {fmtUsd(v.cover.usd, 2)} being recognised, about {Number.isFinite(v.cover.hours) ? fmtNum(v.cover.hours, 0) : NA} hours to
            full. Withdrawing before then realises the gap.
            <div className={s.coverBar} role="presentation">
              <div className={s.coverFill} style={{ width: `${(coverProgress * 100).toFixed(4)}%` }} />
            </div>
          </div>
        )}
      </div>

      <dl className={s.rows}>
        <div className={s.row}>
          <dt className="label">TVL</dt>
          <dd title={readTitle(v.chainReadAt)}>{fmtUsd(tvlShown)}</dd>
        </div>
        <div className={`${s.row} ${s.capRow}`}>
          <div className={s.capTop}>
            <dt className="label">Cap</dt>
            <dd title={readTitle(v.chainReadAt)}>
              {fmtUsd(v.cap)} <span style={{ color: 'var(--muted)' }}>({capUsedShown === null ? NA : fmtPct(capUsedShown)} used)</span>
            </dd>
          </div>
          <div className={s.bar} role="presentation">
            <div className={s.barFill} style={{ width: `${((capUsedShown ?? 0) * 100).toFixed(2)}%` }} />
          </div>
        </div>
        <div className={s.row}>
          <dt className="label">Your balance</dt>
          <dd title={readTitle(v.chainReadAt)}>
            {isConnected && LIVE && balanceShown !== null
              ? kind === 'junior'
                ? `${fmtNum(sharesShown)} ${JUNIOR_SYMBOL} (${fmtUsd(balanceShown, 2)})`
                : fmtUsd(balanceShown, 2)
              : NA}
          </dd>
        </div>
      </dl>

      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault()
          if (!primaryDisabled) onPrimary()
        }}
      >
        {mode === 'exit' && kind === 'senior' && (
          <p className={s.avail} title={readTitle(v.chainReadAt)}>
            Available now: <b>{v.maxWithdraw !== undefined ? fmtUsd(Number(v.maxWithdraw) / 10 ** USDC_DECIMALS, 2) : NA}</b>
          </p>
        )}

        {mode === 'exit' && kind === 'junior' && open ? (
          <>
            <p className={s.locked}>
              {fmtUnits(open.shares, SHARE_DECIMALS)} {JUNIOR_SYMBOL} locked, worth about {lockedWorth !== null ? fmtUsd(lockedWorth, 2) : NA} at the last price
            </p>
            <p className={s.lockedSub}>Exit requested. Claim opens after the settle that prices it.</p>
          </>
        ) : (
          <label className={s.inputWrap}>
            <span className="sr-only">{mode === 'deposit' ? 'Amount to deposit' : kind === 'senior' ? 'Amount to withdraw' : 'Shares to exit'}</span>
            <input
              className={s.input}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={raw}
              disabled={!LIVE}
              onChange={(e) => {
                const next = e.target.value.replace(',', '.')
                if (next === '' || amountRegex(inputDecimals).test(next)) setRaw(next)
              }}
            />
            <span className={s.unit}>{mode === 'exit' && kind === 'junior' ? JUNIOR_SYMBOL : 'USDC'}</span>
            <button type="button" className={s.max} onClick={setMax} disabled={!LIVE || !isConnected}>
              MAX
            </button>
          </label>
        )}

        <div className={s.hint}>
          {mode === 'deposit' ? (
            <>
              {routing}
              {kind === 'junior' && (
                <>
                  <br />
                  {!LIVE ? (
                    <>Required ORPH: n/a until Monday</>
                  ) : v.stake.token === ZERO ? (
                    <>No stake required yet</>
                  ) : stakeRequired && amount !== null ? (
                    <>
                      Requires <span className={s.hintStrong}>{fmtUnits(orphNeeded, ORPH_DECIMALS)} ORPH</span> ({v.stakeBps / 100}% of deposit at the
                      current rate)
                    </>
                  ) : stakeRequired ? (
                    <>
                      Stake rate: {fmtUnits(v.stake.perAsset, ORPH_DECIMALS, 0)} ORPH per USDC ({v.stakeBps / 100}% of deposit)
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
                  <span className={s.warn}>Amount exceeds wallet balance</span>
                </>
              )}
              {orphShort && (
                <>
                  <br />
                  <span className={s.warn}>Not enough ORPH in wallet: {fmtUnits(v.stake.orphBalance, ORPH_DECIMALS)} ORPH available</span>
                </>
              )}
              {overWalletCap && (
                <>
                  <br />
                  <span className={s.warn}>Exceeds week-one limit by {fmtUnits(amount! - walletRoom!, USDC_DECIMALS)} USDC</span>
                </>
              )}
            </>
          ) : kind === 'senior' ? (
            aboveAvailable ? (
              <span className={s.warn}>Above available liquidity. The rest is in Morpho markets; try a smaller amount or again later.</span>
            ) : (
              <>Withdraws from available liquidity on HyperEVM</>
            )
          ) : open ? null : (
            <>Priced at the first weekly settle after your 7-day notice ends. Claim after that settle</>
          )}
        </div>

        {mode === 'deposit' && LIVE && (
          <>
            <div className={`${s.summary} ${summary ? '' : s.summaryEmpty}`} aria-live="polite">
              {summary ?? 'Enter an amount to see what you receive'}
            </div>
            <ol className={s.steps} aria-label="Deposit steps">
              {steps.map((st, i) => (
                <li key={st.label} className={`${s.step} ${st.done ? s.stepDone : i === currentStep ? s.stepCurrent : ''}`}>
                  {i + 1} {st.label}
                </li>
              ))}
            </ol>
          </>
        )}

        {mode === 'exit' && kind === 'junior' && (
          <ol className={s.timeline} aria-label="Exit timeline">
            {[
              { label: 'request', date: open ? fmtDateUtc(open.readyAt - 7 * 86_400) : 'today' },
              { label: 'notice ends', date: fmtDateUtc(readyAt) },
              { label: 'priced at settle', date: fmtDateUtc(settleAt) },
              { label: 'claim', date: claimable ? 'now' : `after ${fmtDateUtc(settleAt)}` },
            ].map((stop, i) => (
              <li key={stop.label} className={`${s.stop} ${open && i < exitStop ? s.stopDone : i === exitStop && (open || i === 0) ? s.stopCurrent : ''}`}>
                <span className={s.stopLabel}>{stop.label}</span>
                <span className={s.stopDate}>{stop.date}</span>
              </li>
            ))}
          </ol>
        )}

        <div className={s.actions}>
          <button type="submit" className={s.primary} disabled={primaryDisabled}>
            {primaryLabel}
          </button>
          <button
            type="button"
            className={s.secondary}
            disabled={!LIVE}
            onClick={() => {
              setMode(mode === 'deposit' ? 'exit' : 'deposit')
              setRaw('')
              setConfirmed(null)
              reset()
            }}
          >
            {mode === 'deposit' ? copy.secondary : 'Deposit'}
          </button>
        </div>
        <div className={s.status} aria-live="polite">
          {status}
          {DEMO && !status && <span style={{ color: 'var(--faint)' }}>demo fixtures, no wallet</span>}
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
