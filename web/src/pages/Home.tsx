import { Link } from 'react-router-dom'
import { useVault } from '../hooks/useVault'
import { fmtUsd } from '../lib/format'
import { settleAtOrAfter } from '../lib/schedule'
import s from './Home.module.css'

const AGENTS = [
  { n: '01', name: 'Rotator', body: 'Reads every Morpho market on HyperEVM each hour and moves USDC toward the best rate, net of gas and slippage. Holds when a move is not worth it.' },
  { n: '02', name: 'Ranger', body: 'Runs a single, capped liquidity position on the USDC/HYPE pool. No leverage, no borrowing, sized by realised fees.' },
  { n: '03', name: 'Basis', body: 'Hedged funding capture on Hyperliquid perps: earns the funding spread while price exposure stays flat.' },
]

function nextSettle(lastSettle: number | undefined) {
  const t = settleAtOrAfter(Math.floor(Date.now() / 1000) + 1, lastSettle)
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(t * 1000))
}

export default function Home() {
  const senior = useVault('senior')
  const junior = useVault('junior')
  const total = senior.tvl !== null && junior.tvl !== null ? senior.tvl + junior.tvl : null
  const capacity = senior.cap !== null && junior.cap !== null ? senior.cap + junior.cap : null
  return (
    <div className={s.home}>
      <section className={`wrap ${s.hero}`}>
        <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className={s.orbits}>
          <path d="M11.2 2.9A6 6 0 1 0 13.1 4.8" stroke="#2a2938" strokeWidth=".35" strokeLinecap="round" />
          <path d="M10.4 4.2A4.3 4.3 0 1 0 11.8 5.6" stroke="#3b3a4c" strokeWidth=".3" strokeLinecap="round" />
          <path d="M9.6 5.6A2.6 2.6 0 1 0 10.5 6.4" stroke="#9ef0d8" strokeWidth=".3" strokeLinecap="round" />
        </svg>
        <div className={s.heroText}>
          <div className={s.kicker}>
            <span className={s.kdot} />
            Live on Elysium · settled on HyperEVM
          </div>
          <h1 className={s.h1}>
            Agentic USDC.
            <br />
            <em>Strategies on autopilot.</em>
          </h1>
          <p className={s.lead}>
            Deposit USDC on Elysium. Agents move it across Morpho's Hyperliquid markets, hour by hour, inside a tranched vault setup. One vault pays first. One vault takes the swing.
          </p>
          <div className={s.ctas}>
            <Link to="/vaults" className={s.cta}>
              Launch app
            </Link>
            <Link to="/how-it-works" className={s.ghost}>
              Read how it works
            </Link>
          </div>
        </div>
        <div className={s.stats}>
          <div>
            <div className={s.k}>Deposited</div>
            <div className={s.stat}>{fmtUsd(total)}</div>
          </div>
          <div>
            <div className={s.k}>Capacity</div>
            <div className={s.stat}>{fmtUsd(capacity)}</div>
          </div>
          <div>
            <div className={s.k}>Markets watched</div>
            <div className={s.stat}>5</div>
          </div>
          <div>
            <div className={s.k}>Next settle</div>
            <div className={s.stat}>{nextSettle(junior.lastSettle)}</div>
          </div>
        </div>
      </section>

      <section className={s.band}>
        <div className={`wrap ${s.split}`}>
          <div className={s.splitText}>
            <div className={s.k}>Agents, not dashboards</div>
            <h2 className={s.h2}>The vault is run by software that signs its own transactions.</h2>
            <p className={s.p}>
              Every agent runs on automation with predefined conditions. The conditions set the tone for yield: which venues it may use, how much it may move, how often. They are enforced by the contract, not by a promise.
            </p>
          </div>
          <div className={s.cards3}>
            {AGENTS.map((a) => (
              <div key={a.n} className={s.card}>
                <div className={s.k}>{a.n}</div>
                <h3 className={s.h3}>{a.name}</h3>
                <p className={s.pSmall}>{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={s.band}>
        <div className="wrap">
          <div className={s.k}>Two ways in</div>
          <div className={s.cards2}>
            <div className={s.card}>
              <div className={s.cardHead}>
                <h3 className={s.h3Big}>Steady</h3>
                <span className={s.k}>Senior · osUSDC</span>
              </div>
              <p className={s.p}>USDC in a Morpho vault we curate. You are paid before anyone else each week and can withdraw into available liquidity whenever you like.</p>
              <Link to="/vaults" className={s.ghost}>
                Deposit to Steady
              </Link>
            </div>
            <div className={`${s.card} ${s.cardAccent}`}>
              <div className={s.cardHead}>
                <h3 className={s.h3Big}>Boosted</h3>
                <span className={s.k}>Junior · ojUSDC</span>
              </div>
              <p className={s.p}>
                Earns on its own capital, collects the fee Steady pays, and is the first to feel a loss. Seven days' notice to exit. Part of your position is staked in $ORPH. Capped at {fmtUsd(junior.cap)} while unaudited.
              </p>
              <Link to="/vaults" className={s.cta}>
                Deposit to Boosted
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={`${s.band} ${s.bandLast}`}>
        <div className={`wrap ${s.split}`}>
          <div className={s.splitText}>
            <div className={s.k}>Why Elysium</div>
            <h2 className={s.h2}>Hyperliquid's liquidity, with a front door built for people.</h2>
            <p className={s.p}>Elysium is the Hyperliquid L2. You deposit there; the vaults settle on HyperEVM, where Morpho's markets and Hyperliquid's own liquidity live. Orphic is the first agentic USDC vault on it.</p>
          </div>
          <div className={s.cards4}>
            {[
              ['Deposit from', 'Elysium'],
              ['Settled on', 'HyperEVM'],
              ['Markets', 'Morpho'],
              ['Stake', '$ORPH'],
            ].map(([k, v]) => (
              <div key={k} className={s.card}>
                <div className={s.k}>{k}</div>
                <div className={s.h3}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
