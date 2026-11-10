import { useEffect, useState } from 'react'
import type { CircuitAgent } from '../lib/circuit'
import { CircuitError, type Session } from '../lib/circuitClient'
import { permitDaysLeft, useCircuitAccount, useCircuitActions, useCircuitLink, usePermit } from '../lib/circuitSession'
import { fmtUsd } from '../lib/format'
import FundCircuit from './FundCircuit'
import s from './RunAgent.module.css'

export type RunMode = 'paper' | 'live'

/** Opens Circuit's wallet page in a small window; polls the account until a new wallet shows, then closes it. */
function addWalletOnCircuit(countBefore: number, refetch: () => void) {
  const w = Math.min(520, window.screen.availWidth)
  const h = Math.min(760, window.screen.availHeight)
  const popup = window.open('https://app.circuit.org/wallets', 'orphic-circuit-wallets', `popup=yes,width=${w},height=${h},left=${(window.screen.availWidth - w) / 2},top=${(window.screen.availHeight - h) / 2}`)
  let ticks = 0
  const t = setInterval(() => {
    refetch()
    ticks += 1
    if (ticks > 90 || popup?.closed) clearInterval(t)
  }, 4000)
  void countBefore
}

function networkLabel(n: string): string {
  const map: Record<string, string> = {
    hypercore: 'Hyperliquid',
    'ethereum:999': 'HyperEVM',
    'ethereum:99901': 'Elysium',
    'ethereum:42161': 'Arbitrum',
    'ethereum:8453': 'Base',
    'ethereum:1': 'Ethereum',
  }
  return map[n] ?? n.replace('ethereum:', 'chain ')
}

interface Props {
  agent: Pick<CircuitAgent, 'id' | 'name' | 'paper'>
  mode: RunMode
  onClose: () => void
}

/**
 * Start an agent from Orphic. Paper runs on simulated money; live runs on one of the user's Circuit wallets. The
 * agent trades that wallet and can never withdraw from it; the user can stop it here or on Circuit at any time.
 */
export default function RunAgent({ agent, mode: initialMode, onClose }: Props) {
  const permit = usePermit()
  const { state, begin, unlink } = useCircuitLink()
  const account = useCircuitAccount()
  const { start } = useCircuitActions()
  const [mode, setMode] = useState<RunMode>(initialMode)
  const [amount, setAmount] = useState(initialMode === 'paper' ? '1000' : '100')
  const [chosenWallet, setWallet] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Default to the first wallet without an effect: derived, so it follows the account read.
  const wallet = chosenWallet ?? account.data?.wallets[0]?.id ?? null
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const go = async () => {
    setBusy(true)
    setError(null)
    try {
      const sess = await start(agent.id, mode === 'paper' ? null : wallet, amount)
      setResult(sess)
    } catch (err) {
      setError(err instanceof CircuitError ? `${err.message}${err.code ? ` (${err.code})` : ''}` : 'Could not start the agent')
    } finally {
      setBusy(false)
    }
  }

  const days = permitDaysLeft(account.data)
  const wallets = account.data?.wallets ?? []

  return (
    <div className={s.backdrop} onClick={onClose} role="presentation">
      <div className={s.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Run ${agent.name}`}>
        <div className={s.head}>
          <div>
            <div className="label">Run</div>
            <h2 className={s.h2}>{agent.name}</h2>
          </div>
          <button type="button" className={s.x} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {result ? (
          <div className={s.done}>
            <div className={s.doneBig}>{result.status === 'running' ? 'Running' : result.status === 'needs_user' ? 'One step on Circuit' : 'Stopped'}</div>
            <p className={s.fine}>
              {result.status === 'running'
                ? `${agent.name} is running ${mode === 'paper' ? 'on paper money' : 'on your wallet'}. It checks in on its own schedule; you can stop it from My agents or on Circuit.`
                : result.status === 'needs_user'
                  ? 'Circuit wants you to confirm this start in its own app, a passkey tap. The session shows here once you have.'
                  : 'The session did not start. Try again or check Circuit.'}
            </p>
            {result.status === 'needs_user' && (
              <a href="https://app.circuit.org" target="_blank" rel="noreferrer" className={s.primary}>
                Open Circuit
              </a>
            )}
            <button type="button" className={s.secondary} onClick={onClose}>
              Done
            </button>
          </div>
        ) : !permit ? (
          <div className={s.link}>
            <p className={s.fine}>
              One passkey links your Circuit account to Orphic for 30 days. Orphic can then start and stop agents for you; it can never withdraw from your wallets, and the link is revocable any time. Your key stays in this browser.
            </p>
            {state.phase === 'waiting' && state.via === 'frame' ? (
              <iframe
                src={state.url}
                title="Link Circuit"
                className={s.frame}
                allow="publickey-credentials-get; publickey-credentials-create"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            ) : state.phase === 'waiting' ? (
              <>
                <div className={s.waiting}>Waiting for your passkey in the Circuit window. This page stays put; the window closes on its own.</div>
                <a href={state.url} target="_blank" rel="noreferrer" className={s.secondary}>
                  Reopen the window
                </a>
              </>
            ) : (
              <button type="button" className={s.primary} onClick={() => void begin()}>
                Link Circuit with a passkey
              </button>
            )}
            {state.phase === 'failed' && <div className={s.err}>{state.message}</div>}
          </div>
        ) : (
          <div className={s.form}>
            <div className={s.seg}>
              <button type="button" className={mode === 'paper' ? s.segOn : ''} onClick={() => setMode('paper')} disabled={agent.paper === false}>
                Paper money
              </button>
              <button type="button" className={mode === 'live' ? s.segOn : ''} onClick={() => setMode('live')}>
                Live wallet
              </button>
            </div>
            {mode === 'live' && (
              <>
                <label className={s.field}>
                  <span>Agent wallet (held by Circuit)</span>
                  {wallets.length ? (
                    <select
                      value={wallet ?? ''}
                      onChange={(e) => {
                        if (e.target.value === '__add') {
                          addWalletOnCircuit(wallets.length, () => void account.refetch())
                          return
                        }
                        setWallet(e.target.value)
                      }}
                    >
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.address.slice(0, 6)}…{w.address.slice(-4)} · {w.value_usd ? fmtUsd(Number(w.value_usd)) : '–'}
                          {wallets.length > 1 ? ` · ${w.name}` : ''}
                        </option>
                      ))}
                      <option value="__add">+ Add a wallet on Circuit</option>
                    </select>
                  ) : (
                    <span className={s.muted}>{account.isLoading ? 'loading' : 'no wallets on this account yet'}</span>
                  )}
                </label>
                {(() => {
                  const w = wallets.find((x) => x.id === wallet)
                  if (!w) return null
                  const held = w.holdings.filter((h) => Number(h.amount) > 0)
                  return (
                    <>
                      <FundCircuit to={w.address as `0x${string}`} onSent={() => void account.refetch()} />
                      <div className={s.holdings}>
                        <div className={s.holdingsHead}>
                          <span>What the agent wallet holds</span>
                          <span>{w.value_usd ? fmtUsd(Number(w.value_usd), 2) : '–'}</span>
                        </div>
                        {held.length === 0 && <div className={s.muted}>Empty on every network.</div>}
                        {held.map((h) => (
                          <div key={`${h.network}-${h.symbol}-${h.kind}`} className={s.holding}>
                            <span>
                              {h.symbol} <span className={s.muted}>on {networkLabel(h.network)}</span>
                            </span>
                            <span>
                              {Number(h.amount).toLocaleString('en-US', { maximumFractionDigits: 4 })}
                              {h.value_usd ? ` · ${fmtUsd(Number(h.value_usd), 2)}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className={s.fine}>
                        Two wallets: your MetaMask is where money starts; the agent wallet is where it trades. Circuit holds the agent wallet's key behind your passkey so the agent can sign on its own, which MetaMask never allows. Most agents here trade on Hyperliquid and start from USDC there.
                      </p>
                    </>
                  )
                })()}
              </>
            )}
            <label className={s.field}>
              <span>{mode === 'paper' ? 'Start with (simulated)' : 'Allot'}</span>
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
            </label>
            <div className={s.field}>
              <span>Subscription</span>
              <span>Free until the $ORPH launch</span>
            </div>
            <p className={s.fine}>
              {mode === 'paper'
                ? 'Simulated money on live markets. Nothing real moves. Good for watching how it behaves.'
                : 'The agent trades this wallet within its own rules and can never withdraw from it. Start small; you can top up later. Stop any time.'}
            </p>
            <button type="button" className={s.primary} disabled={busy || !amount || (mode === 'live' && !wallet)} onClick={() => void go()}>
              {busy ? 'Starting…' : mode === 'paper' ? 'Start on paper money' : 'Run live'}
            </button>
            {error && <div className={s.err}>{error}</div>}
            <div className={s.footnote}>
              Linked to Circuit{account.data?.wallets[0] ? ` (${account.data.wallets[0].address.slice(0, 6)}…${account.data.wallets[0].address.slice(-4)})` : ''}{days !== null ? `, ${days} days left` : ''}. Runs on Circuit's engine.{' '}
              <button type="button" className={s.linkBtn} onClick={() => void unlink()}>
                Unlink
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
