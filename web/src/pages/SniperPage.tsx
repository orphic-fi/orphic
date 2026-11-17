import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Trades from '../components/Trades'
import { circuitAgentUrl } from '../lib/circuit'
import { useLaunches, useLedger, type Launch } from '../lib/elysiumLedger'
import { fmtUsd } from '../lib/format'
import { LAUNCHPADS, SNIPER_PRESETS, fmtMin, sellRule, type SniperPreset } from '../lib/sniperPresets'
import s from './CircuitAgentPage.module.css'
import t from './SniperPage.module.css'

/** The Orphic Circuit wallet the shadow sessions run on. */
export const SNIPER_SHADOW_WALLET = '0x7ffc5e962696ad5b0412f3908fdc442f70b71252' as const

type Knobs = Pick<SniperPreset, 'minMcapUsd' | 'takeProfitPct' | 'stopLossPct'>

function gates(l: Launch, p: SniperPreset, cap: number, now: number) {
  const age = l.launchedAt ? (now - l.launchedAt) / 60_000 : 0
  return {
    mcap: (l.marketCapUsd ?? 0) >= cap,
    holders: (l.holders ?? 0) >= p.minHolders,
    volume: (l.volume24hUsd ?? 0) >= p.minVolumeUsd,
    age: age >= p.minAgeMin,
    fee: (l.totalFeePips ?? 0) <= p.maxFeePct * 10_000,
    ageMin: age,
  }
}

const ageText = (m: number) => (m >= 1440 ? `${Math.floor(m / 1440)}d ${Math.round((m % 1440) / 60)}h` : m >= 90 ? `${(m / 60).toFixed(1)}h` : `${Math.round(m)} min`)

export default function SniperPage() {
  const [preset, setPreset] = useState<SniperPreset>(SNIPER_PRESETS[0])
  const [knobs, setKnobs] = useState<Knobs>({
    minMcapUsd: preset.minMcapUsd,
    takeProfitPct: preset.takeProfitPct,
    stopLossPct: preset.stopLossPct,
  })
  const [load, setLoad] = useState(0.5)
  const launches = useLaunches()
  const ledger = useLedger(SNIPER_SHADOW_WALLET)

  const pick = (p: SniperPreset) => {
    setPreset(p)
    setKnobs({
      minMcapUsd: p.minMcapUsd,
      takeProfitPct: p.takeProfitPct,
      stopLossPct: p.stopLossPct,
    })
  }
  const custom = knobs.minMcapUsd !== preset.minMcapUsd || knobs.takeProfitPct !== preset.takeProfitPct || knobs.stopLossPct !== preset.stopLossPct

  // The feed refetches every minute; its fetch time is the clock the ages are measured against.
  const now = launches.dataUpdatedAt || 0
  const feed = useMemo(() => (launches.data ?? []).filter((l) => l.launchedAt).sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0)), [launches.data])
  const passing = feed.filter((l) => Object.entries(gates(l, preset, knobs.minMcapUsd, now)).every(([k, v]) => k === 'ageMin' || v))
  const today = feed.filter((l) => now - (l.launchedAt ?? 0) < 86_400_000).length
  const hypeUsd = ledger.data?.hypeUsd ?? feed.find((l) => l.quote?.usd)?.quote?.usd ?? null
  const perSnipe = load / preset.slots
  const usd = (h: number) => (hypeUsd ? ` · ${fmtUsd(h * hypeUsd)}` : '')
  const runUrl = circuitAgentUrl(preset.agentId)

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
            <span>Orphic runs it on its own wallet</span>
          </div>
          <h1 className={s.h1}>Sniper</h1>
          <p className={s.lede}>
            Buys new Elysium launches the minute they prove out, and sells on your numbers. Pick a preset or set the triggers yourself. Runs nonstop on $HYPE you load into its wallet.
          </p>
        </div>
        <div className={s.numbers}>
          <div>
            <span className={s.bigPlain}>{launches.data ? today : '–'}</span>
            <div className={s.numLabel}>launches today</div>
          </div>
          <div>
            <span className={s.bigPlain}>{launches.data ? passing.length : '–'}</span>
            <div className={s.numLabel}>pass every {preset.name} gate now</div>
          </div>
        </div>
      </header>

      <section className={s.body}>
        <div className={s.main}>
          <div className={s.block}>
            <h2 className={s.h2}>Orphic's three</h2>
            <div className={t.presets}>
              {SNIPER_PRESETS.map((p) => (
                <button key={p.slug} type="button" className={`${t.preset} ${p.slug === preset.slug ? t.presetOn : ''}`} onClick={() => pick(p)}>
                  <span className={t.presetName}>
                    {p.name}
                    {p.slug === preset.slug && <span className={t.tag}>selected</span>}
                  </span>
                  <span className={t.presetBlurb}>{p.blurb}</span>
                  <span className={t.presetRule}>
                    {fmtUsd(p.minMcapUsd)} cap · {p.minHolders} holders · {fmtUsd(p.minVolumeUsd)} volume · {fmtMin(p.minAgeMin)} old
                  </span>
                  <span className={t.presetRule}>
                    {sellRule(p)} · {p.slots} slots
                  </span>
                </button>
              ))}
            </div>
            <p className={s.muted}>Each preset runs on Orphic's own wallet; its record is below. Change a knob and the run becomes yours.</p>
          </div>

          <div className={t.cols}>
            <div className={s.block}>
              <h2 className={s.h2}>
                Buy when <span className={t.h2sub}>all of these</span>
              </h2>
              <div className={t.knobs}>
                <label className={t.knob}>
                  <span>
                    Market cap at least
                    <small>the launch has to be worth this much</small>
                  </span>
                  <span className={t.val}>
                    $
                    <input
                      type="number"
                      min={5000}
                      max={500000}
                      step={1000}
                      value={knobs.minMcapUsd}
                      onChange={(e) =>
                        setKnobs({
                          ...knobs,
                          minMcapUsd: Number(e.target.value),
                        })
                      }
                    />
                  </span>
                </label>
                <div className={`${t.knob} ${t.fixed}`}>
                  <span>Holders at least</span>
                  <span className={t.val}>{preset.minHolders}</span>
                </div>
                <div className={`${t.knob} ${t.fixed}`}>
                  <span>
                    Volume at least<small>24 hours</small>
                  </span>
                  <span className={t.val}>{fmtUsd(preset.minVolumeUsd)}</span>
                </div>
                <div className={`${t.knob} ${t.fixed}`}>
                  <span>
                    Older than
                    <small>Montra charges up to 99% inside 30 min</small>
                  </span>
                  <span className={t.val}>{fmtMin(preset.minAgeMin)}</span>
                </div>
                <div className={`${t.knob} ${t.fixed}`}>
                  <span>
                    Token fee under<small>each launch sets its own</small>
                  </span>
                  <span className={t.val}>{preset.maxFeePct}%</span>
                </div>
                <div className={`${t.knob} ${t.fixed}`}>
                  <span>
                    Sell rehearsal
                    <small>simulated buy and full sell before any money moves</small>
                  </span>
                  <span className={t.val}>always on</span>
                </div>
              </div>
            </div>

            <div className={s.block}>
              <h2 className={s.h2}>
                Sell when <span className={t.h2sub}>any one hits</span>
              </h2>
              <div className={t.knobs}>
                <label className={t.knob}>
                  <span>{preset.trailPct > 0 ? 'Arm the trail at' : 'Take profit'}</span>
                  <span className={t.val}>
                    +
                    <input
                      type="number"
                      min={5}
                      max={1000}
                      step={5}
                      value={knobs.takeProfitPct}
                      onChange={(e) =>
                        setKnobs({
                          ...knobs,
                          takeProfitPct: Number(e.target.value),
                        })
                      }
                    />
                    %
                  </span>
                </label>
                {preset.trailPct > 0 && (
                  <div className={`${t.knob} ${t.fixed}`}>
                    <span>
                      Trail
                      <small>sell this far below the peak, once armed</small>
                    </span>
                    <span className={t.val}>{preset.trailPct}%</span>
                  </div>
                )}
                <label className={t.knob}>
                  <span>Stop loss</span>
                  <span className={t.val}>
                    −
                    <input
                      type="number"
                      min={5}
                      max={95}
                      step={5}
                      value={knobs.stopLossPct}
                      onChange={(e) =>
                        setKnobs({
                          ...knobs,
                          stopLossPct: Number(e.target.value),
                        })
                      }
                    />
                    %
                  </span>
                </label>
                <div className={`${t.knob} ${t.fixed}`}>
                  <span>
                    Time stop<small>sell whatever it is after</small>
                  </span>
                  <span className={t.val}>{fmtMin(preset.timeStopMin)}</span>
                </div>
                <div className={`${t.knob} ${t.fixed}`}>
                  <span>
                    Snipes per book
                    <small>each gets an equal share of the $HYPE</small>
                  </span>
                  <span className={t.val}>
                    {preset.slots} · {Math.round(100 / preset.slots)}% each
                  </span>
                </div>
              </div>
              <p className={s.muted}>
                Cap, take profit and stop are set per run on Circuit's sheet. The greyed rules are the preset's own; a different number there is a new preset, which Orphic ships on request.
              </p>
            </div>
          </div>

          <div className={s.block}>
            <h2 className={s.h2}>What it sees right now</h2>
            <p>The same Montra feed the agent reads every minute, largest first, scored against {preset.name}. A launch is bought the minute every box is ticked and the sell rehearsal passes.</p>
            <div className={t.feed}>
              <div className={`${t.frow} ${t.fhead}`}>
                <span className="label">Launch</span>
                <span className="label">Cap</span>
                <span className="label">Holders</span>
                <span className="label">Volume</span>
                <span className="label">Age</span>
              </div>
              {feed.slice(0, 6).map((l) => {
                const g = gates(l, preset, knobs.minMcapUsd, now)
                const cell = (ok: boolean, text: string) => <span className={ok ? t.ok : t.no}>{text}</span>
                return (
                  <div key={l.address} className={t.frow}>
                    <span className={t.fname}>
                      {l.imageUrl ? <img src={l.imageUrl} alt="" className={t.fimg} /> : <span className={t.fimg} />}
                      <span>
                        ${l.symbol}
                        <span className={t.fsub}>
                          {l.graduation?.stage === 'graduating' ? 'graduating' : 'new'}
                          {!g.fee ? ' · fee over cap' : ''}
                        </span>
                      </span>
                    </span>
                    {cell(g.mcap, fmtUsd(l.marketCapUsd ?? 0))}
                    {cell(g.holders, String(l.holders ?? 0))}
                    {cell(g.volume, fmtUsd(l.volume24hUsd ?? 0))}
                    {cell(g.age, ageText(g.ageMin))}
                  </div>
                )
              })}
              {launches.isLoading && <div className={s.muted}>Reading Montra.</div>}
            </div>
          </div>

          <div className={s.block}>
            <h2 className={s.h2}>Watch these launchpads</h2>
            <ul className={t.pads}>
              {LAUNCHPADS.map((p) => (
                <li key={p.name} className={p.verified ? '' : t.padOff}>
                  <span className={t.padName}>{p.name}</span>
                  <span className={t.padNote}>{p.verified ? (launches.data ? `${today} today · ${p.note}` : p.note) : p.note}</span>
                </li>
              ))}
            </ul>
            <p className={s.muted}>
              A launchpad is traded only once its router and fee model are verified on a fork. Copycat pools outside launchpads are never traded: that is where the honeypots live.
            </p>
          </div>

          <div className={s.block}>
            <h2 className={s.h2}>Why v2 changed the exits</h2>
            <p>
              v1 sold at +30% and −70%. On the first 15 live snipes (10 to 11 Nov) it won 6 and lost 9, net −31% of the HYPE cycled, and every one of the three largest wins was sold within 3 minutes
              of entry while the losers bled for an hour. At +30/−70 the agent needs 7 wins in 10; launches here give about 4. A −30% stop and a time stop keep the fast wins and cut the slow bleeds.
              v2 runs on Orphic's wallet first; the ledger above is the whole record, read from the chain.
            </p>
          </div>
          <Trades wallet={SNIPER_SHADOW_WALLET} title="Orphic's own wallet · every preset" />
        </div>

        <aside className={s.side}>
          <div className={t.loadBox}>
            <label className={t.knob}>
              <span>Load into the agent wallet</span>
              <span className={t.val}>
                <input type="number" min={0.1} step={0.1} value={load} onChange={(e) => setLoad(Number(e.target.value))} /> HYPE
              </span>
            </label>
            <dl className={s.facts}>
              <div>
                <dt>Per snipe</dt>
                <dd>
                  {perSnipe.toFixed(3)} HYPE{usd(perSnipe)}
                </dd>
              </div>
              <div>
                <dt>Orphic fee</dt>
                <dd>none yet · 0.5% per trade planned</dd>
              </div>
              <div>
                <dt>Venue fee</dt>
                <dd>1% to 5% a side, set by each launch</dd>
              </div>
              <div>
                <dt>Your run</dt>
                <dd>
                  {fmtUsd(knobs.minMcapUsd)} cap · +{knobs.takeProfitPct}% · −{knobs.stopLossPct}%{custom ? ' · custom' : ''}
                </dd>
              </div>
            </dl>
          </div>
          <a href={runUrl} target="_blank" rel="noreferrer" className={s.primary}>
            Run {preset.name} on Circuit
          </a>
          <p className={s.fine}>
            Opens the {preset.name} agent on Circuit. Pick "Your EVM Wallet" with HYPE on Elysium (minimum 0.1), allot {load} HYPE
            {custom ? `, and set cap ${fmtUsd(knobs.minMcapUsd)}, take profit ${knobs.takeProfitPct} and stop ${knobs.stopLossPct} on the sheet` : ''}. Starts on Circuit's page for now: sessions
            started from Orphic cannot yet send the raw transactions these pools need.
          </p>
          <p className={s.fine}>
            Real $HYPE only; there is no practice mode for these pools. The agent trades its wallet and can never withdraw from it. Stop any time; open positions stay in the wallet. Most launches go
            to zero: the gates skip traps, not losers.
          </p>
          <a href={runUrl} target="_blank" rel="noreferrer" className={s.fine} style={{ textDecoration: 'underline' }}>
            Code and decision log on Circuit
          </a>
          <Link to={`/agents/wallet/${SNIPER_SHADOW_WALLET}`} className={s.fine} style={{ textDecoration: 'underline' }}>
            All trades on Orphic's wallet
          </Link>
        </aside>
      </section>
    </div>
  )
}
