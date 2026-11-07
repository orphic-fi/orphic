import VaultArea from '../components/VaultArea'
import s from './Pages.module.css'

export default function Vaults() {
  return (
    <>
      <p className={s.notice}>Unaudited. Capped. Owner can pause deposits, never withdrawals. Basis agent not active.</p>
      <div className={s.grid}>
        <VaultArea kind="senior" />
        <VaultArea kind="junior" />
      </div>
    </>
  )
}
