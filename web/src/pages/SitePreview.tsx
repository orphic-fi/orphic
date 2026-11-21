import { useEffect } from 'react'
import { STRATEGIES, VENUES, type BuilderConfig } from '../lib/builder'
import { fmtPct, fmtUsd } from '../lib/format'
import s from './SitePreview.module.css'

/**
 * The end state: the vault page a builder's depositors would see, generated from the config. Same bones as
 * orphic.fi/vaults (deposit, where the money sits, the rules in plain words) in the builder's brand, on the
 * builder's domain. Every rate shown is read from the venue today and labelled an estimate; nothing is promised,
 * nothing has deposits, and the banner says so.
 */
export default function SitePreview({ c, rates, onClose }: { c: BuilderConfig; rates: Record<string, number | null>; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const name = c.name.trim() || 'Your vault'
  const brand = name.split(' ')[0]
  const domain = c.domain.trim() || 'vaults.yourapp.xyz'
  const isPair = c.template === 'pair'
  const isStrategy = c.template === 'strategy'
  const strategy = STRATEGIES.find((x) => x.id === c.strategy)
  const venuesOn = isStrategy ? [] : c.venues.filter((v) => v.on)
  const capTotal = venuesOn.reduce((a, v) => a + v.capPct, 0)

  // Senior estimate: cap-weighted average of today's venue rates, net of the management fee. Venues without a rate drop out.
  const priced = venuesOn.filter((v) => typeof rates[v.id] === 'number')
  const pricedCaps = priced.reduce((a, v) => a + v.capPct, 0)
  const gross = pricedCaps > 0 ? priced.reduce((a, v) => a + (rates[v.id] as number) * v.capPct, 0) / pricedCaps : null
  const seniorEst = gross === null ? null : Math.max(0, gross - c.mgmtFeePct / 100)
  const strategyRate = isStrategy && strategy ? (c.strategy === 'rotation' ? rates.felix : c.strategy === 'hlp' ? rates.hlp : null) : null

  const style = { '--acc': c.accent } as React.CSSProperties
  const settle = c.settleDays === 7 ? 'weekly' : c.settleDays === 14 ? 'every two weeks' : 'monthly'

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-label="Preview of your vault page" style={style}>
      <div className={s.chrome}>
        <div className={s.dots}>
          <i />
          <i />
          <i />
        </div>
        <div className={s.url}>
          <span className={s.lock} />
          {domain}
        </div>
        <div className={s.chromeRight}>
          <span className={s.badge}>Preview · nothing is deployed</span>
          <button type="button" className={s.close} onClick={onClose}>
            Back to the builder
          </button>
        </div>
      </div>

      <div className={s.site}>
        <header className={s.nav}>
          <div className={s.brand}>
            <span className={s.logo}>{brand.slice(0, 1).toUpperCase()}</span>
            {brand}
          </div>
          <nav className={s.links}>
            <span>Earn</span>
            <span>Portfolio</span>
            <span>Docs</span>
          </nav>
          <span className={s.connect}>Connect wallet</span>
        </header>

        <main className={s.main}>
          <div className={s.hero}>
            <div>
              <div className={s.tags}>
                <span className={s.tagAcc}>{brand} · Earn</span>
                <span className={s.tag}>{isPair ? 'Senior and junior' : isStrategy ? 'Strategy vault' : 'Senior only'}</span>
              </div>
              <h1 className={s.h1}>{name}</h1>
              <p className={s.lede}>
                {isPair
                  ? 'Senior is first in line and earns the base rate. Junior backs it, takes the first loss, and earns more for it. An agent moves the book between the lenders on the list.'
                  : isStrategy
                    ? (strategy?.what ?? '')
                    : 'One audited vault. An agent moves the book between the lenders on the list, only when the extra yield beats the gas it costs.'}
              </p>
            </div>
            <div className={s.stats}>
              <div>
                <b>{fmtUsd(0)}</b>
                <small>in the vault</small>
              </div>
              <div>
                <b>0</b>
                <small>wallets</small>
              </div>
            </div>
          </div>

          <div className={`${s.cards} ${isPair ? s.cards3 : s.cards2}`}>
            <section className={`${s.card} ${s.cardSen}`}>
              <div className={s.cardHead}>
                <h2>{isStrategy ? (strategy?.name ?? 'Strategy') : 'Senior'}</h2>
                <small>est. from venues today · net of fees</small>
              </div>
              <div className={s.big}>{isStrategy ? (strategyRate === null ? '–' : fmtPct(strategyRate)) : seniorEst === null ? '–' : fmtPct(seniorEst)}</div>
              <p>
                {isPair
                  ? `Audited Morpho vault. Earns the lending rate across ${venuesOn.length} venue${venuesOn.length === 1 ? '' : 's'}; junior absorbs the first ${c.juniorCoverPct}% of any loss before you do.`
                  : isStrategy
                    ? `${strategy?.venue ?? ''}. Shown as a bet on every page.`
                    : `Audited Morpho vault. Earns the lending rate across ${venuesOn.length} venue${venuesOn.length === 1 ? '' : 's'}. No first-loss layer.`}
              </p>
              <ul>
                <li>{isStrategy ? 'Exit at settle' : 'Instant exit while liquid, else at settle'}</li>
                <li>
                  Cap {fmtUsd(c.seniorCapUsd)}, {fmtUsd(c.walletCapUsd)} per wallet
                </li>
                {isPair && <li>Pays {c.mgmtFeePct}% a year to junior for the cover</li>}
              </ul>
              <span className={s.btnGhost}>Deposit{isPair ? ' to senior' : ''}</span>
            </section>

            {isPair && (
              <section className={`${s.card} ${s.cardJun}`}>
                <div className={s.cardHead}>
                  <h2>Junior</h2>
                  <small>realised since open</small>
                </div>
                <div className={s.big}>–</div>
                <p>Takes the first loss. Earns senior's management fee plus its own yield from the same venues.</p>
                <ul>
                  <li>Exit at settle, {settle}</li>
                  <li>Must stay above {c.juniorCoverPct}% of senior or senior pauses</li>
                  <li>{c.perfFeePct}% of yield as performance fee</li>
                </ul>
                <span className={s.btnGhost}>Deposit to junior</span>
              </section>
            )}

            <section className={`${s.card} ${s.cardDep}`}>
              <div className={s.k}>Deposit</div>
              {isPair && (
                <div className={s.seg}>
                  <span className={s.segOn}>Senior</span>
                  <span>Junior</span>
                </div>
              )}
              <div className={s.field}>
                <span>Amount</span>
                <div className={s.input}>
                  <span>1,000.00</span>
                  <small>USDC · max {fmtUsd(c.walletCapUsd)}</small>
                </div>
              </div>
              <div className={s.row}>
                <span>You get</span>
                <b>1,000.0 shares</b>
              </div>
              <div className={s.row}>
                <span>Price per share</span>
                <b>1.0000 USDC</b>
              </div>
              <div className={s.row}>
                <span>Exit</span>
                <b>{settle}, no fee</b>
              </div>
              <span className={s.btnAcc}>Deposit USDC</span>
              <small className={s.fine}>Deposits land at the next settle; exits the same.</small>
            </section>
          </div>

          <div className={s.lower}>
            <section className={s.panel}>
              <div className={s.panelHead}>
                <h3>Where the money would sit</h3>
                <small>caps you set · rates read from each venue today</small>
              </div>
              <div className={s.bar}>
                {isStrategy
                  ? [<i key="s" style={{ width: '100%', background: 'var(--acc)' }} />]
                  : venuesOn.map((v, i) => (
                      <i key={v.id} style={{ width: `${capTotal ? (v.capPct / capTotal) * 100 : 0}%`, opacity: 1 - i * 0.18, background: 'var(--acc)' }} />
                    ))}
              </div>
              <table className={s.table}>
                <tbody>
                  {isStrategy ? (
                    <tr>
                      <td>
                        <b>{strategy?.name}</b>
                        <small>{strategy?.venue}</small>
                      </td>
                      <td>100%</td>
                      <td>{strategyRate === null ? 'fees, no rate' : fmtPct(strategyRate)}</td>
                      <td>{c.strategy === 'hlp' ? '4-day exit' : 'at settle'}</td>
                    </tr>
                  ) : (
                    venuesOn.map((v) => {
                      const meta = VENUES.find((x) => x.id === v.id)
                      const r = rates[v.id]
                      return (
                        <tr key={v.id}>
                          <td>
                            <b>{meta?.name.split(',')[0]}</b>
                            <small>
                              {meta?.chain} · cap {v.capPct}%
                            </small>
                          </td>
                          <td>up to {v.capPct}%</td>
                          <td>{typeof r === 'number' ? fmtPct(r) : meta?.soon ? 'coming' : '–'}</td>
                          <td>{meta?.slow ? 'slow' : v.id === 'morpho' ? 'when liquid' : 'instant'}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </section>

            <section className={s.panel}>
              <div className={s.panelHead}>
                <h3>The rules, in plain words</h3>
              </div>
              <div className={s.rules}>
                <div>
                  <span>Agent</span>
                  <b>{c.agent === 'own' ? 'Your own agent' : c.agent === 'rotator-ranger' ? 'Rotator plus Ranger' : 'Rotator'}</b>
                </div>
                <div>
                  <span>Moves when</span>
                  <b>a week of extra yield beats gas {c.gasMultiple}×</b>
                </div>
                <div>
                  <span>Settles</span>
                  <b>{settle}</b>
                </div>
                {isPair && (
                  <div>
                    <span>Junior cover</span>
                    <b>{c.juniorCoverPct}% of senior</b>
                  </div>
                )}
                <div>
                  <span>Fees</span>
                  <b>
                    {c.mgmtFeePct}% a year · {c.perfFeePct}% of yield
                  </b>
                </div>
                <div>
                  <span>Owner</span>
                  <b>{c.ownerSafe ? `${c.ownerSafe.slice(0, 6)}…${c.ownerSafe.slice(-4)} (Safe)` : 'Your Safe'}</b>
                </div>
                <div>
                  <span>Kill switch</span>
                  <b>pause on a {c.pauseLossPct}% weekly loss</b>
                </div>
              </div>
            </section>
          </div>

          <footer className={s.foot}>
            <p>{c.disclosure}</p>
            <span>Powered by Orphic · ledger · contracts</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
