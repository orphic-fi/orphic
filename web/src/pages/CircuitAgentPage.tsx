import { Link, Navigate, useParams } from 'react-router-dom'
import { GROUP_BLURB, circuitAgentUrl, groupOf, shortId, useCircuitAgents, type AgentGroup, type CircuitAgent } from '../lib/circuit'
import { fmtNum } from '../lib/format'
import { ReturnValue } from './Agents'
import s from './CircuitAgentPage.module.css'

/** What to know before running each kind of agent. Plain words, three points, no numbers. */
const BEFORE: Record<AgentGroup, string[]> = {
  Yield: ['Earns a rate, not a return: it rises and falls with lending demand.', 'Your money sits in the venues the agent picks; their smart-contract risk is yours.', 'Slow and steady by design; a bad month is a lower rate, not a loss of principal.'],
  Neutral: ['Hedged, so price mostly cancels; what you earn is funding or carry.', 'Funding can turn negative and the book pays instead of earns.', 'A sharp move can stress the hedged leg before it is rebalanced.'],
  Liquidity: ['Earns pool fees while prices stay near where you provided.', 'A sharp move leaves you holding the losing side; fees may not cover it.', 'Works best in busy pools with real volume, not thin ones.'],
  Long: ['A bet that prices go up; it pays in rallies and bleeds in drawdowns.', 'Leverage multiplies both directions and can be liquidated.', 'A good month says nothing about the next one.'],
  Short: ['A bet that prices go down; it pays in drawdowns and bleeds in rallies.', 'Shorts pay funding when the crowd is also short, and squeezes are fast.', 'Recent green numbers come from a falling market, not from skill you can rely on.'],
  Copy: ['You follow other wallets; their edge, their mistakes, their timing minus a delay.', 'Leaderboards favour survivors; last month’s winners rotate.', 'Size mismatch: their position may be small for them and large for you.'],
  Farming: ['Built to farm Papertrade points with paired high-leverage trades.', 'Not a strategy; the point is the emission, and the trades can lose.', 'Treat as an experiment with money you can lose entirely.'],
  Other: ['Read the agent’s own page on Circuit before running it.', 'Start on paper money if it is offered.', 'Set a cap you can afford to lose.'],
}

function pctLabel(v: string | null): string {
  if (v === null) return 'no 30-day figure yet'
  const n = Number(v)
  return `${n > 0 ? '+' : ''}${fmtNum(n, 2)}% over the last 30 days`
}

export default function CircuitAgentPage() {
  const { id } = useParams()
  const agents = useCircuitAgents()
  if (agents.isLoading) {
    return (
      <div className={`wrap ${s.page}`}>
        <Link to="/agents" className={s.back}>
          ← All agents
        </Link>
        <p className={s.muted}>Loading from Circuit.</p>
      </div>
    )
  }
  const agent = agents.data?.find((a) => shortId(a.id) === id)
  if (!agent) return <Navigate to="/agents" replace />
  const group = groupOf(agent)
  const siblings = (agents.data ?? []).filter((a) => a.id !== agent.id && groupOf(a) === group).sort((x, y) => Number(y.return_percent ?? -1e9) - Number(x.return_percent ?? -1e9)).slice(0, 3)

  return (
    <div className={`wrap ${s.page}`}>
      <Link to="/agents" className={s.back}>
        ← All agents
      </Link>

      <header className={s.head}>
        <div className={s.titleBlock}>
          <div className={s.kicker}>
            <span>{group}</span>
            <span className={s.dot} />
            <span>{agent.official ? 'Built by Circuit' : 'Community built'}</span>
            <span className={s.dot} />
            <span>{agent.paper ? 'Paper money available' : 'Real wallets only'}</span>
          </div>
          <h1 className={s.h1}>{agent.name}</h1>
          <p className={s.lede}>{agent.description}</p>
        </div>
        <div className={s.numbers}>
          <div>
            <ReturnValue value={agent.return_percent} className={s.big} />
            <div className={s.numLabel}>{pctLabel(agent.return_percent)}</div>
          </div>
          <div>
            <div className={s.bigPlain}>{agent.people.toLocaleString('en-US')}</div>
            <div className={s.numLabel}>{agent.people === 1 ? 'person running it now' : 'people running it now'}</div>
          </div>
        </div>
      </header>

      <section className={s.body}>
        <div className={s.main}>
          <div className={s.block}>
            <h2 className={s.h2}>What this kind of agent does</h2>
            <p>{GROUP_BLURB[group]}</p>
          </div>
          <div className={s.block}>
            <h2 className={s.h2}>Before you run it</h2>
            <ol className={s.list}>
              {BEFORE[group].map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </div>
          <div className={s.block}>
            <h2 className={s.h2}>Where the number comes from</h2>
            <p>
              The return is Circuit's own figure: the realised result of this agent's live sessions over the last 30 days, across everyone running it. Orphic reads it from Circuit and does not adjust it. The strategy write-up, trade log and equity curve are on the agent's Circuit page.
            </p>
          </div>
          {siblings.length > 0 && (
            <div className={s.block}>
              <h2 className={s.h2}>Others in {group}</h2>
              <div className={s.siblings}>
                {siblings.map((a: CircuitAgent) => (
                  <Link key={a.id} to={`/agents/c/${shortId(a.id)}`} className={s.sib}>
                    <span className={s.sibName}>{a.name}</span>
                    <span className={s.sibDesc}>{a.description}</span>
                    <ReturnValue value={a.return_percent} className={s.sibRet} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className={s.side}>
          <a href={circuitAgentUrl(agent.id)} target="_blank" rel="noreferrer" className={s.primary}>
            Run on Circuit
          </a>
          <button type="button" className={s.secondary} disabled>
            Subscribe with $ORPH · at launch
          </button>
          <p className={s.fine}>
            On Circuit you sign in with a passkey, pick a wallet{agent.paper ? ' or paper money' : ''}, and start it. The agent trades that wallet and can never withdraw from it. Stop it any time.
          </p>
          <dl className={s.facts}>
            <div>
              <dt>Runs on</dt>
              <dd>Circuit engine</dd>
            </div>
            <div>
              <dt>Creator</dt>
              <dd>{agent.official ? 'Circuit' : 'Community'}</dd>
            </div>
            <div>
              <dt>Paper trading</dt>
              <dd>{agent.paper ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt>Agent id</dt>
              <dd className={s.mono}>{shortId(agent.id).slice(0, 8)}</dd>
            </div>
          </dl>
        </aside>
      </section>
    </div>
  )
}
