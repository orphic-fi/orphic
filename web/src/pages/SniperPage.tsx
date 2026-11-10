import { Link } from 'react-router-dom'
import Trades from '../components/Trades'
import { SNIPER_AGENT_ID, circuitAgentUrl } from '../lib/circuit'
import { useLaunches, type Launch } from '../lib/elysiumLedger'
import { fmtUsd } from '../lib/format'
import s from './CircuitAgentPage.module.css'
import t from './SniperPage.module.css'

/** The Orphic Circuit wallet the shadow session runs on. */
export const SNIPER_SHADOW_WALLET = '0x7ffc5e962696ad5b0412f3908fdc442f70b71252' as const
const GATE = { mcap: 25_000, holders: 50, volume: 5_000, ageMin: 30 }

function gates(l: Launch, now: number) {
  const age = l.launchedAt ? (now - l.launchedAt) / 60_000 : 0
  return {
    mcap: (l.marketCapUsd ?? 0) >= GATE.mcap,
    holders: (l.holders ?? 0) >= GATE.holders,
    volume: (l.volume24hUsd ?? 0) >= GATE.volume,
    age: age >= GATE.ageMin,
    ageMin: age,
  }
}

export default function SniperPage() {
  const launches = useLaunches()
  // The feed refetches every minute; its fetch time is the clock the ages are measured against.
  const now = launches.dataUpdatedAt || 0
  const feed = (launches.data ?? []).filter((l) => l.launchedAt).sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0))
  const passing = feed.filter((l) => Object.entries(gates(l, now)).every(([k, v]) => k === 'ageMin' || v))
  const watch = feed.slice(0, 6)

  return (
    <div className={`wrap ${s.page}`}>
      <Link to="/agents" className={s.back}>
        ← All agents
      </Link>

      <header className={s.head}>
        <div className={s.titleBlock}>
          <div className={s.kicker}>
            <span>Bets</span>
            <span className={s.dot} />
            <span>Built by Orphic</span>
            <span className={s.dot} />
            <span>Elysium · real wallets only</span>
          </div>
          <h1 className={s.h1}>Orphic Sniper</h1>
          <p className={s.lede}>
            Buys new Elysium launches only after they prove out: $25,000 of market cap, 50 holders, $5,000 of volume, and a rehearsed sell that shows the token can be sold. Five slots, +30% out, -70% out. Nonstop.
          </p>
        </div>
        <div className={s.numbers}>
          <div>
            <span className={s.bigPlain}>{launches.data ? passing.length : '–'}</span>
            <div className={s.numLabel}>launches passing every gate right now</div>
          </div>
          <div>
            <span className={s.bigPlain}>{launches.data ? feed.length : '–'}</span>
            <div className={s.numLabel}>live launches on Montra</div>
          </div>
        </div>
      </header>

      <section className={s.body}>
        <div className={s.main}>
          <div className={s.block}>
            <h2 className={s.h2}>What it sees right now</h2>
            <p>The same feed the agent reads every minute, largest first. A launch is bought the minute all four boxes are ticked and the sell rehearsal passes.</p>
            <div className={t.feed}>
              <div className={`${t.frow} ${t.fhead}`}>
                <span className="label">Launch</span>
                <span className="label">Cap</span>
                <span className="label">Holders</span>
                <span className="label">Volume</span>
                <span className="label">Age</span>
              </div>
              {watch.map((l) => {
                const g = gates(l, now)
                const cell = (ok: boolean, text: string) => <span className={ok ? t.ok : t.no}>{text}</span>
                return (
                  <div key={l.address} className={t.frow}>
                    <span className={t.fname}>
                      {l.imageUrl ? <img src={l.imageUrl} alt="" className={t.fimg} /> : <span className={t.fimg} />}
                      <span>
                        ${l.symbol}
                        <span className={t.fsub}>{l.graduation?.stage === 'graduating' ? 'graduating' : 'new'}</span>
                      </span>
                    </span>
                    {cell(g.mcap, fmtUsd(l.marketCapUsd ?? 0))}
                    {cell(g.holders, String(l.holders ?? 0))}
                    {cell(g.volume, fmtUsd(l.volume24hUsd ?? 0))}
                    {cell(g.age, g.ageMin >= 1440 ? `${Math.floor(g.ageMin / 1440)}d ${Math.round((g.ageMin % 1440) / 60)}h` : g.ageMin >= 90 ? `${(g.ageMin / 60).toFixed(1)}h` : `${Math.round(g.ageMin)} min`)}
                  </div>
                )
              })}
              {launches.isLoading && <div className={s.muted}>Reading Montra.</div>}
            </div>
          </div>

          <Trades wallet={SNIPER_SHADOW_WALLET} title="Tokens sniped · Orphic's own wallet" />

          <div className={s.block}>
            <h2 className={s.h2}>Before you run it</h2>
            <ul className={s.list}>
              <li>This is a bet on brand-new tokens. Most launches go to zero; the gates skip the obvious traps, not the ordinary losers.</li>
              <li>Every trade pays the token's own fee, 1% to 5% each way, so a round trip starts a few percent behind.</li>
              <li>Real HYPE only. Circuit's paper mode cannot simulate these pools, so there is no practice run; start small.</li>
            </ul>
          </div>
        </div>

        <aside className={s.side}>
          <a href={circuitAgentUrl(SNIPER_AGENT_ID)} target="_blank" rel="noreferrer" className={s.primary}>
            Run it on Circuit
          </a>
          <p className={s.fine}>
            Needs HYPE on Elysium. Minimum 0.1 HYPE; each snipe is a fifth of what you allot. For now this one starts on Circuit's own page: sessions started from Orphic cannot yet send the raw transactions these launch pools need. Circuit is on it.
          </p>
          <dl className={s.facts}>
            <div>
              <dt>Checks</dt>
              <dd>every minute</dd>
            </div>
            <div>
              <dt>Buys at</dt>
              <dd>$25k cap · 50 holders · $5k volume</dd>
            </div>
            <div>
              <dt>Skips</dt>
              <dd>under 30 min old, failed sell rehearsal</dd>
            </div>
            <div>
              <dt>Exits</dt>
              <dd>+30% or -70%, on a real sell quote</dd>
            </div>
            <div>
              <dt>Slots</dt>
              <dd>5 × 20%</dd>
            </div>
            <div>
              <dt>Venue</dt>
              <dd>Montra on Elysium</dd>
            </div>
          </dl>
          <a href={circuitAgentUrl(SNIPER_AGENT_ID)} target="_blank" rel="noreferrer" className={s.fine} style={{ textDecoration: 'underline' }}>
            Code and decision log on Circuit
          </a>
        </aside>
      </section>
    </div>
  )
}
