import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AgentIcon } from './Agents'
import s from './LaunchAgent.module.css'

const TRIGGERS = ['RSI (4h)', '20-day high', 'Funding (8h)', 'Open interest 1h change', 'Distance from daily VWAP']

export default function LaunchAgent() {
  const [f, setF] = useState({
    market: 'HYPE perp',
    type: 'Reversion',
    trigger: TRIGGERS[0],
    cmp: 'below',
    level: '30',
    dir: 'Long',
    lev: '4x',
    size: '100% of allotment',
    tp: '+30%',
    sl: '−50%',
    name: '',
    symbol: '',
    desc: '',
    site: '',
    x: '',
    seed: '25,000',
    price: '500',
    fee: '10% of profit',
  })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })
  const name = f.name || 'Your agent'
  const symbol = (f.symbol || 'TOKEN').toUpperCase()
  const ruleText = `${f.trigger} ${f.cmp} ${f.level}: ${f.dir.toLowerCase()} ${f.lev} with ${f.size}, take profit ${f.tp}, stop ${f.sl}.`

  return (
    <div className={`wrap ${s.page}`}>
      <Link to="/agents" className={s.back}>
        ← All agents
      </Link>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Launch an agent</h1>
          <p className={s.lead}>Write the rule, name the agent, seed its token with $ORPH. The agent runs your rule for every subscriber inside limits the contract enforces, and you earn a share of its profit.</p>
        </div>
        <div className={s.steps}>
          <span className={`${s.pill} ${s.pillOn}`}>1 Strategy</span>
          <span className={s.pill}>2 Identity</span>
          <span className={s.pill}>3 Token</span>
          <span className={s.pill}>4 Review</span>
        </div>
      </div>

      <section className={s.split}>
        <form className={s.form} onSubmit={(e) => e.preventDefault()}>
          <div className={s.card}>
            <div className={s.step}>
              <span className={s.num}>1</span>
              <div>
                <h2 className={s.h2}>Strategy</h2>
                <div className="label" style={{ marginTop: 8 }}>
                  What it trades and when
                </div>
              </div>
            </div>
            <div className={s.row}>
              <label>
                <span className="label">Market</span>
                <select className={s.sel} value={f.market} onChange={set('market')}>
                  {['HYPE perp', 'BTC perp', 'ETH perp', 'USDC/HYPE pool'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">Type</span>
                <select className={s.sel} value={f.type} onChange={set('type')}>
                  {['Reversion', 'Momentum', 'Yield', 'Event'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className={s.block}>
              <span className="label">Entry rule</span>
              <div className={s.rule3}>
                <select className={s.sel} value={f.trigger} onChange={set('trigger')}>
                  {TRIGGERS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <select className={s.sel} value={f.cmp} onChange={set('cmp')}>
                  <option>below</option>
                  <option>above</option>
                </select>
                <input className={s.in} value={f.level} onChange={set('level')} aria-label="Level" />
              </div>
            </div>
            <div className={s.row}>
              <div className={s.block}>
                <span className="label">Direction and leverage</span>
                <div className={s.row}>
                  <select className={s.sel} value={f.dir} onChange={set('dir')}>
                    <option>Long</option>
                    <option>Short</option>
                  </select>
                  <select className={s.sel} value={f.lev} onChange={set('lev')}>
                    {['1x', '2x', '3x', '4x', '5x'].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label>
                <span className="label">Position size</span>
                <select className={s.sel} value={f.size} onChange={set('size')}>
                  {['100% of allotment', '50% of allotment', '25% of allotment'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className={s.row}>
              <label>
                <span className="label">Take profit</span>
                <input className={s.in} value={f.tp} onChange={set('tp')} />
              </label>
              <label>
                <span className="label">Stop loss</span>
                <input className={s.in} value={f.sl} onChange={set('sl')} />
              </label>
            </div>
            <p className={s.fine}>Rules are compiled to a fixed onchain policy. Once launched, parameters cannot be changed; launch a new version instead so subscribers always know what they hold.</p>
          </div>

          <div className={s.card}>
            <div className={s.step}>
              <span className={s.num}>2</span>
              <div>
                <h2 className={s.h2}>Identity</h2>
                <div className="label" style={{ marginTop: 8 }}>
                  Name, symbol, one line
                </div>
              </div>
            </div>
            <div className={s.row}>
              <label>
                <span className="label">Agent name</span>
                <input className={s.in} placeholder="Rozi" value={f.name} onChange={set('name')} />
              </label>
              <label>
                <span className="label">Token symbol</span>
                <input className={s.in} placeholder="ROZI" value={f.symbol} onChange={set('symbol')} maxLength={6} />
              </label>
            </div>
            <label>
              <span className="label">One-line description</span>
              <input className={s.in} placeholder="Waits for 4h RSI under 30, then goes 4x long." value={f.desc} onChange={set('desc')} />
            </label>
            <div className={s.row}>
              <label>
                <span className="label">Website</span>
                <input className={s.in} type="url" placeholder="https://" value={f.site} onChange={set('site')} />
              </label>
              <label>
                <span className="label">X account</span>
                <input className={s.in} placeholder="@handle" value={f.x} onChange={set('x')} />
              </label>
            </div>
            <p className={s.fine}>Both show on the agent's page. The X account is verified with a signed post before it appears.</p>
          </div>

          <div className={s.card}>
            <div className={s.step}>
              <span className={s.num}>3</span>
              <div>
                <h2 className={s.h2}>Token</h2>
                <div className="label" style={{ marginTop: 8 }}>
                  Seeded with $ORPH, traded against $ORPH
                </div>
              </div>
            </div>
            <div className={s.row}>
              <label>
                <span className="label">Seed liquidity ($ORPH)</span>
                <input className={s.in} value={f.seed} onChange={set('seed')} />
              </label>
              <label>
                <span className="label">Subscription price ($ORPH per subscriber)</span>
                <input className={s.in} value={f.price} onChange={set('price')} />
              </label>
            </div>
            <div className={s.row}>
              <label>
                <span className="label">Agent fee</span>
                <select className={s.sel} value={f.fee} onChange={set('fee')}>
                  {['10% of profit', '15% of profit', '20% of profit'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">Creator share of fee</span>
                <select className={s.sel} defaultValue="70% creator · 30% $ORPH stakers">
                  <option>70% creator · 30% $ORPH stakers</option>
                </select>
              </label>
            </div>
            <p className={s.fine}>1,000,000 tokens, fixed. Half goes to the pool against your seed $ORPH, the rest vests to you over 12 months. Subscribers' $ORPH is swapped into your token while they are subscribed, so demand for the agent is demand for $ORPH.</p>
          </div>
        </form>

        <aside className={`${s.card} ${s.preview}`}>
          <div className="label">Preview</div>
          <div className={s.previewCard}>
            <div className={s.pTop}>
              <span className={s.orb}>
                <AgentIcon d="M2 11 6 5l3 5 2-3 3 4" />
              </span>
              <span className="label">{f.type}</span>
            </div>
            <div>
              <div className={s.pName}>{name}</div>
              <div className="label" style={{ marginTop: 8 }}>
                {f.trigger.split(' ')[0]} agent · ${symbol}
              </div>
            </div>
            <p className={s.pRule}>{f.desc || ruleText}</p>
            <div className={s.params}>
              {[
                ['Trigger', `${f.trigger.split(' ')[0]} ${f.cmp === 'below' ? '<' : '>'} ${f.level}`],
                ['Lev', f.lev],
                ['TP', f.tp],
                ['SL', f.sl],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className={s.pk}>{k}</div>
                  <div className={s.pv}>{v}</div>
                </div>
              ))}
            </div>
            <div className={s.pFoot}>
              <span className="label">from {f.price} $ORPH</span>
              <span className={s.pBtn}>Subscribe</span>
            </div>
          </div>
          <dl className={s.rows}>
            {[
              ['Launch fee', '2,000 $ORPH · burned'],
              ['Seed', `${f.seed} $ORPH → pool`],
              ['Your $ORPH balance', 'n/a'],
              ['Review', 'Rules checked by the policy compiler'],
            ].map(([k, v]) => (
              <div key={k} className={s.drow}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <button type="button" className={s.primary} disabled>
            Opens with the $ORPH launch
          </button>
          <p className={s.fine}>Launching deploys the token, the pool and the agent policy in one transaction on HyperEVM. Your agent appears in the marketplace with no history; ROI shows after 30 days of live fills.</p>
        </aside>
      </section>
    </div>
  )
}
