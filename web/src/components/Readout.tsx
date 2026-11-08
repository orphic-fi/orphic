import { useBlockNumber } from 'wagmi'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'
import { hyperEvm } from '../chains'
import { DEPLOYED, addresses } from '../config/addresses'
import { DEMO, DEMO_LOADED_AT_MS, demoFixture, demoScenario } from '../config/demo'
import { useMorphoVaultV2 } from '../lib/morpho'
import { fmtClockUtc } from '../lib/schedule'
import s from './Readout.module.css'

const blockFmt = new Intl.NumberFormat('en-US')

export default function Readout() {
  const block = useBlockNumber({ chainId: hyperEvm.id, query: { refetchInterval: 30_000, retry: 1 } })
  const morpho = useMorphoVaultV2(DEPLOYED ? addresses.hyperEvm.senior : addresses.hyperEvm.referenceVault)

  const blockValue = DEMO ? demoFixture(demoScenario()).block : block.data
  const blockShown = useAnimatedNumber(blockValue !== undefined ? Number(blockValue) : null)
  const rpcOk = DEMO || (!block.isError && blockValue !== undefined)
  const apiOk = !morpho.isError && morpho.data !== undefined
  const readAt = Math.max(DEMO ? DEMO_LOADED_AT_MS : block.dataUpdatedAt || 0, morpho.dataUpdatedAt || 0) || undefined

  return (
    <p className={s.line} aria-live="polite">
      <span className={rpcOk ? '' : s.bad}>hyperevm {hyperEvm.id} {rpcOk ? 'ok' : 'rpc unreachable'}</span>
      <span className={s.sep}>·</span>
      <span>block {blockShown !== null ? blockFmt.format(Math.round(blockShown)) : block.isLoading ? 'loading' : 'n/a'}</span>
      <span className={s.sep}>·</span>
      <span className={apiOk || morpho.isLoading ? '' : s.bad}>morpho api {apiOk ? (morpho.data?.unlisted ? 'not indexing this vault yet' : 'ok') : morpho.isLoading ? 'loading' : 'unreachable'}</span>
      <span className={s.sep}>·</span>
      <span>read {fmtClockUtc(readAt)} UTC</span>
    </p>
  )
}
