import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { findAgent } from '../lib/agents'
import { AgentIcon } from './Agents'
import s from './AgentPage.module.css'

export default function AgentPage() {
  const { slug } = useParams()
  const agent = findAgent(slug)
  const [allot, setAllot] = useState('')
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
                <AgentIcon d={agent.icon} size={28} />
              </span>
              <div>
                <h1 className={s.h1}>{agent.name}</h1>
                <div className={s.tags}>
                  <span className={s.tag}>{agent.category}</span>
                  <span className={s.tag}>{agent.market}</span>
                  <span className={s.tag}>{agent.leverage}</span>
                  <span className={s.tag}>${agent.symbol}</span>
                </div>
              </div>
            </div>
            <div className={s.roiBlock}>
              <div className={s.roi}>n/a</div>
              <div className="label">30d realised · no live fills yet</div>
            </div>
          </div>

          <p className={s.long}>{agent.longRule}</p>

          <div className={s.chart}>
            <div className={s.chartHead}>
              <span className="label">Equity, 30 days, $1,000 allotted</span>
              <span className="label">realised fills</span>
            </div>
            <div className={s.chartEmpty}>
              <span>No live history yet. The curve draws from the agent's first fill onward; nothing is backfilled from backtests.</span>
            </div>
          </div>

          <div className={s.tiles}>
            {[
              ['Trades (30d)', '0'],
              ['Win rate', 'n/a'],
              ['Worst trade', 'n/a'],
              ['Time in market', 'n/a'],
            ].map(([k, v]) => (
              <div key={k} className={s.tile}>
                <div className="label">{k}</div>
                <div className={s.tileV}>{v}</div>
              </div>
            ))}
          </div>

          <div>
            <div className={s.tradesHead}>
              <span className="label">Recent trades</span>
              <span className="label">All fills on HyperEVM</span>
            </div>
            <div className={s.tradeRow}>
              <span className={s.m}>Opened</span>
              <span className={s.m}>Trigger</span>
              <span className={s.m}>Entry</span>
              <span className={s.m}>Exit</span>
              <span className={`${s.m} ${s.r}`}>Result</span>
            </div>
            <div className={s.tradesEmpty}>No trades yet.</div>
          </div>
        </div>

        <aside className={s.panel}>
          <div className={s.panelHead}>
            <div>
              <h2 className={s.h2}>Subscribe</h2>
              <div className="label" style={{ marginTop: 8 }}>
                0 subscribers · $0 allotted
              </div>
            </div>
          </div>
          <form
            className={s.form}
            onSubmit={(e) => {
              e.preventDefault()
            }}
          >
            <div className={s.field}>
              <label className="label" htmlFor="allot">
                You allot
              </label>
              <div className={s.fieldRow}>
                <input id="allot" className={s.big} inputMode="decimal" placeholder="0.00" value={allot} onChange={(e) => setAllot(e.target.value.replace(/[^\d.]/g, ''))} />
                <span className={s.chip}>
                  <span className={s.coin}>$</span>USDC
                </span>
              </div>
              <div className={s.fieldSub}>
                <span>{agent.name} trades this amount</span>
                <span>Balance n/a</span>
              </div>
            </div>
            <div className={`${s.field} ${s.fieldSoft}`}>
              <div className="label">Subscription</div>
              <div className={s.fieldRow}>
                <span className={s.big}>{agent.subscription.toLocaleString('en-US')}</span>
                <span className={s.chip}>
                  <span className={s.coin}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M11.2 2.9A6 6 0 1 0 13.1 4.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                  $ORPH
                </span>
              </div>
              <div className={s.fieldSub}>
                <span>Held as {agent.subscription.toLocaleString('en-US')} ${agent.symbol} while subscribed</span>
                <span>$ORPH not launched yet</span>
              </div>
            </div>
            <button type="submit" className={s.primary} disabled>
              Opens with the $ORPH launch
            </button>
            <p className={s.fine}>
              Your $ORPH is swapped into ${agent.symbol} and locked while you are subscribed; unsubscribe any time and it swaps back at the pool price. The USDC allotment sits in a wallet only {agent.name} can sign for and only you can withdraw from.
            </p>
          </form>
          <dl className={s.rows}>
            {[
              ['Rule', agent.params.map((p) => p.v).slice(0, 2).join(' → ')],
              ['Take profit / stop', `${agent.params[2].v} / ${agent.params[3].v}`],
              ['Worst case', agent.worstCase],
              ['Agent fee', agent.fee],
              ['Creator', 'Orphic'],
            ].map(([k, v]) => (
              <div key={k} className={s.row}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </section>
    </div>
  )
}
