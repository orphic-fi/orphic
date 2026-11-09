import { useSearchParams } from 'react-router-dom'
import VaultArea from '../components/VaultArea'
import { useVault } from '../hooks/useVault'
import { fmtUsd } from '../lib/format'
import { settleAtOrAfter } from '../lib/schedule'
import s from './Pages.module.css'

function nextSettleLabel(lastSettle: number | undefined) {
  const now = Math.floor(Date.now() / 1000)
  const t = settleAtOrAfter(now + 1, lastSettle)
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(t * 1000))
}

export default function Vaults() {
  const senior = useVault('senior')
  const junior = useVault('junior')
  // /vaults?senior=withdraw or ?junior=exit opens that card on its exit side (Portfolio links use this).
  const [params] = useSearchParams()
  const seniorMode = params.get('senior') === 'withdraw' ? 'exit' : 'deposit'
  const juniorMode = params.get('junior') === 'exit' ? 'exit' : 'deposit'
  const total = senior.tvl !== null && junior.tvl !== null ? senior.tvl + junior.tvl : null
  return (
    <div className={`wrap ${s.page}`}>
      <section className={s.hero}>
        <h1 className={s.h1}>Agentic USDC vaults built on Morpho and Hyperliquid.</h1>
        <div className={s.kpis}>
          <div>
            <div className="label">Total deposited</div>
            <div className={s.kpi}>{fmtUsd(total)}</div>
          </div>
          <div>
            <div className="label">Next settle</div>
            <div className={s.kpi}>{nextSettleLabel(junior.lastSettle)}</div>
          </div>
          <div>
            <div className="label">Status</div>
            <div className={s.kpi}>Capped · unaudited</div>
          </div>
        </div>
      </section>
      <div className={s.grid}>
        <VaultArea key={`s-${seniorMode}`} kind="senior" state={senior} initialMode={seniorMode} />
        <VaultArea key={`j-${juniorMode}`} kind="junior" state={junior} initialMode={juniorMode} />
      </div>
    </div>
  )
}
