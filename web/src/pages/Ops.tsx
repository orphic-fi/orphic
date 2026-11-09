import { useReadContracts } from 'wagmi'
import { juniorAbi } from '../abi/junior'
import { DEPLOYED, ZERO, addresses, ops } from '../config/addresses'
import { elysium, hyperEvm } from '../chains'
import { USDC_DECIMALS } from '../hooks/useVault'
import { NA, fmtNum, fmtTime, fmtUnits } from '../lib/format'
import s from './Pages.module.css'

const junior = addresses.hyperEvm.junior

function Addr({ a }: { a: string }) {
  if (a === ZERO) return <span className={s.muted}>not deployed</span>
  return (
    <a href={`${hyperEvm.blockExplorers.default.url}/address/${a}`} target="_blank" rel="noreferrer">
      {a}
    </a>
  )
}

export default function Ops() {
  const reads = useReadContracts({
    contracts: [
      { address: junior, abi: juniorAbi, functionName: 'pricePerShare', chainId: hyperEvm.id },
      { address: junior, abi: juniorAbi, functionName: 'lastSettle', chainId: hyperEvm.id },
      { address: junior, abi: juniorAbi, functionName: 'reservedAssets', chainId: hyperEvm.id },
      { address: junior, abi: juniorAbi, functionName: 'pendingExitShares', chainId: hyperEvm.id },
      { address: junior, abi: juniorAbi, functionName: 'coverInProgress', chainId: hyperEvm.id },
      { address: junior, abi: juniorAbi, functionName: 'seniorPriceBase', chainId: hyperEvm.id },
      { address: junior, abi: juniorAbi, functionName: 'depositsPaused', chainId: hyperEvm.id },
    ],
    query: { enabled: DEPLOYED, refetchInterval: 30_000 },
  })
  const r = (i: number) => (DEPLOYED ? (reads.data?.[i]?.result as bigint | boolean | undefined) : undefined)
  const big = (i: number) => (typeof r(i) === 'bigint' ? (r(i) as bigint) : undefined)
  const wad = (v: bigint | undefined) => (v === undefined ? NA : fmtNum(Number(v) / 1e18, 2))
  const lastSettle = big(1)
  const paused = typeof r(6) === 'boolean' ? (r(6) as boolean) : ops.paused

  return (
    <div className="wrap" style={{ paddingTop: 32, paddingBottom: 56, flex: 1, width: "100%" }}>
    <>
      <div className={s.pageHead}>
        <h1 className={s.title}>Status</h1>
        <p className={s.lead}>Read from config. Switches to on-chain reads once deployed.</p>
      </div>
      <ul className={s.kv}>
        <li>
          <span>Deployed</span>
          <span>{DEPLOYED ? 'yes' : 'no'}</span>
        </li>
        <li>
          <span>Deposits paused</span>
          <span>{paused ? 'yes' : 'no'}</span>
        </li>
        <li>
          <span>Last settle</span>
          <span>{fmtTime(lastSettle !== undefined ? Number(lastSettle) : ops.lastSettle)}</span>
        </li>
        <li>
          <span>Junior price per share</span>
          <span>{wad(big(0))}</span>
        </li>
        <li>
          <span>Senior price base</span>
          <span>{wad(big(5))}</span>
        </li>
        <li>
          <span>Reserved assets</span>
          <span>{big(2) === undefined ? NA : `${fmtUnits(big(2), USDC_DECIMALS)} USDC`}</span>
        </li>
        <li>
          <span>Pending exit shares</span>
          <span>{wad(big(3))}</span>
        </li>
        <li>
          <span>Cover in progress</span>
          <span>{big(4) === undefined ? NA : `${fmtUnits(big(4), USDC_DECIMALS)} USDC`}</span>
        </li>
        <li>
          <span>Settle schedule</span>
          <span>
            {ops.settleDay} {ops.settleHour}, weekly
          </span>
        </li>
        <li>
          <span>Senior vault</span>
          <span>
            <Addr a={addresses.hyperEvm.senior} />
          </span>
        </li>
        <li>
          <span>Junior vault</span>
          <span>
            <Addr a={addresses.hyperEvm.junior} />
          </span>
        </li>
        <li>
          <span>ORPH</span>
          <span>
            <Addr a={addresses.hyperEvm.orph} />
          </span>
        </li>
        <li>
          <span>USDC (HyperEVM)</span>
          <span>
            <Addr a={addresses.hyperEvm.usdc} />
          </span>
        </li>
        <li>
          <span>USDC (Elysium)</span>
          <span>
            <Addr a={addresses.elysium.usdc} />
          </span>
        </li>
        <li>
          <span>Elysium bridge entry</span>
          <span>
            <Addr a={addresses.elysium.bridgeEntry} />
          </span>
        </li>
        <li>
          <span>Reference vault</span>
          <span>
            <Addr a={addresses.hyperEvm.referenceVault} /> <span className={s.muted}>({addresses.hyperEvm.referenceLabel})</span>
          </span>
        </li>
        <li>
          <span>HyperEVM</span>
          <span>
            chain {hyperEvm.id}, {hyperEvm.rpcUrls.default.http[0]}
          </span>
        </li>
        <li>
          <span>Elysium</span>
          <span>
            chain {elysium.id} (unverified), {elysium.rpcUrls.default.http[0] || `rpc ${NA}`}
          </span>
        </li>
      </ul>
    </>
    </div>
  )
}
