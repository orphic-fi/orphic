import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Mark } from '../components/Layout'
import { NEUTRAL_AGENT_ID, circuitAgentUrl } from '../lib/circuit'
import { fmtNum } from '../lib/format'
import s from './AgentPage.module.css'

/** Hourly HYPE funding from Hyperliquid's public info endpoint, annualised. The agent reads the same numbers through Circuit. */
async function fetchFunding(): Promise<{ apy8: number; apy24: number; apy7d: number; negativeHours24: number }> {
  const r = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'fundingHistory', coin: 'HYPE', startTime: Date.now() - 8 * 86_400_000 }),
  })
  if (!r.ok) throw new Error(`funding ${r.status}`)
  const rows = (await r.json()) as { time: number; fundingRate: string }[]
  const rates = rows.sort((a, b) => a.time - b.time).map((x) => Number(x.fundingRate))
  const ann = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length) * 24 * 365 * 100 : NaN)
  return { apy8: ann(rates.slice(-8)), apy24: ann(rates.slice(-24)), apy7d: ann(rates.slice(-168)), negativeHours24: rates.slice(-24).filter((x) => x < 0).length }
}

export default function NeutralPage() {
  const funding = useQuery({ queryKey: ['hype-funding'], queryFn: fetchFunding, staleTime: 5 * 60_000, refetchInterval: 10 * 60_000 })
  const f = funding.data
  const bar = 5
  const wouldEnter = f ? f.apy8 > bar && f.apy24 > 0 : null
  const pct = (v: number | undefined) => (v === undefined || Number.isNaN(v) ? 'n/a' : `${v > 0 ? '+' : ''}${fmtNum(v, 2)}%`)
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
                <Mark size={28} />
              </span>
              <div>
                <h1 className={s.h1}>Orphic Neutral</h1>
                <div className={s.tags}>
                  <span className={s.tag}>Orphic</span>
                  <span className={s.tag}>Hyperliquid</span>
                  <span className={s.tag}>Market neutral</span>
                  <span className={s.tag}>Paper test</span>
                </div>
              </div>
            </div>
            <div className={s.roiBlock}>
              <div className={s.roi}>{pct(f?.apy8)}</div>
              <div className="label">$HYPE funding now · 8h · annualised</div>
            </div>
          </div>

          <p className={s.long}>
            Neutral holds spot $HYPE and an equal short in the $HYPE perp, so the price can go anywhere and the two legs cancel. What is left is the funding payment: when more people are long than short, longs pay shorts every hour, and the book collects it. The agent enters when that payment is worth the fees, keeps the two legs the same size, cuts risk if the short drifts toward liquidation, and steps out after a full day of funding going the other way. It has no view on price and never takes one.
          </p>

          <div className={s.chart}>
            <div className={s.chartHead}>
              <span className="label">What the agent sees right now</span>
              <span className="label">Hyperliquid, live</span>
            </div>
            <dl className={s.rows} style={{ margin: 0 }}>
              <div className={s.row}>
                <dt>Funding, last 8 hours</dt>
                <dd>{pct(f?.apy8)} annualised</dd>
              </div>
              <div className={s.row}>
                <dt>Funding, last 24 hours</dt>
                <dd>
                  {pct(f?.apy24)} annualised{f ? `, ${f.negativeHours24} of 24 hours negative` : ''}
                </dd>
              </div>
              <div className={s.row}>
                <dt>Funding, last 7 days</dt>
                <dd>{pct(f?.apy7d)} annualised</dd>
              </div>
              <div className={s.row}>
                <dt>Entry bar</dt>
                <dd>above {bar}% annualised over 8h, with a positive day</dd>
              </div>
              <div className={s.row}>
                <dt>Decision at these numbers</dt>
                <dd>{wouldEnter === null ? 'n/a' : wouldEnter ? 'Enter: hold spot, short the perp' : 'Stay flat and wait'}</dd>
              </div>
            </dl>
          </div>

          <div className={s.tiles}>
            {[
              ['Status', 'Paper, 1,000 simulated USDC'],
              ['Since', '9 Nov 2026'],
              ['Hedge', '2x isolated short'],
              ['Checks', 'Hourly'],
            ].map(([k, v]) => (
              <div key={k} className={s.tile}>
                <div className="label">{k}</div>
                <div className={s.tileV}>{v}</div>
              </div>
            ))}
          </div>

          <div>
            <div className={s.tradesHead}>
              <span className="label">What it earns and what it costs</span>
              <span className="label">plain numbers</span>
            </div>
            <dl className={s.rows}>
              <div className={s.row}>
                <dt>Earns</dt>
                <dd>Funding on the short's notional, paid hourly while longs outnumber shorts</dd>
              </div>
              <div className={s.row}>
                <dt>Capital</dt>
                <dd>Spot leg plus margin, about 1.5 dollars per dollar hedged, so the rate on capital is lower than the funding rate</dd>
              </div>
              <div className={s.row}>
                <dt>Costs</dt>
                <dd>Two orders in, two out, about a quarter percent per round trip; a small gap between spot and perp at entry</dd>
              </div>
              <div className={s.row}>
                <dt>Risks</dt>
                <dd>Funding turns negative and the book pays; a sharp rally pushes the short toward liquidation before the agent trims it</dd>
              </div>
            </dl>
          </div>
        </div>

        <aside className={s.panel}>
          <div className={s.panelHead}>
            <div>
              <h2 className={s.h2}>Where it stands</h2>
              <div className="label" style={{ marginTop: 8 }}>
                Step one of three
              </div>
            </div>
          </div>
          <div className={s.form}>
            <a href={circuitAgentUrl(NEUTRAL_AGENT_ID)} target="_blank" rel="noreferrer" className={s.primary} style={{ textAlign: 'center', textDecoration: 'none' }}>
              View on Circuit
            </a>
            <button type="button" className={s.primary} disabled>
              Subscribe · not yet offered
            </button>
            <p className={s.fine}>Orphic agents run on simulated money first, then with our own capital, and only then become something you can subscribe to. Neutral is on simulated money now. Its decisions are public on Circuit hour by hour.</p>
          </div>
          <dl className={s.rows}>
            {[
              ['Market', '$HYPE spot and perp, Hyperliquid'],
              ['Direction', 'None'],
              ['Enters when', 'Funding above 5% annualised'],
              ['Leaves when', 'Funding negative for 24 hours'],
              ['Fee to Orphic', 'Set at launch'],
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
