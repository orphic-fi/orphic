import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AGENTS } from '../lib/agents'
import { ORPHIC_AGENT_IDS, ROTATOR_AGENT_ID, circuitAgentUrl, shortId, useCircuitAgents, useRotator, type CircuitAgent } from '../lib/circuit'
import { fmtNum, fmtPct, fmtUsd } from '../lib/format'
import { Mark } from '../components/Layout'
import s from './Agents.module.css'

export function AgentIcon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 30-day return as Circuit reports it: signed, two decimals, or n/a. */
export function ReturnValue({ value, className = '' }: { value: string | null; className?: string }) {
  if (value === null || value === undefined || value === '') return <span className={`${s.roi} ${s.roiNa} ${className}`}>n/a</span>
  const n = Number(value)
  const tone = n < 0 ? s.roiNeg : n > 0 ? s.roiPos : s.roiNa
  return (
    <span className={`${s.roi} ${tone} ${className}`}>
      {n > 0 ? '+' : ''}
      {fmtNum(n, 2)}%
    </span>
  )
}

function agentPath(a: CircuitAgent): string {
  const own = ORPHIC_AGENT_IDS[a.id]
  return own ? `/agents/${own.slug}` : `/agents/c/${shortId(a.id)}`
}

export default function Agents() {
  const agents = useCircuitAgents()
  const rotator = useRotator()
  const [showAll, setShowAll] = useState(false)
  const TOP = 8

  const all = agents.data ?? []
  const official = all.filter((a) => a.official && !ORPHIC_AGENT_IDS[a.id]).sort((x, y) => y.people - x.people)
  const community = all.filter((a) => !a.official && !ORPHIC_AGENT_IDS[a.id]).sort((x, y) => y.people - x.people)
  const people = all.reduce((n, a) => n + (a.people || 0), 0)
  const rot = rotator.data

  return (
    <div className={`wrap ${s.page}`}>
      <section className={s.hero}>
        <div className={s.heroText}>
          <div className="label">Agent marketplace</div>
          <h1 className={s.h1}>Agents that run strategies for you.</h1>
          <p className={s.lead}>
            Orphic's own agents run the vaults. The rest of the catalogue is live on Circuit today: each agent runs on a wallet only you can withdraw from. Subscribing through Orphic, paid in $ORPH, opens with the token launch.
          </p>
        </div>
        <div className={s.heroRight}>
          <div className={s.kpis}>
            <div>
              <div className="label">Agents live</div>
              <div className={s.kpi}>{agents.data ? all.length : '–'}</div>
            </div>
            <div>
              <div className="label">People running them</div>
              <div className={s.kpi}>{agents.data ? people.toLocaleString('en-US') : '–'}</div>
            </div>
            <div>
              <div className="label">Orphic agents</div>
              <div className={s.kpi}>{Object.keys(ORPHIC_AGENT_IDS).length}</div>
            </div>
          </div>
          <Link to="/agents/launch" className={s.launch}>
            Launch an agent
          </Link>
        </div>
      </section>

      {agents.isError && <div className={s.notice}>Circuit's catalogue is unreachable right now; the Orphic agent below reads from our own hourly report.</div>}

      {/* Orphic's agent: the Rotator, live on Circuit, with the last decision from the keeper report. */}
      <section className={s.feature}>
        <div className={s.featureHead}>
          <div className={s.identity}>
            <span className={s.orbLg}>
              <Mark size={22} />
            </span>
            <div>
              <h2 className={s.featureName}>
                <Link to="/agents/orphic-rotator">Orphic Rotator</Link>
              </h2>
              <div className="label" style={{ marginTop: 8 }}>
                Orphic · Elysium · runs the vaults hourly
              </div>
            </div>
          </div>
          <div className={s.featureActions}>
            <a href={circuitAgentUrl(ROTATOR_AGENT_ID)} target="_blank" rel="noreferrer" className={s.ghostBtn}>
              View on Circuit
            </a>
            <Link to="/agents/orphic-rotator" className={s.subscribe}>
              Details
            </Link>
          </div>
        </div>
        <p className={s.rule}>
          Reads the vaults and Morpho rates every hour, moves senior between allowlisted venues only when the gain clears gas, keeps junior's spare USDC earning and settles junior weekly. It cannot move funds anywhere but the vaults.
        </p>
        <div className={s.featureStats}>
          <div>
            <div className="label">Vault it runs</div>
            <div className={s.stat}>{rot?.vaultUsd != null ? fmtUsd(rot.vaultUsd) : '–'}</div>
          </div>
          <div>
            <div className="label">Book rate now</div>
            <div className={s.stat}>{rot?.bookApy != null ? fmtPct(rot.bookApy) : '–'}</div>
            <div className={s.perfNote}>est. from venue rates</div>
          </div>
          <div>
            <div className="label">Last decision</div>
            <div className={s.stat}>{rot ? (rot.decision.move ? 'Rebalance' : 'Hold') : '–'}</div>
            <div className={s.perfNote}>{rot ? rot.decision.reason : 'waiting for the hourly report'}</div>
          </div>
          <div>
            <div className="label">Junior idle</div>
            <div className={s.stat}>{rot?.juniorIdle ? rot.juniorIdle.action : '–'}</div>
            <div className={s.perfNote}>{rot?.juniorIdle?.felixUsdc != null ? `${fmtUsd(rot.juniorIdle.felixUsdc)} earning in Felix` : ''}</div>
          </div>
          <div>
            <div className="label">Last run</div>
            <div className={s.stat}>{rot ? new Date(rot.runAt).toUTCString().slice(17, 22) + ' UTC' : '–'}</div>
            <div className={s.perfNote}>{rot?.alerts.length ? `${rot.alerts.length} alert(s)` : 'no alerts'}</div>
          </div>
        </div>
      </section>

      <section>
        <div className={s.sectionHead}>
          <div>
            <h2 className={s.h2}>Run today on Circuit</h2>
            <p className={s.sectionLead}>Circuit's own agents. Returns are the last 30 days of live sessions as Circuit reports them, never a forecast.</p>
          </div>
          {agents.data && (
            <button type="button" className={s.chip} onClick={() => setShowAll((v) => !v)}>
              {showAll ? `Show the top ${TOP}` : `Show all ${official.length + community.length}, community included`}
            </button>
          )}
        </div>
        {agents.isLoading && <div className={s.notice}>Loading the live catalogue from Circuit.</div>}
        <div className={s.grid}>
          {(showAll ? [...official, ...community] : official.slice(0, TOP)).map((a) => (
            <article key={a.id} className={s.card}>
              <div className={s.cardTop}>
                <span className={s.orb}>
                  <AgentIcon d="M3 11l3-4 3 3 2-2 2 3" />
                </span>
                <span className="label">{a.official ? 'Circuit' : 'Community'}</span>
              </div>
              <div>
                <h2 className={s.name}>
                  <Link to={agentPath(a)}>{a.name}</Link>
                </h2>
                <div className="label" style={{ marginTop: 8 }}>
                  {a.paper ? 'paper money available' : 'real wallets only'}
                </div>
              </div>
              <p className={s.rule}>{a.description}</p>
              <div className={s.perf}>
                <div>
                  <div className="label">30d return</div>
                  <ReturnValue value={a.return_percent} />
                  <div className={s.perfNote}>live sessions, per Circuit</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="label">Running it</div>
                  <div className={s.subs}>{a.people.toLocaleString('en-US')}</div>
                </div>
              </div>
              <div className={s.cardFoot}>
                <a href={circuitAgentUrl(a.id)} target="_blank" rel="noreferrer" className={s.ghostBtn}>
                  Run on Circuit
                </a>
                <button type="button" className={s.subscribe} disabled title="Opens with the $ORPH launch">
                  Subscribe
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className={s.sectionHead}>
          <div>
            <h2 className={s.h2}>Orphic strategies in design</h2>
            <p className={s.sectionLead}>Agents we are building for the marketplace. Rules are final; they list with their own token paired against $ORPH at launch.</p>
          </div>
        </div>
        <div className={s.rows}>
          {AGENTS.map((a) => (
            <Link key={a.slug} to={`/agents/${a.slug}`} className={s.row}>
              <span className={s.orb}>
                <AgentIcon d={a.icon} />
              </span>
              <span className={s.rowName}>{a.name}</span>
              <span className={s.rowRole}>
                {a.role} · {a.market}
              </span>
              <span className={s.rowRule}>{a.rule}</span>
              <span className="label">${a.symbol}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={s.foot}>
        <div>
          <div className="label">How it works</div>
          <p>An agent runs on Circuit's engine against a wallet you control: it can trade and allocate, never withdraw. Orphic's Rotator runs the vaults the same way. Subscribing through Orphic adds $ORPH payment and, for launched agents, a token paired with $ORPH.</p>
        </div>
        <div>
          <div className="label">What return means here</div>
          <p>Circuit's figure: realised result of the agent's live sessions over the last 30 days. Negative numbers show as they are. Nothing here is backfilled from backtests, and nothing is a forecast.</p>
        </div>
        <div>
          <div className="label">Risk</div>
          <p>Leveraged agents can lose most of an allotment quickly; many of the community agents are high-leverage experiments. Read the agent's page on Circuit before running one. Nothing here is advice.</p>
        </div>
      </section>
    </div>
  )
}
