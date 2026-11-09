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
    name: 'Senior',
    chip: 'Paid first · withdraw any time',
    desc: 'USDC in a Morpho vault we curate. Paid first each week. Withdraw to available liquidity any time.',
    apyLabel: 'est. APY · Morpho 7d',
    secondary: 'Withdraw',
  },
  junior: {
    name: 'Junior',
    chip: 'First loss · 7-day exit · capped',
    desc: "First loss. Exit after 7 days' notice, priced at the first weekly settle after the notice ends.",
    apyLabel: 'projected · est.',
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


  const lockedWorth = open && v.pricePerShare !== undefined ? Number((open.shares * v.pricePerShare) / 10n ** 18n) / 10 ** SHARE_DECIMALS : null

  const receiveText = (() => {
    if (mode !== 'deposit') return null
    if (amount === null) return '0.00'
    return previewShares !== null ? fmtUnits(previewShares, SHARE_DECIMALS) : NA
  })()
  const rateText =
    kind === 'senior'
      ? v.seniorSharesPerUsdc !== undefined && v.seniorSharesPerUsdc > 0n
        ? `1 ${SENIOR_SYMBOL} = ${fmtNum(Number((10n ** BigInt(SHARE_DECIMALS) * 10n ** 6n) / v.seniorSharesPerUsdc) / 1e6, 2)} USDC`
        : `1 ${SENIOR_SYMBOL} = 1.00 USDC`
      : v.pricePerShare !== undefined
        ? `1 ${JUNIOR_SYMBOL} = ${fmtNum(Number(v.pricePerShare) / 1e18, 2)} USDC`
        : `1 ${JUNIOR_SYMBOL} = 1.00 USDC`
  const balanceText = isConnected && LIVE && v.usdcBalance !== undefined ? fmtUnits(v.usdcBalance, USDC_DECIMALS) : NA
  const juniorApyLabel = kind === 'junior' ? 'projected · est.' : v.apyDerived ? 'est. APY · via Felix' : 'est. APY · Morpho 7d'

  return (
    <section className={s.area} data-kind={kind} aria-labelledby={`${kind}-name`}>
      <header className={s.head}>
        <div>
          <h2 id={`${kind}-name`} className={s.name}>
            {copy.name}
          </h2>
          <div className={s.sub}>{copy.chip}</div>
        </div>
        <div className={s.apyBlock} title={readTitle(v.apyReadAt)}>
          <div className={`${s.apy} ${v.apy === null ? s.apyNa : ''}`} aria-live="polite">
            {v.apy === null ? NA : fmtPct(apyShown)}
          </div>
          <div className={s.sub}>{juniorApyLabel}</div>
        </div>
      </header>

      {kind === 'senior' && v.apyDerived && v.apy !== null && (
        <p className={s.caption}>Estimate: Felix USDC's current rate on the share of senior sitting there, minus the 0.5% fee. Morpho shows the vault's own rate once it indexes it.</p>
      )}
      {kind === 'senior' && !v.apyError && v.apy === null && v.apyUnlisted && <p className={s.caption}>Rate unavailable right now: Morpho does not index this vault yet and the Felix rate could not be read.</p>}
      {kind === 'junior' && v.projection && (
        <p className={s.caption}>
          Estimate from today's balances: senior's 0.5% fee spread over junior ({fmtUsd(v.projection.seniorAssets)} on {fmtUsd(v.projection.juniorAssets)}) gives {fmtPct(v.projection.feeShare)}
          {v.projection.idleShare < 1 ? `, plus ${fmtPct(v.projection.deployedYield)} from junior USDC deployed to Felix` : '; junior USDC is idle until the agent deploys it'}. Moves with every deposit.
        </p>
      )}
      {kind === 'senior' && v.apyError && <p className={s.caption}>Morpho API unreachable. Retrying.</p>}
      {kind === 'senior' && LIVE && v.cover && (
        <div className={s.cover}>
          Cover in progress: {fmtUsd(v.cover.usd, 2)} being recognised, about {Number.isFinite(v.cover.hours) ? fmtNum(v.cover.hours, 0) : NA} hours to full.
          Withdrawing before then realises the gap.
          <div className={s.coverBar} role="presentation">
            <div className={s.coverFill} style={{ width: `${(coverProgress * 100).toFixed(4)}%` }} />
          </div>
        </div>
      )}

      <div className={s.tabs} role="tablist" aria-label={`${copy.name} action`}>
        {(['deposit', 'exit'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={`${s.tab} ${mode === m ? s.tabOn : ''}`}
            disabled={!LIVE}
            onClick={() => {
              if (mode === m) return
              setMode(m)
              setRaw('')
              setConfirmed(null)
              reset()
            }}
          >
            {m === 'deposit' ? 'Deposit' : kind === 'senior' ? 'Withdraw' : 'Exit'}
          </button>
        ))}
      </div>

      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault()
          if (!primaryDisabled) onPrimary()
        }}
      >
        {mode === 'exit' && kind === 'junior' && open ? (
          <div className={s.field}>
            <div className="label">Exit requested</div>
            <div className={s.fieldRow}>
              <span className={s.big}>{fmtUnits(open.shares, SHARE_DECIMALS)}</span>
              <span className={s.chip}>
                <Coin kind="junior" />
                {JUNIOR_SYMBOL}
              </span>
            </div>
            <div className={s.fieldSub}>
              <span>Worth about {lockedWorth !== null ? fmtUsd(lockedWorth, 2) : NA} at the last price</span>
              <span>Claim opens after the settle that prices it</span>
            </div>
          </div>
        ) : (
          <div className={s.field}>
            <label className="label" htmlFor={`${kind}-amount`}>
              {mode === 'deposit' ? 'You deposit' : kind === 'senior' ? 'You withdraw' : 'You exit'}
            </label>
            <div className={s.fieldRow}>
              <input
                id={`${kind}-amount`}
                className={s.big}
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
              <span className={s.chip}>
                {mode === 'exit' && kind === 'junior' ? <Coin kind="junior" /> : <Coin kind="usdc" />}
                {mode === 'exit' && kind === 'junior' ? JUNIOR_SYMBOL : 'USDC'}
              </span>
            </div>
            <div className={s.fieldSub}>
              <span>
                {mode === 'deposit'
                  ? amount !== null
                    ? fmtUsd(Number(amount) / 10 ** USDC_DECIMALS, 2)
                    : '$0.00'
                  : kind === 'senior'
                    ? `Available now ${v.maxWithdraw !== undefined ? fmtUsd(Number(v.maxWithdraw) / 10 ** USDC_DECIMALS, 2) : NA}`
                    : `Held ${fmtNum(sharesShown)} ${JUNIOR_SYMBOL}`}
              </span>
              <span>
                {mode === 'deposit' ? `Balance ${balanceText}` : ''}
                <button type="button" className={s.max} onClick={setMax} disabled={!LIVE || !isConnected}>
                  Max
                </button>
              </span>
            </div>
          </div>
        )}

        {mode === 'deposit' && (
          <div className={`${s.field} ${s.fieldSoft}`}>
            <div className="label">You receive</div>
            <div className={s.fieldRow}>
              <span className={`${s.big} ${amount === null ? s.bigMuted : ''}`}>{receiveText}</span>
              <span className={s.chip}>
                <Coin kind={kind} />
                {kind === 'senior' ? SENIOR_SYMBOL : JUNIOR_SYMBOL}
              </span>
            </div>
            <div className={s.fieldSub}>
              <span>{rateText}</span>
              <span>
                {kind === 'senior'
                  ? 'Withdraw any time'
                  : v.stake.token === ZERO || v.stake.token === undefined
                    ? 'No stake needed yet'
                    : stakeRequired && amount !== null
                      ? `Stake ${fmtUnits(orphNeeded, ORPH_DECIMALS, 0)} ORPH, returned on exit`
                      : `Stake ${fmtUnits(v.stake.perAsset, ORPH_DECIMALS, 0)} ORPH per USDC`}
              </span>
            </div>
          </div>
        )}

        {mode === 'exit' && kind === 'junior' && (
          <ol className={s.timeline} aria-label="Exit timeline">
            {[
              { label: 'Request', date: open ? fmtDateUtc(open.readyAt - 7 * 86_400) : 'today' },
              { label: 'Notice ends', date: fmtDateUtc(readyAt) },
              { label: 'Priced at settle', date: fmtDateUtc(settleAt) },
              { label: 'Claim', date: claimable ? 'now' : `after ${fmtDateUtc(settleAt)}` },
            ].map((stop, i) => (
              <li key={stop.label} className={`${s.stop} ${open && i < exitStop ? s.stopDone : i === exitStop && (open || i === 0) ? s.stopCurrent : ''}`}>
                <span className={s.stopLabel}>{stop.label}</span>
                <span className={s.stopDate}>{stop.date}</span>
              </li>
            ))}
          </ol>
        )}

        <button type="submit" className={s.primary} disabled={primaryDisabled}>
          {primaryLabel}
        </button>

        <div className={s.hint} aria-live="polite">
          {status ? (
            status
          ) : mode === 'deposit' ? (
            <>
              {isConnected ? (v.onElysium ? 'Deposits from Elysium bridge to HyperEVM first, about a minute' : v.onHyperEvm ? '' : routing) : routing}
              {insufficient && <span className={s.warn}>Amount exceeds wallet balance</span>}
              {orphShort && <span className={s.warn}>Not enough ORPH in wallet: {fmtUnits(v.stake.orphBalance, ORPH_DECIMALS)} available</span>}
              {overWalletCap && <span className={s.warn}>Exceeds this wallet's limit by {fmtUnits(amount! - walletRoom!, USDC_DECIMALS)} USDC</span>}
              {stakeEtaLine && <span>{stakeEtaLine}</span>}
            </>
          ) : kind === 'senior' ? (
            aboveAvailable ? (
              <span className={s.warn}>Above available liquidity. The rest is in Morpho markets; try a smaller amount or again later.</span>
            ) : (
              'Withdraws from available liquidity on HyperEVM'
            )
          ) : open ? null : (
            'Priced at the first weekly settle after your 7-day notice ends'
          )}
          {DEMO && !status && <span style={{ color: 'var(--faint)' }}>demo fixtures, no wallet</span>}
        </div>
      </form>

      <dl className={s.rows}>
        <div className={s.row}>
          <dt>Deposited</dt>
          <dd title={readTitle(v.chainReadAt)}>
            {fmtUsd(tvlShown)} <span className={s.dim}>/ {fmtUsd(v.cap)}</span>
          </dd>
        </div>
        {kind === 'senior' ? (
          <div className={s.row}>
            <dt>Allocation</dt>
            <dd>Felix USDC 100%</dd>
          </div>
        ) : (
          <div className={s.row}>
            <dt>Stake</dt>
            <dd>{v.stake.token === ZERO || v.stake.token === undefined ? 'None yet' : `${fmtUnits(v.stake.perAsset, ORPH_DECIMALS, 0)} ORPH per USDC`}</dd>
          </div>
        )}
        <div className={s.row}>
          <dt>Your position</dt>
          <dd title={readTitle(v.chainReadAt)}>
            {isConnected && LIVE && balanceShown !== null
              ? `${fmtNum(kind === 'junior' ? sharesShown : balanceShown)} ${kind === 'senior' ? SENIOR_SYMBOL : JUNIOR_SYMBOL} · ${fmtUsd(balanceShown, 2)}`
              : NA}
          </dd>
        </div>
        {kind === 'senior' ? (
          <div className={s.row}>
            <dt>Senior fee to junior</dt>
            <dd>0.5% a year</dd>
          </div>
        ) : (
          <div className={s.row}>
            <dt>Exit queued</dt>
            <dd>{open ? `${fmtUnits(open.shares, SHARE_DECIMALS)} · ready ${fmtDateUtc(open.readyAt)}` : 'None'}</dd>
          </div>
        )}
        <div className={s.row}>
          <dt>Cap used</dt>
          <dd>
            {capUsedShown === null ? NA : fmtPct(capUsedShown)}
            <span className={s.bar} role="presentation">
              <span className={s.barFill} style={{ width: `${((capUsedShown ?? 0) * 100).toFixed(2)}%` }} />
            </span>
          </dd>
        </div>
      </dl>
    </section>
  )
}

function Coin({ kind }: { kind: 'usdc' | 'senior' | 'junior' }) {
  if (kind === 'usdc') return <span className={s.coin}>$</span>
  return (
    <span className={s.coin}>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M11.2 2.9A6 6 0 1 0 13.1 4.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function shortError(e: Error): string {
  const m = e.message || String(e)
  const first = m.split('\n')[0]
  return first.length > 120 ? first.slice(0, 117) + '...' : first
}
