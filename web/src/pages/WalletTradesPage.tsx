import { Link, Navigate, useParams } from 'react-router-dom'
import { isAddress, type Address } from 'viem'
import Trades from '../components/Trades'
import s from './CircuitAgentPage.module.css'

/** One agent wallet's trades on Elysium, straight from the chain. Linked from My agents for every live session. */
export default function WalletTradesPage() {
  const { address } = useParams()
  if (!address || !isAddress(address)) return <Navigate to="/agents" replace />
  return (
    <div className={`wrap ${s.page}`}>
      <Link to="/agents" className={s.back}>
        ← All agents
      </Link>
      <header className={s.head}>
        <div className={s.titleBlock}>
          <div className={s.kicker}>
            <span>Agent wallet</span>
            <span className={s.dot} />
            <span>Elysium</span>
          </div>
          <h1 className={s.h1}>Trades</h1>
          <p className={s.lede}>Everything this agent wallet bought and sold on Elysium, with the cost and the result of each one. Read from the chain, not from a report.</p>
        </div>
      </header>
      <Trades wallet={address as Address} />
    </div>
  )
}
