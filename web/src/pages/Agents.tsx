import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AGENTS, type AgentCategory } from '../lib/agents'
import s from './Agents.module.css'

const CATS: ('All' | AgentCategory)[] = ['All', 'Momentum', 'Reversion', 'Yield', 'Event']

export function AgentIcon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Agents() {
  const [cat, setCat] = useState<(typeof CATS)[number]>('All')
  const list = AGENTS.filter((a) => cat === 'All' || a.category === cat)
  return (
    <div className={`wrap ${s.page}`}>
      <section className={s.hero}>
        <div className={s.heroText}>
          <div className="label">Agent marketplace</div>
          <h1 className={s.h1}>Pick an agent. Subscribe. It trades for you.</h1>
          <p className={s.lead}>
            Each agent runs one strategy on Hyperliquid with rules fixed onchain. Subscribe, allot USDC, and the agent trades it. Subscriptions are paid in $ORPH. Performance shows only from live fills, never from backtests.
          </p>
        </div>
        <div className={s.heroRight}>
          <div className={s.kpis}>
            <div>
              <div className="label">Agents</div>
              <div className={s.kpi}>{AGENTS.length}</div>
            </div>
            <div>
              <div className="label">Subscribers</div>
              <div className={s.kpi}>0</div>
            </div>
            <div>
              <div className="label">Allotted</div>
              <div className={s.kpi}>$0</div>
            </div>
          </div>
          <Link to="/agents/launch" className={s.launch}>
            Launch an agent
          </Link>
        </div>
      </section>

      <div className={s.notice}>Marketplace opens with the $ORPH launch. Strategies below are final; subscribing and launching unlock then.</div>

      <div className={s.filters}>
        <div className={s.chips}>
          {CATS.map((c) => (
            <button key={c} type="button" className={`${s.chip} ${cat === c ? s.chipOn : ''}`} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className={s.sort}>
          <span className="label">Sort</span>
          <button type="button" className={`${s.chip} ${s.chipOn}`}>
            Newest
          </button>
          <button type="button" className={s.chip} disabled title="Available once agents have live fills">
            30d ROI
          </button>
        </div>
      </div>

      <section className={s.grid}>
        {list.map((a) => (
          <article key={a.slug} className={s.card}>
            <div className={s.cardTop}>
              <span className={s.orb}>
                <AgentIcon d={a.icon} />
              </span>
              <span className="label">{a.category}</span>
            </div>
            <div>
              <h2 className={s.name}>
                <Link to={`/agents/${a.slug}`}>{a.name}</Link>
              </h2>
              <div className="label" style={{ marginTop: 8 }}>
                {a.role} · ${a.symbol}
              </div>
            </div>
            <p className={s.rule}>{a.rule}</p>
            <div className={s.params}>
              {a.params.map((p) => (
                <div key={p.k}>
                  <div className={s.pk}>{p.k}</div>
                  <div className={s.pv}>{p.v}</div>
                </div>
              ))}
            </div>
            <div className={s.perf}>
              <div>
                <div className="label">30d ROI</div>
                <div className={`${s.roi} ${s.roiNa}`}>n/a</div>
                <div className={s.perfNote}>no live fills yet</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="label">Subscribers</div>
                <div className={s.subs}>0</div>
              </div>
            </div>
            <div className={s.cardFoot}>
              <span className="label">from {a.subscription.toLocaleString('en-US')} $ORPH</span>
              <Link to={`/agents/${a.slug}`} className={s.subscribe}>
                Subscribe
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className={s.foot}>
        <div>
          <div className="label">How it works</div>
          <p>Subscribe with $ORPH, allot USDC, and the agent trades that allotment from a wallet only it can sign for and only you can withdraw from. Launch your own: set the rules, and its token lists paired with $ORPH.</p>
        </div>
        <div>
          <div className="label">What ROI means here</div>
          <p>Realised profit and loss on the agent's live fills over the last 30 days, after fees and funding, divided by average allotment. Past 30 days, never a forecast. Nothing shows until an agent has 30 days of live history.</p>
        </div>
        <div>
          <div className="label">Leverage warning</div>
          <p>Leveraged agents can lose most of an allotment in one trade. Every card shows the stop. Nothing here is advice.</p>
        </div>
      </section>
    </div>
  )
}
