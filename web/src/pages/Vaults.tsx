import CapRing from '../components/CapRing'
import Readout from '../components/Readout'
import VaultArea from '../components/VaultArea'
import { useVault } from '../hooks/useVault'
import s from './Pages.module.css'

export default function Vaults() {
  const senior = useVault('senior')
  const junior = useVault('junior')
  return (
    <>
      <div className={s.head}>
        <div className={s.headText}>
          <p className={s.notice}>Unaudited. Capped. Owner can pause deposits, never withdrawals. Basis agent not active.</p>
          <Readout />
        </div>
        <CapRing senior={senior.capUsed} junior={junior.capUsed} />
      </div>
      <div className={s.grid}>
        <VaultArea kind="senior" state={senior} />
        <VaultArea kind="junior" state={junior} />
      </div>
    </>
  )
}
