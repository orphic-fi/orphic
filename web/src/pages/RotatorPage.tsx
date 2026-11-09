import { Link } from 'react-router-dom'
import { Mark } from '../components/Layout'
import { addresses } from '../config/addresses'
import { ROTATOR_AGENT_ID, circuitAgentUrl, useRotator } from '../lib/circuit'
import { fmtPct, fmtUsd } from '../lib/format'
import s from './AgentPage.module.css'

/** Orphic's own agent. Everything here comes from the keeper's hourly report (web/public/data/rotator.json). */
export default function RotatorPage() {
  const rotator = useRotator()
  const r = rotator.data
  const ran = r ? new Date(r.runAt) : null
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
                <h1 className={s.h1}>Orphic Rotator</h1>
                <div className={s.tags}>
                  <span className={s.tag}>Orphic</span>
                  <span className={s.tag}>Elysium agent</span>
                  <span className={s.tag}>Acts on HyperEVM</span>
                  <span className={s.tag}>Hourly</span>
                </div>
              </div>
            </div>
            <div className={s.roiBlock}>
              <div className={s.roi}>{r?.bookApy != null ? fmtPct(r.bookApy) : 'n/a'}</div>
              <div className="label">book rate now · estimate from venue rates</div>
            </div>
          </div>

          <p className={s.long}>
            The Rotator runs both Orphic vaults. Every hour it reads the vaults and Morpho market rates, proposes where senior's USDC should sit across the curator's allowlisted venues, and moves only when the projected gain clears gas by three times. It keeps junior's spare USDC earning in Felix, pulls it back before each weekly settle, settles junior, and accrues senior's interest daily so junior's fee shares are minted. It can only touch the vault contracts, which cap every action.
          </p>

          <div className={s.chart}>
            <div className={s.chartHead}>
              <span className="label">Senior allocation now</span>
              <span className="label">{ran ? `report ${ran.toUTCString().slice(5, 22)} UTC` : ''}</span>
            </div>
            {r && r.allocation.length ? (
              <dl className={s.rows} style={{ margin: 0 }}>
                {r.allocation.map((a) => (
                  <div key={a.label} className={s.row}>
                    <dt>{a.label}</dt>
                    <dd>
                      {fmtPct(a.share)} · {fmtPct(a.rate)} rate
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className={s.chartEmpty}>
                <span>{rotator.isError ? 'The hourly report is unavailable right now.' : 'Waiting for the hourly report.'}</span>
              </div>
            )}
          </div>

          <div className={s.tiles}>
            {[
              ['Vault it runs', r?.vaultUsd != null ? fmtUsd(r.vaultUsd) : 'n/a'],
              ['Last decision', r ? (r.decision.move ? 'Rebalance' : 'Hold') : 'n/a'],
              ['Junior idle', r?.juniorIdle ? r.juniorIdle.action : 'n/a'],
              ['Alerts', r ? String(r.alerts.length) : 'n/a'],
            ].map(([k, v]) => (
              <div key={k} className={s.tile}>
                <div className="label">{k}</div>
                <div className={s.tileV} style={{ textTransform: 'capitalize' }}>
                  {v}
                </div>
              </div>
            ))}
          </div>

          {r && (
            <div>
              <div className={s.tradesHead}>
                <span className="label">Last run, step by step</span>
                <span className="label">{ran ? ran.toUTCString().slice(17, 22) + ' UTC' : ''}</span>
              </div>
              <dl className={s.rows}>
                <div className={s.row}>
                  <dt>Senior</dt>
                  <dd>{r.decision.reason}</dd>
                </div>
                {r.juniorIdle && (
                  <div className={s.row}>
                    <dt>Junior idle</dt>
                    <dd>{r.juniorIdle.note}</dd>
                  </div>
                )}
                {r.juniorAccrue && (
                  <div className={s.row}>
                    <dt>Daily accrue</dt>
                    <dd>{r.juniorAccrue.note}</dd>
                  </div>
                )}
                {r.juniorSync && (
                  <div className={s.row}>
                    <dt>Cover baseline</dt>
                    <dd>{r.juniorSync.note}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        <aside className={s.panel}>
          <div className={s.panelHead}>
            <div>
              <h2 className={s.h2}>Where it runs</h2>
              <div className="label" style={{ marginTop: 8 }}>
                Circuit engine · GitHub watchdog
              </div>
            </div>
          </div>
          <div className={s.form}>
            <a href={circuitAgentUrl(ROTATOR_AGENT_ID)} target="_blank" rel="noreferrer" className={s.primary} style={{ textAlign: 'center', textDecoration: 'none' }}>
              View on Circuit
            </a>
            <p className={s.fine}>
              You do not subscribe to the Rotator: depositing into either vault is what puts it to work for you. Its decisions are public, its code is in the open repo, and a second clock on GitHub checks every hour that it did its job and steps in with the permissionless calls if it did not.
            </p>
          </div>
          <dl className={s.rows}>
            {[
              ['Senior vault', `${addresses.hyperEvm.senior.slice(0, 6)}…${addresses.hyperEvm.senior.slice(-4)}`],
              ['Junior vault', `${addresses.hyperEvm.junior.slice(0, 6)}…${addresses.hyperEvm.junior.slice(-4)}`],
              ['Can do', 'Allocate within caps, junior venues, settle'],
              ['Cannot do', 'Withdraw, transfer, approve elsewhere'],
              ['Code', 'github.com/orphic-fi/orphic'],
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
