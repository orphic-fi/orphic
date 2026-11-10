import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import RunAgent, { type RunMode } from '../components/RunAgent'
import { AGENTS } from '../lib/agents'
import { ORPHIC_AGENT_IDS, groupOf, offEcosystem, shortId, useCircuitAgents, useRotator, type AgentGroup, type CircuitAgent } from '../lib/circuit'
import { permitDaysLeft, useCircuitAccount, useCircuitActions, useCircuitLink, usePermit } from '../lib/circuitSession'
import { fmtNum, fmtPct, fmtUsd } from '../lib/format'
import { useFunding } from '../lib/hyperliquid'
import s from './AgentsV2.module.css'

type Mood = 'steady' | 'bets' | 'orphic'
const STEADY: AgentGroup[] = ['Yield', 'Neutral', 'Liquidity']
const BETS: AgentGroup[] = ['Long', 'Short', 'Copy', 'Other']

export function ReturnValue({ value, className = '' }: { value: string | null; className?: string }) {
  if (value === null || value === undefined || value === '') return <span className={`${s.ret} ${s.retNa} ${className}`}>n/a</span>
  const n = Number(value)
  return (
    <span className={`${s.ret} ${n < 0 ? s.retNeg : n > 0 ? s.retPos : s.retNa} ${className}`}>
      {n > 0 ? '+' : ''}
      {fmtNum(n, 1)}%
    </span>
  )
}

export function AgentIcon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const ret = (a: CircuitAgent) => (a.return_percent === null ? Number.NEGATIVE_INFINITY : Number(a.return_percent))

export default function Agents() {
  const agents = useCircuitAgents()
  const rotator = useRotator()
  const funding = useFunding('HYPE')
  const permit = usePermit()
  const account = useCircuitAccount()
  const { begin, unlink, state: linkState } = useCircuitLink()
  const { stop } = useCircuitActions()
  const [mood, setMood] = useState<Mood>('steady')
  const [showAll, setShowAll] = useState(false)
  const [run, setRun] = useState<{ agent: CircuitAgent; mode: RunMode } | null>(null)

  const all = useMemo(() => agents.data ?? [], [agents.data])
  // Hyperliquid and Elysium only: agents on other chains (Robinhood Chain stock tokens) do not belong on this page.
  const catalogue = useMemo(() => all.filter((a) => !ORPHIC_AGENT_IDS[a.id] && groupOf(a) !== 'Farming' && !offEcosystem(a)), [all])
  const steady = useMemo(() => catalogue.filter((a) => STEADY.includes(groupOf(a))).sort((x, y) => ret(y) - ret(x) || y.people - x.people), [catalogue])
  const bets = useMemo(() => catalogue.filter((a) => BETS.includes(groupOf(a))).sort((x, y) => ret(y) - ret(x) || y.people - x.people), [catalogue])
  const leaders = useMemo(() => [...catalogue].sort((x, y) => ret(y) - ret(x)).filter((a) => a.return_percent !== null).slice(0, 5), [catalogue])
  const people = all.reduce((n, a) => n + (a.people || 0), 0)
  const rot = rotator.data
  const f = funding.data
  const best = (xs: CircuitAgent[]) => xs.find((a) => a.return_percent !== null)
  const rows = mood === 'steady' ? steady : mood === 'bets' ? bets : []
  const visible = showAll ? rows : rows.slice(0, 6)
  const sessions = account.data?.sessions ?? []
  const days = permitDaysLeft(account.data)

  return (
    <div className={s.page}>
      {/* Live strip */}
      <div className={s.strip}>
        <div className={`wrap ${s.stripInner}`}>
          <span>
            <i className={s.dot} />
            <b>Rotator</b> {rot ? `${rot.decision.move ? 'rebalanced' : 'held'} at ${new Date(rot.runAt).toUTCString().slice(17, 22)} UTC` : 'hourly'}
            {rot?.vaultUsd != null ? ` · ${fmtUsd(rot.vaultUsd)} in the vault` : ''}
          </span>
          <span>
            <i className={`${s.dot} ${s.dotAmber}`} />
            <b>Neutral</b> {f ? (f.apy8 > 5 ? 'in position' : 'waiting') : 'paper'} · $HYPE funding {f ? `${f.apy8 > 0 ? '+' : ''}${fmtNum(f.apy8, 1)}% ann.` : '…'}
          </span>
          {leaders.slice(0, 2).map((a) => (
            <span key={a.id}>
              <b>{a.name}</b> <ReturnValue value={a.return_percent} className={s.stripRet} /> 30d · {a.people} running
            </span>
          ))}
          <span>
            <b>{people.toLocaleString('en-US')}</b> people running agents on Circuit
          </span>
        </div>
      </div>

      <div className={`wrap ${s.body}`}>
        {/* Hero + leaders */}
        <section className={s.hero}>
          <div className={s.heroText}>
            <div>
              <div className="label">Agents</div>
              <h1 className={s.h1}>
                Pick an agent.
                <br />
                It trades your wallet.
                <br />
                You can stop it any time.
              </h1>
              <p className={s.lead}>Start on paper money, go live with a cap when you trust it. Every number here is from real sessions, never a forecast.</p>
            </div>
            <div className={s.heroActions}>
              {permit ? (
                <>
                  <a href="#my-agents" className={s.cta}>
                    My agents{sessions.length ? ` · ${sessions.length}` : ''}
                  </a>
                  <span className={s.linked}>
                    <i className={s.dot} /> Linked to Circuit{days !== null ? ` · ${days} days left` : ''}
                  </span>
                </>
              ) : (
                <>
                  <button type="button" className={s.cta} onClick={() => void begin()}>
                    {linkState.phase === 'waiting' ? 'Waiting for your passkey in the window…' : 'Start on paper money'}
                  </button>
                  <Link to="/how-it-works" className={s.ghost}>
                    How agents work
                  </Link>
                </>
              )}
            </div>
          </div>

          <aside className={s.leaders}>
            <div className={s.leadersHead}>
              <div>
                <div className="label">Leaders · last 30 days · live sessions</div>
                <div className={s.leadersTitle}>Leaderboard</div>
              </div>
              <span className="label">per Circuit</span>
            </div>
            {leaders.length === 0 && <div className={s.muted}>{agents.isLoading ? 'Loading from Circuit.' : 'No figures yet.'}</div>}
            {leaders.map((a, i) => (
              <div key={a.id} className={s.leadRow}>
                <span className="label">{i + 1}</span>
                <span className={s.leadName}>
                  <Link to={`/agents/c/${shortId(a.id)}`}>{a.name}</Link>
                  <span className={s.leadSub}>
                    {a.official ? 'Circuit' : 'Community'} · {a.people} running · {groupOf(a)}
                  </span>
                </span>
                <ReturnValue value={a.return_percent} className={s.leadRet} />
                <button type="button" className={s.mini} onClick={() => setRun({ agent: a, mode: a.paper ? 'paper' : 'live' })}>
                  {a.paper ? 'Paper' : 'Run'}
                </button>
              </div>
            ))}
            <p className={s.leadersNote}>Season 1 scoring (net live return over drawdown, 90 days) starts once Orphic indexes fills itself. Until then this is Circuit's 30-day figure, unchanged.</p>
          </aside>
        </section>

        {/* Three moods */}
        <section className={s.moods}>
          <button type="button" className={`${s.mood} ${mood === 'steady' ? s.moodOn : ''}`} onClick={() => setMood('steady')}>
            <div className={s.moodTop}>
              <span className="label">Steady</span>
              <span className="label">{steady.length} agents</span>
            </div>
            <h3>Earn a rate, keep your money</h3>
            <p>Lending and hedged books. No price view.{best(steady) ? ` Best this month: ${best(steady)!.name}.` : ''}</p>
          </button>
          <button type="button" className={`${s.mood} ${mood === 'bets' ? s.moodOn : ''}`} onClick={() => setMood('bets')}>
            <div className={s.moodTop}>
              <span className="label">Bets</span>
              <span className="label">{bets.length} agents</span>
            </div>
            <h3>Take a side, with a stop</h3>
            <p>Long, short and copy agents. Pays in the right market, bleeds in the wrong one.{best(bets) ? ` Best this month: ${best(bets)!.name}.` : ''}</p>
          </button>
          <button type="button" className={`${s.mood} ${mood === 'orphic' ? s.moodOn : ''}`} onClick={() => setMood('orphic')}>
            <div className={s.moodTop}>
              <span className="label">Orphic's own</span>
              <span className="label">3 agents</span>
            </div>
            <h3>The ones we run ourselves</h3>
            <p>Rotator runs senior and junior. Neutral is on paper. Sniper buys Elysium launches. All decide publicly.</p>
          </button>
        </section>

        {/* Rows */}
        <section>
          <div className={s.listHead}>
            <span className="label">
              {mood === 'orphic' ? "Orphic's own" : mood === 'steady' ? 'Steady · Orphic first, then best 30-day return' : 'Bets · best 30-day return first'}{mood !== 'orphic' ? ' · as Circuit reports it' : ''}
            </span>
          </div>
          <div className={`${s.row} ${s.rowHead}`}>
            <span className="label">Agent</span>
            <span className="label">30d return</span>
            <span className="label">Running</span>
            <span className="label">Paper</span>
            <span className={`label ${s.right}`}>Run</span>
          </div>

          {(mood === 'orphic' || mood === 'steady') && (
            <>
              <div className={s.row}>
                <div>
                  <h2 className={s.name}>
                    <Link to="/agents/orphic-rotator">Orphic Rotator</Link> <span className={s.tagMint}>Orphic</span>
                  </h2>
                  <div className={s.by}>
                    <i className={`${s.skin} ${s.skinOn}`} />
                    Orphic runs {rot?.vaultUsd != null ? fmtUsd(rot.vaultUsd) : 'its own capital'} · Elysium · hourly
                  </div>
                  <div className={s.one}>Keeps senior in the best Morpho venues and junior's spare USDC earning. Cannot move funds anywhere but the vaults.</div>
                </div>
                <div>
                  <div className={`${s.big} ${s.retPos}`}>{rot?.bookApy != null ? fmtPct(rot.bookApy) : '–'}</div>
                  <div className={s.sm}>book rate · est.</div>
                </div>
                <div>
                  <div className={s.v}>vault</div>
                  <div className={s.sm}>all depositors</div>
                </div>
                <div>
                  <div className={s.v}>n/a</div>
                  <div className={s.sm}>{rot ? (rot.decision.move ? 'rebalanced' : 'held') : ''}</div>
                </div>
                <div className={s.actions}>
                  <Link to="/vaults" className={s.cta}>
                    Deposit
                  </Link>
                </div>
              </div>
              <div className={s.row}>
                <div>
                  <h2 className={s.name}>
                    <Link to="/agents/orphic-neutral">Orphic Neutral</Link> <span className={s.tagAmber}>Paper</span>
                  </h2>
                  <div className={s.by}>
                    <i className={`${s.skin} ${s.skinAmber}`} />
                    Orphic · simulated money since 9 Nov · Hyperliquid
                  </div>
                  <div className={s.one}>
                    Holds spot $HYPE and an equal short, collects funding while longs pay.{f ? (f.apy8 > 5 ? ' Funding is above its bar.' : ' Waiting: funding is below its bar today.') : ''}
                  </div>
                </div>
                <div>
                  <div className={`${s.big} ${s.retNa}`}>{f ? `${f.apy8 > 0 ? '+' : ''}${fmtNum(f.apy8, 1)}%` : '–'}</div>
                  <div className={s.sm}>$HYPE funding · 8h ann.</div>
                </div>
                <div>
                  <div className={s.v}>1</div>
                  <div className={s.sm}>Orphic</div>
                </div>
                <div>
                  <div className={s.v}>yes</div>
                  <div className={s.sm}>1,000 simulated</div>
                </div>
                <div className={s.actions}>
                  <Link to="/agents/orphic-neutral" className={s.ghost}>
                    Watch it decide
                  </Link>
                </div>
              </div>
            </>
          )}

          {(mood === 'orphic' || mood === 'bets') && (
            <div className={s.row}>
              <div>
                <h2 className={s.name}>
                  <Link to="/agents/orphic-sniper">Orphic Sniper</Link> <span className={s.tagMint}>Orphic</span>
                </h2>
                <div className={s.by}>
                  <i className={`${s.skin} ${s.skinOn}`} />
                  Orphic · live on its own wallet since 10 Nov · Elysium · every minute
                </div>
                <div className={s.one}>Buys new launches once they show $25k cap, 50 holders, $5k volume and a rehearsed sell. +30% out, -70% out, five slots.</div>
              </div>
              <div>
                <div className={`${s.big} ${s.retNa}`}>new</div>
                <div className={s.sm}>P&L on its page</div>
              </div>
              <div>
                <div className={s.v}>1</div>
                <div className={s.sm}>Orphic</div>
              </div>
              <div>
                <div className={s.v}>no</div>
                <div className={s.sm}>real HYPE only</div>
              </div>
              <div className={s.actions}>
                <Link to="/agents/orphic-sniper" className={s.ghost}>
                  See its snipes
                </Link>
              </div>
            </div>
          )}

          {mood !== 'orphic' &&
            visible.map((a) => (
              <div key={a.id} className={s.row}>
                <div>
                  <h2 className={s.name}>
                    <Link to={`/agents/c/${shortId(a.id)}`}>{a.name}</Link>
                  </h2>
                  <div className={s.by}>
                    <i className={`${s.skin} ${a.official ? s.skinOn : ''}`} />
                    {a.official ? 'Circuit' : 'Community'} · {groupOf(a)}
                  </div>
                  <div className={s.one}>{a.description}</div>
                </div>
                <div>
                  <ReturnValue value={a.return_percent} className={s.big} />
                  <div className={s.sm}>{a.return_percent === null ? 'no 30d figure yet' : '30d · live, per Circuit'}</div>
                </div>
                <div>
                  <div className={s.v}>{a.people.toLocaleString('en-US')}</div>
                  <div className={s.sm}>people</div>
                </div>
                <div>
                  <div className={s.v}>{a.paper ? 'yes' : 'no'}</div>
                  <div className={s.sm}>{a.paper ? 'free to try' : 'real wallets only'}</div>
                </div>
                <div className={s.actions}>
                  {a.paper && (
                    <button type="button" className={s.ghost} onClick={() => setRun({ agent: a, mode: 'paper' })}>
                      Paper
                    </button>
                  )}
                  <button type="button" className={s.cta} onClick={() => setRun({ agent: a, mode: 'live' })}>
                    Run live
                  </button>
                </div>
              </div>
            ))}
          {mood !== 'orphic' && agents.isLoading && <div className={s.muted}>Loading the live catalogue from Circuit.</div>}
          {mood !== 'orphic' && rows.length > 6 && (
            <div className={s.more}>
              <button type="button" className={s.ghost} onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Show fewer' : `Show all ${rows.length} ${mood === 'steady' ? 'Steady' : 'Bets'} agents`}
              </button>
            </div>
          )}
        </section>

        {/* My agents */}
        {permit && (
          <section id="my-agents" className={s.mine}>
            <div className={s.listHead}>
              <span className="label">My agents · from your Circuit account</span>
              <button type="button" className="label" style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)' }} onClick={() => void unlink()}>
                Unlink Circuit
              </button>
            </div>
            {account.data?.wallets.length ? (
              <div className={s.sm} style={{ marginBottom: 8 }}>
                Circuit wallet{account.data.wallets.length > 1 ? 's' : ''}: {account.data.wallets.map((w) => `${w.address.slice(0, 6)}…${w.address.slice(-4)} (${w.value_usd ? fmtUsd(Number(w.value_usd)) : '–'})`).join(', ')}. Agents run here, not on the wallet connected to the site.
              </div>
            ) : null}
            {sessions.length === 0 && <div className={s.muted}>{account.isLoading ? 'Loading your account.' : 'Nothing running yet. Pick an agent above and start it on paper money.'}</div>}
            {sessions.map((sess) => (
              <div key={sess.id} className={s.mineRow}>
                <div>
                  <div className={s.name}>{sess.name}</div>
                  <div className={s.sm}>
                    {sess.wallet ? 'live wallet' : 'paper money'} · since {new Date(sess.started_at).toUTCString().slice(5, 16)} · {sess.status === 'running' ? 'running' : sess.status === 'needs_user' ? 'needs a tap on Circuit' : 'stopped'}
                    {sess.error ? ` · ${sess.error}` : ''}
                  </div>
                </div>
                <div>
                  <div className={s.v}>{sess.value_usd ? fmtUsd(Number(sess.value_usd), 2) : '–'}</div>
                  <div className={s.sm}>{sess.pnl_usd ? `${Number(sess.pnl_usd) >= 0 ? '+' : ''}${fmtUsd(Number(sess.pnl_usd), 2)} since start` : ''}</div>
                </div>
                <div className={s.actions}>
                  {(() => {
                    const w = account.data?.wallets.find((x) => x.id === sess.wallet)
                    return w ? (
                      <Link to={`/agents/wallet/${w.address}`} className={s.ghost}>
                        Trades
                      </Link>
                    ) : null
                  })()}
                  {sess.status !== 'stopped' && (
                    <button type="button" className={s.ghost} onClick={() => void stop(sess.id)}>
                      Stop
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* In design */}
        <section>
          <div className={s.listHead}>
            <span className="label">Orphic strategies in design</span>
            <Link to="/agents/launch" className="label">
              Launch an agent →
            </Link>
          </div>
          <div className={s.design}>
            {AGENTS.slice(0, 4).map((a) => (
              <Link key={a.slug} to={`/agents/${a.slug}`} className={s.designItem}>
                <span className={s.orb}>
                  <AgentIcon d={a.icon} />
                </span>
                <span>
                  <span className={s.designName}>{a.name}</span>
                  <span className={s.sm}>
                    {a.role} · {a.market}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Ladder */}
        <section className={s.ladder}>
          <div className={s.step}>
            <span className={s.c}>1</span>
            <div>
              <div className={s.stepTitle}>Paper first</div>
              <p>Every agent runs on simulated money before it is offered. You can too, free.</p>
            </div>
          </div>
          <div className={s.step}>
            <span className={s.c}>2</span>
            <div>
              <div className={s.stepTitle}>Live with a cap</div>
              <p>Start small on the first live run. The agent trades your wallet within its rules and can never withdraw from it. Stop any time.</p>
            </div>
          </div>
          <div className={s.step}>
            <span className={s.c}>3</span>
            <div>
              <div className={s.stepTitle}>Pay in $ORPH</div>
              <p>Free until launch. Then subscriptions priced in dollars and settled in $ORPH, bought at the moment you pay. Stake $ORPH and they are free.</p>
            </div>
          </div>
        </section>
      </div>

      {run && <RunAgent agent={run.agent} mode={run.mode} onClose={() => setRun(null)} />}
    </div>
  )
}
