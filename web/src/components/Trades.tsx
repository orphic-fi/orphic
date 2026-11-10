import type { Address } from 'viem'
import { ELYSIUM_EXPLORER, hypeFmt, useLedger, type Position } from '../lib/elysiumLedger'
import { fmtUsd } from '../lib/format'
import s from './Trades.module.css'

/**
 * Every launch token a wallet bought on Elysium, with what each one cost, returned or would return right now.
 * Read from the chain: transfers, transaction values and balance changes, and a real sell simulated for open ones.
 */
export default function Trades({ wallet, title = 'Tokens sniped' }: { wallet: Address; title?: string }) {
  const q = useLedger(wallet)
  const now = q.dataUpdatedAt || 0
  const L = q.data
  const usd = (wei: bigint) => (L?.hypeUsd ? fmtUsd((Number(wei) / 1e18) * L.hypeUsd, 2) : null)
  const pnlOf = (p: Position) => (p.pnlWei === null ? null : Number(p.pnlWei) / Number(p.spent || 1n))

  return (
    <section className={s.wrap}>
      <div className={s.head}>
        <div>
          <div className="label">{title}</div>
          <div className={s.sub}>
            Read from the Elysium chain for{' '}
            <a href={`${ELYSIUM_EXPLORER}/address/${wallet}`} target="_blank" rel="noreferrer" className={s.mono}>
              {wallet.slice(0, 6)}…{wallet.slice(-4)}
            </a>
            . Open positions are marked by a real sell simulated from this wallet, fees included.
          </div>
        </div>
        {L && L.positions.length > 0 && (
          <div className={s.totals}>
            <div>
              <div className={`${s.totalV} ${L.totalPnl > 0n ? s.up : L.totalPnl < 0n ? s.down : ''}`}>
                {L.totalPnl >= 0n ? '+' : '-'}
                {hypeFmt(L.totalPnl < 0n ? -L.totalPnl : L.totalPnl)} HYPE
              </div>
              <div className={s.totalL}>
                {usd(L.totalPnl < 0n ? -L.totalPnl : L.totalPnl) ? `${L.totalPnl < 0n ? '-' : '+'}${usd(L.totalPnl < 0n ? -L.totalPnl : L.totalPnl)} · ` : ''}
                {L.totalSpent > 0n ? `${((Number(L.totalPnl) / Number(L.totalSpent)) * 100).toFixed(1)}% on ${hypeFmt(L.totalSpent, 2)} HYPE deployed` : 'nothing deployed yet'}
              </div>
            </div>
            <div>
              <div className={s.totalV}>
                {L.wins}
                <span className={s.muted}> / </span>
                {L.losses}
              </div>
              <div className={s.totalL}>won / lost, closed trades</div>
            </div>
            <div>
              <div className={s.totalV}>{L.positions.filter((p) => !p.closedAt).length}</div>
              <div className={s.totalL}>open now</div>
            </div>
          </div>
        )}
      </div>

      {q.isLoading && <div className={s.muted}>Reading the chain.</div>}
      {q.isError && <div className={s.muted}>Could not read Elysium right now.</div>}
      {L && L.positions.length === 0 && <div className={s.empty}>No snipes yet. The agent buys only when a launch clears every gate; the log on Circuit says what it is waiting on.</div>}

      <div className={s.list}>
        {L?.positions.map((p) => {
          const pnl = pnlOf(p)
          const open = !p.closedAt
          const outWei = open ? p.markWei : p.received
          return (
            <article key={p.token} className={s.card}>
              <div className={s.ident}>
                {p.meta?.imageUrl ? <img src={p.meta.imageUrl} alt="" className={s.img} /> : <span className={s.imgBlank} />}
                <div className={s.names}>
                  <div className={s.sym}>
                    ${p.meta?.symbol ?? `${p.token.slice(0, 6)}…`}
                    <span className={`${s.pill} ${open ? s.pillOpen : s.pillClosed}`}>{open ? 'open' : 'sold'}</span>
                  </div>
                  <div className={s.nm}>
                    {p.meta?.name ?? 'Unknown token'}
                    {p.meta?.marketCapUsd ? ` · ${fmtUsd(p.meta.marketCapUsd)} cap now` : ''}
                    {p.meta?.holders ? ` · ${p.meta.holders.toLocaleString()} holders` : ''}
                  </div>
                </div>
              </div>
              <div className={s.nums}>
                <div>
                  <div className={s.k}>In</div>
                  <div className={s.v}>{hypeFmt(p.spent)} HYPE</div>
                  <div className={s.k2}>{usd(p.spent) ?? ''}</div>
                </div>
                <div>
                  <div className={s.k}>{open ? 'Worth now' : 'Out'}</div>
                  <div className={s.v}>{outWei === null ? 'n/a' : `${hypeFmt(outWei)} HYPE`}</div>
                  <div className={s.k2}>{outWei !== null ? (usd(outWei) ?? '') : 'sell quote refused'}</div>
                </div>
                <div>
                  <div className={s.k}>P&L</div>
                  <div className={`${s.v} ${s.pnl} ${pnl === null ? '' : pnl > 0 ? s.up : pnl < 0 ? s.down : ''}`}>{pnl === null ? 'n/a' : `${pnl > 0 ? '+' : ''}${(pnl * 100).toFixed(1)}%`}</div>
                  <div className={s.k2}>{p.pnlWei === null ? '' : `${p.pnlWei >= 0n ? '+' : '-'}${hypeFmt(p.pnlWei < 0n ? -p.pnlWei : p.pnlWei)} HYPE`}</div>
                </div>
              </div>
              <div className={s.foot}>
                <span>
                  Bought {new Date(p.openedAt).toUTCString().slice(5, 22)} UTC
                  {p.closedAt ? ` · sold ${new Date(p.closedAt).toUTCString().slice(5, 22)} UTC` : ` · held ${Math.max(1, Math.round((now - p.openedAt) / 60_000))} min`}
                  {p.trades.length > 2 ? ` · ${p.trades.length} transactions` : ''}
                </span>
                <span className={s.links}>
                  <a href={`https://montramarkets.xyz/token/${p.token}`} target="_blank" rel="noreferrer">
                    Montra
                  </a>
                  <a href={`${ELYSIUM_EXPLORER}/tx/${p.trades.at(-1)!.hash}`} target="_blank" rel="noreferrer">
                    Last tx
                  </a>
                </span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
