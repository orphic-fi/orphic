import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { JUNIOR_SYMBOL, SENIOR_SYMBOL } from '../config/addresses'
import { useSession } from '../hooks/useSession'
import { ORPH_DECIMALS, SHARE_DECIMALS, USDC_DECIMALS, useVault } from '../hooks/useVault'
import { NA, fmtNum, fmtUnits, fmtUsd } from '../lib/format'
import { fmtDateUtc } from '../lib/schedule'
import s from './Portfolio.module.css'

interface Totals {
  seniorDeposited: string
  seniorWithdrawn: string
  juniorDeposited: string
  juniorExited: string
  juniorStaked: string
  firstDeposit: number | null
  lastActivity: number | null
}
interface Positions {
  updatedAt: number
  throughBlock: string
  accounts: Record<string, Totals>
}

async function fetchPositions(): Promise<Positions> {
  const r = await fetch('/data/positions.json', { cache: 'no-store' })
  if (!r.ok) throw new Error(`positions ${r.status}`)
  return (await r.json()) as Positions
}

const usd = (v: bigint | undefined) => (v === undefined ? null : Number(v) / 10 ** USDC_DECIMALS)

export default function Portfolio() {
  const { address, isConnected } = useSession()
  const senior = useVault('senior')
  const junior = useVault('junior')
  const positions = useQuery({ queryKey: ['positions'], queryFn: fetchPositions, staleTime: 60_000, refetchInterval: 5 * 60_000 })
  const mine = address ? positions.data?.accounts[address.toLowerCase()] : undefined

  // Principal = deposits minus what has been taken out, from the hourly event index. Value = live share balance at today's price.
  const seniorPrincipal = mine ? (BigInt(mine.seniorDeposited) - BigInt(mine.seniorWithdrawn)) : undefined
  const juniorPrincipal = mine ? (BigInt(mine.juniorDeposited) - BigInt(mine.juniorExited)) : undefined
  const seniorValue = senior.balanceAssets
  const juniorValue = junior.balanceAssets
  const exitValue = junior.exit && junior.pricePerShare !== undefined ? (junior.exit.shares * junior.pricePerShare) / 10n ** 18n / 10n ** BigInt(SHARE_DECIMALS - USDC_DECIMALS) : 0n
  const juniorValueAll = juniorValue !== undefined ? juniorValue + exitValue : undefined
  const seniorEarned = seniorPrincipal !== undefined && seniorValue !== undefined ? seniorValue - seniorPrincipal : undefined
  const juniorEarned = juniorPrincipal !== undefined && juniorValueAll !== undefined ? juniorValueAll - juniorPrincipal : undefined
  const totalValue = seniorValue !== undefined && juniorValueAll !== undefined ? seniorValue + juniorValueAll : undefined
  const totalPrincipal = seniorPrincipal !== undefined && juniorPrincipal !== undefined ? seniorPrincipal + juniorPrincipal : undefined
  const totalEarned = totalValue !== undefined && totalPrincipal !== undefined ? totalValue - totalPrincipal : undefined
  const indexStale = positions.data ? Date.now() / 1000 - positions.data.updatedAt > 3 * 3600 : false
  const noHistory = isConnected && positions.data && !mine

  const signed = (v: bigint | undefined) => {
    if (v === undefined) return NA
    const n = Number(v) / 10 ** USDC_DECIMALS
    return `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtUsd(Math.abs(n), 2)}`
  }

  return (
    <div className={`wrap ${s.page}`}>
      <section className={s.hero}>
        <div>
          <div className="label">Portfolio</div>
          <h1 className={s.h1}>{isConnected ? 'Your positions' : 'Connect a wallet to see your positions'}</h1>
        </div>
        <div className={s.kpis}>
          <div>
            <div className="label">Current value</div>
            <div className={s.kpi}>{isConnected ? fmtUsd(usd(totalValue), 2) : NA}</div>
          </div>
          <div>
            <div className="label">Principal</div>
            <div className={s.kpi}>{isConnected ? fmtUsd(usd(totalPrincipal), 2) : NA}</div>
          </div>
          <div>
            <div className="label">Earned</div>
            <div className={`${s.kpi} ${totalEarned !== undefined && totalEarned < 0n ? s.neg : totalEarned && totalEarned > 0n ? s.pos : ''}`}>{isConnected ? signed(totalEarned) : NA}</div>
          </div>
        </div>
      </section>

      {noHistory && <div className={s.note}>No deposits from this wallet yet. The index updates every hour; a deposit made in the last hour shows under value first and under principal after the next index run.</div>}
      {positions.isError && <div className={s.note}>Position history is unavailable right now, so principal and earned cannot be computed. Current values below are live from chain.</div>}
      {indexStale && !positions.isError && <div className={s.note}>Position history was last indexed {fmtNum((Date.now() / 1000 - positions.data!.updatedAt) / 3600, 0)} hours ago; principal may lag recent deposits.</div>}

      <section className={s.grid}>
        <article className={s.card}>
          <header className={s.cardHead}>
            <div>
              <h2 className={s.h2}>Senior</h2>
              <div className="label" style={{ marginTop: 8 }}>
                {SENIOR_SYMBOL} · paid first
              </div>
            </div>
            <div className={s.value}>{isConnected ? fmtUsd(usd(seniorValue), 2) : NA}</div>
          </header>
          <dl className={s.rows}>
            <Row k="Shares" v={isConnected && senior.balanceShares !== undefined ? `${fmtUnits(senior.balanceShares, SHARE_DECIMALS)} ${SENIOR_SYMBOL}` : NA} />
            <Row k="Principal" v={isConnected ? fmtUsd(usd(seniorPrincipal), 2) : NA} />
            <Row k="Earned" v={isConnected ? signed(seniorEarned) : NA} tone={seniorEarned} />
            <Row k="Deposited in total" v={mine ? fmtUsd(Number(mine.seniorDeposited) / 1e6, 2) : NA} />
            <Row k="Withdrawn in total" v={mine ? fmtUsd(Number(mine.seniorWithdrawn) / 1e6, 2) : NA} />
            <Row k="Available now" v={isConnected && senior.maxWithdraw !== undefined ? fmtUsd(usd(senior.maxWithdraw), 2) : NA} />
          </dl>
          <div className={s.actions}>
            <Link to="/vaults" className={s.btn}>
              Deposit
            </Link>
            <Link to="/vaults" className={s.ghost}>
              Withdraw
            </Link>
          </div>
        </article>

        <article className={s.card}>
          <header className={s.cardHead}>
            <div>
              <h2 className={s.h2}>Junior</h2>
              <div className="label" style={{ marginTop: 8 }}>
                {JUNIOR_SYMBOL} · first loss
              </div>
            </div>
            <div className={s.value}>{isConnected ? fmtUsd(usd(juniorValueAll), 2) : NA}</div>
          </header>
          <dl className={s.rows}>
            <Row k="Shares" v={isConnected && junior.balanceShares !== undefined ? `${fmtUnits(junior.balanceShares, SHARE_DECIMALS)} ${JUNIOR_SYMBOL}` : NA} />
            <Row k="Price per share" v={junior.pricePerShare !== undefined ? `${fmtNum(Number(junior.pricePerShare) / 1e18, 2)} USDC` : NA} />
            <Row k="Principal" v={isConnected ? fmtUsd(usd(juniorPrincipal), 2) : NA} />
            <Row k="Earned" v={isConnected ? signed(juniorEarned) : NA} tone={juniorEarned} />
            <Row k="Exit queued" v={junior.exit ? `${fmtUnits(junior.exit.shares, SHARE_DECIMALS)} · ready ${fmtDateUtc(junior.exit.readyAt)}` : 'None'} />
            <Row k="ORPH staked" v={mine ? `${fmtUnits(BigInt(mine.juniorStaked), ORPH_DECIMALS, 0)} ORPH` : NA} />
          </dl>
          <div className={s.actions}>
            <Link to="/vaults" className={s.btn}>
              Deposit
            </Link>
            <Link to="/vaults" className={s.ghost}>
              Request exit
            </Link>
          </div>
        </article>
      </section>

      <section className={s.foot}>
        <div>
          <div className="label">How earned is computed</div>
          <p>Earned is today's value of your shares minus your principal, where principal is every deposit minus every withdrawal or claimed exit, read from the vaults' own events. It includes unrealised gains and losses and moves with the share price.</p>
        </div>
        <div>
          <div className="label">Freshness</div>
          <p>
            Values are live from HyperEVM. Principal comes from an hourly index{positions.data ? `, last run ${new Date(positions.data.updatedAt * 1000).toUTCString().slice(17, 22)} UTC through block ${Number(positions.data.throughBlock).toLocaleString('en-US')}` : ''}.
          </p>
        </div>
        <div>
          <div className="label">First deposit</div>
          <p>{mine?.firstDeposit ? new Date(mine.firstDeposit * 1000).toUTCString().slice(5, 16) : 'n/a'}</p>
        </div>
      </section>
    </div>
  )
}

function Row({ k, v, tone }: { k: string; v: string; tone?: bigint }) {
  return (
    <div className={s.row}>
      <dt>{k}</dt>
      <dd className={tone !== undefined ? (tone < 0n ? s.neg : tone > 0n ? s.pos : '') : ''}>{v}</dd>
    </div>
  )
}
