import { Link, Navigate, useParams } from 'react-router-dom'
import { circuitAgentUrl, shortId, useCircuitAgents } from '../lib/circuit'
import { AgentIcon, ReturnValue } from './Agents'
import s from './AgentPage.module.css'

/** A Circuit catalogue agent. Everything shown is what Circuit's public API reports; the session itself runs on Circuit. */
export default function CircuitAgentPage() {
  const { id } = useParams()
  const agents = useCircuitAgents()
  if (agents.isLoading) {
    return (
      <div className={`wrap ${s.page}`}>
        <Link to="/agents" className={s.back}>
          ← All agents
        </Link>
        <p className={s.long}>Loading from Circuit.</p>
      </div>
    )
  }
  const agent = agents.data?.find((a) => shortId(a.id) === id)
  if (!agent) return <Navigate to="/agents" replace />
  return (
    <div className={`wrap ${s.page}`}>
      <Link to="/agents" className={s.back}>
        ← All agents
      </Link>
      <section className={s.split}>
        <div className={s.left}>
          <div className={s.head}>
            <div className={s.identity}>
              <span className={s.avatar}>
                <AgentIcon d="M3 11l3-4 3 3 2-2 2 3" size={28} />
              </span>
              <div>
                <h1 className={s.h1}>{agent.name}</h1>
                <div className={s.tags}>
                  <span className={s.tag}>{agent.official ? 'Circuit agent' : 'Community agent'}</span>
                  <span className={s.tag}>{agent.paper ? 'Paper money available' : 'Real wallets only'}</span>
                  <span className={s.tag}>{agent.people.toLocaleString('en-US')} running</span>
                </div>
              </div>
            </div>
            <div className={s.roiBlock}>
              <ReturnValue value={agent.return_percent} className={s.roi} />
              <div className="label">30d · live sessions · per Circuit</div>
            </div>
          </div>

          <p className={s.long}>{agent.description}</p>

          <div className={s.chart}>
            <div className={s.chartHead}>
              <span className="label">Activity</span>
              <span className="label">on Circuit</span>
            </div>
            <div className={s.chartEmpty}>
              <span>Session history, fills and the full strategy write-up live on the agent's Circuit page. Orphic shows the catalogue; the engine is theirs.</span>
            </div>
          </div>

          <div className={s.tiles}>
            {[
              ['30d return', agent.return_percent === null ? 'n/a' : `${Number(agent.return_percent) > 0 ? '+' : ''}${Number(agent.return_percent).toFixed(2)}%`],
              ['People running it', agent.people.toLocaleString('en-US')],
              ['Creator', agent.official ? 'Circuit' : 'Community'],
              ['Paper trading', agent.paper ? 'Yes' : 'No'],
            ].map(([k, v]) => (
              <div key={k} className={s.tile}>
                <div className="label">{k}</div>
                <div className={s.tileV}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <aside className={s.panel}>
          <div className={s.panelHead}>
            <div>
              <h2 className={s.h2}>Run it</h2>
              <div className="label" style={{ marginTop: 8 }}>
                Today on Circuit · through Orphic with $ORPH at launch
              </div>
            </div>
          </div>
          <div className={s.form}>
            <a href={circuitAgentUrl(agent.id)} target="_blank" rel="noreferrer" className={s.primary} style={{ textAlign: 'center', textDecoration: 'none' }}>
              Open on Circuit
            </a>
            <button type="button" className={s.primary} disabled>
              Subscribe · opens with the $ORPH launch
            </button>
            <p className={s.fine}>
              On Circuit you sign in with a passkey, pick a wallet and start the agent{agent.paper ? ', on paper money first if you like' : ''}. The agent trades that wallet and can never withdraw from it. Subscribing through Orphic will do the same from this page, paid in $ORPH.
            </p>
          </div>
          <dl className={s.rows}>
            {[
              ['Agent id', shortId(agent.id)],
              ['Runs on', 'Circuit engine'],
              ['Return source', "Circuit's live sessions, 30 days"],
            ].map(([k, v]) => (
              <div key={k} className={s.row}>
                <dt>{k}</dt>
                <dd style={{ overflowWrap: 'anywhere' }}>{v}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </section>
    </div>
  )
}
