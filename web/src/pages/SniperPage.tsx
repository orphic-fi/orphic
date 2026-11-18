import { useState } from 'react'
import { Link } from 'react-router-dom'
import { circuitAgentUrl } from '../lib/circuit'
import { ELYSIUM_EXPLORER, useLedger, type Position } from '../lib/elysiumLedger'
import { fmtUsd } from '../lib/format'
import { LIVE_RUN_STARTED_AT, SNIPER_PRESETS, fmtMin, presetForSpend, type SniperPreset } from '../lib/sniperPresets'
import s from './CircuitAgentPage.module.css'
import t from './SniperPage.module.css'

/** The Orphic Circuit wallet the live runs are on. */
export const SNIPER_SHADOW_WALLET = '0x7ffc5e962696ad5b0412f3908fdc442f70b71252' as const

const hype = (wei: bigint, dp = 3) => `${(Number(wei) / 1e18).toFixed(dp)} HYPE`
const pct = (p: Position) => (p.pnlWei === null || p.spent === 0n ? null : Number(p.pnlWei) / Number(p.spent))
const signed = (r: number) => `${r >= 0 ? '+' : '−'}${Math.abs(r * 100).toFixed(0)}%`
const ago = (ms: number) => (ms < 3_600_000 ? `${Math.max(1, Math.round(ms / 60_000))} min` : ms < 86_400_000 ? `${(ms / 3_600_000).toFixed(1)} h` : `${Math.round(ms / 86_400_000)} d`)

function rules(p: SniperPreset, k: { minMcapUsd: number; takeProfitPct: number; stopLossPct: number }) {
  const exit = p.trailPct > 0 ? `once it is up ${k.takeProfitPct}% it follows the price and sells ${p.trailPct}% below the peak` : `sells at +${k.takeProfitPct}%`
  return `Buys a launch once it is ${fmtMin(p.minAgeMin)} old with ${fmtUsd(k.minMcapUsd)} of market cap, ${p.minHolders} holders and ${fmtUsd(p.minVolumeUsd)} of volume, after a rehearsed sell proves it can be sold. Then it ${exit}, cuts at −${k.stopLossPct}%, and sells whatever is left after ${fmtMin(p.timeStopMin)}. ${p.slots} snipes at a time, each ${Math.round(100 / p.slots)}% of the HYPE.`
}

export default function SniperPage() {
  const [preset, setPreset] = useState<SniperPreset>(SNIPER_PRESETS[0])
  const [knobs, setKnobs] = useState({ minMcapUsd: preset.minMcapUsd, takeProfitPct: preset.takeProfitPct, stopLossPct: preset.stopLossPct })
  const [adjust, setAdjust] = useState(false)
  const ledger = useLedger(SNIPER_SHADOW_WALLET)

  const pick = (p: SniperPreset) => {
    setPreset(p)
    setKnobs({ minMcapUsd: p.minMcapUsd, takeProfitPct: p.takeProfitPct, stopLossPct: p.stopLossPct })
  }
  const custom = knobs.minMcapUsd !== preset.minMcapUsd || knobs.takeProfitPct !== preset.takeProfitPct || knobs.stopLossPct !== preset.stopLossPct

  // Only this run: positions opened since the current sessions started, newest first, each tagged with the preset whose slot size it matches.
  const live = (ledger.data?.positions ?? [])
    .filter((p) => p.openedAt >= LIVE_RUN_STARTED_AT)
    .sort((a, b) => b.openedAt - a.openedAt)
    .map((p) => ({ p, preset: presetForSpend(Number(p.spent) / 1e18 / Math.max(1, p.trades.filter((x) => x.side === 'buy').length)) }))
  const open = live.filter((x) => x.p.held > 0n)
  const totalSlots = SNIPER_PRESETS.reduce((n, p) => n + p.slots, 0)
  const now = ledger.dataUpdatedAt || Date.now()
  const livePnl = live.reduce((n, x) => n + (x.p.pnlWei ?? 0n), 0n)
  const runUrl = circuitAgentUrl(preset.agentId)

  return (
    <div className={`wrap ${s.page}`}>
      <Link to="/agents" className={s.back}>
        ← All agents
      </Link>

      <header className={t.hero}>
        <div className={t.intro}>
          <h1 className={s.h1}>Sniper</h1>
          <p className={s.lede}>Buys new Elysium launches the minute they prove out, and sells on set numbers. Pick how early it gets in.</p>
          <div className={t.chooser} role="tablist" aria-label="Preset">
            {SNIPER_PRESETS.map((p) => (
              <button key={p.slug} type="button" role="tab" aria-selected={p.slug === preset.slug} className={`${t.choice} ${p.slug === preset.slug ? t.choiceOn : ''}`} onClick={() => pick(p)}>
                <span className={t.choiceName}>{p.name}</span>
                <span className={t.choiceBlurb}>{p.blurb}</span>
              </button>
            ))}
          </div>
          <p className={t.rules}>{rules(preset, knobs)}</p>
          <div className={t.cta}>
            <a href={runUrl} target="_blank" rel="noreferrer" className={s.primary}>
              Run {preset.name} on Circuit
            </a>
            <button type="button" className={t.adjustBtn} onClick={() => setAdjust((v) => !v)} aria-expanded={adjust}>
              {adjust ? 'Hide numbers' : 'Change the numbers'}
            </button>
          </div>
          {adjust && (
            <div className={t.adjust}>
              <label>
                <span>Market cap at least</span>
                <span className={t.in}>
                  $<input type="number" min={5000} max={500000} step={1000} value={knobs.minMcapUsd} onChange={(e) => setKnobs({ ...knobs, minMcapUsd: Number(e.target.value) })} />
                </span>
              </label>
              <label>
                <span>{preset.trailPct > 0 ? 'Start trailing at' : 'Take profit at'}</span>
                <span className={t.in}>
                  +<input type="number" min={5} max={1000} step={5} value={knobs.takeProfitPct} onChange={(e) => setKnobs({ ...knobs, takeProfitPct: Number(e.target.value) })} />%
                </span>
              </label>
              <label>
                <span>Cut losses at</span>
                <span className={t.in}>
                  −<input type="number" min={5} max={95} step={5} value={knobs.stopLossPct} onChange={(e) => setKnobs({ ...knobs, stopLossPct: Number(e.target.value) })} />%
                </span>
              </label>
              <p className={s.fine}>
                {custom ? `Type these three on Circuit's start sheet: ${knobs.minMcapUsd}, ${knobs.takeProfitPct}, ${knobs.stopLossPct}. ` : ''}The other rules belong to the preset.
              </p>
            </div>
          )}
        </div>

        <div className={t.board} aria-label="Live slots on Orphic's wallet">
          <div className={t.boardHead}>
            <span className={t.boardCount}>
              {ledger.data ? open.length : '–'}
              <span className={t.boardOf}> of {totalSlots}</span>
            </span>
            <span className={t.boardLabel}>slots in a trade right now, on Orphic's own wallet</span>
          </div>
          {SNIPER_PRESETS.map((p) => {
            const mine = open.filter((x) => x.preset.slug === p.slug)
            return (
              <div key={p.slug} className={t.lane}>
                <span className={t.laneName}>{p.name}</span>
                <div className={t.cells}>
                  {Array.from({ length: p.slots }, (_, i) => {
                    const x = mine[i]
                    if (!x) return <span key={i} className={t.cell} />
                    const r = pct(x.p)
                    return (
                      <span key={i} className={`${t.cell} ${t.cellOn} ${r !== null && r < 0 ? t.cellDown : t.cellUp}`} title={x.p.meta?.name ?? x.p.token}>
                        ${x.p.meta?.symbol ?? '?'}
                        <small>{r === null ? '' : signed(r)}</small>
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </header>

      <section>
        <div className={t.rowHead}>
          <h2 className={s.h2}>Snipes this run</h2>
          {live.length > 0 && <span className={livePnl < 0n ? t.down : t.up}>{`${livePnl < 0n ? '−' : '+'}${hype(livePnl < 0n ? -livePnl : livePnl)}`}</span>}
        </div>
        {ledger.isLoading && <p className={s.muted}>Reading the wallet.</p>}
        {ledger.data && live.length === 0 && <p className={s.muted}>No snipes yet. The three presets are watching every launch and buy the minute one passes their gates.</p>}
        {live.length > 0 && (
          <div className={t.list}>
            {live.map(({ p, preset: pr }) => {
              const r = pct(p)
              const isOpen = p.held > 0n
              return (
                <div key={p.token} className={t.row}>
                  <span className={t.tok}>
                    {p.meta?.imageUrl ? <img src={p.meta.imageUrl} alt="" /> : <i />}
                    <span>
                      ${p.meta?.symbol ?? p.token.slice(0, 6)}
                      <small>{pr.name}</small>
                    </span>
                  </span>
                  <span className={t.num}>
                    {hype(p.spent)}
                    <small>in</small>
                  </span>
                  <span className={t.num}>
                    {isOpen ? (p.markWei === null ? '–' : hype(p.markWei)) : hype(p.received)}
                    <small>{isOpen ? (p.markEstimated ? 'worth now, est.' : 'worth now') : 'out'}</small>
                  </span>
                  <span className={`${t.num} ${r !== null && r < 0 ? t.down : t.up}`}>
                    {r === null ? '–' : signed(r)}
                    <small>{isOpen ? `held ${ago(now - p.openedAt)}` : `sold after ${ago((p.closedAt ?? now) - p.openedAt)}`}</small>
                  </span>
                  <a href={`${ELYSIUM_EXPLORER}/tx/${p.trades[p.trades.length - 1]?.hash}`} target="_blank" rel="noreferrer" className={t.txLink}>
                    tx
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <footer className={t.foot}>
        <p>
          Real $HYPE only, on Elysium. Most launches go to zero; the gates skip the traps, not the ordinary losers. The agent can trade its wallet and never withdraw from it. Stop any time; whatever
          it holds stays in the wallet.
        </p>
        <p>
          <a href={runUrl} target="_blank" rel="noreferrer">
            Code and decision log on Circuit
          </a>
          <Link to={`/agents/wallet/${SNIPER_SHADOW_WALLET}`}>Every trade this wallet ever made</Link>
        </p>
      </footer>
    </div>
  )
}
