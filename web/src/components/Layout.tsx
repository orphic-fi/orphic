import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { chainLabel } from '../chains'
import { DEMO, DEMO_ACCOUNT } from '../config/demo'
import { hyperEvm } from '../chains'
import { truncateAddress } from '../lib/format'
import s from './Layout.module.css'

function ConnectButton() {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const supported = chainId !== undefined && chainLabel(chainId) !== 'Unsupported chain'

  if (DEMO) {
    return (
      <>
        <span className={`${s.chain} ${s.chainLive}`}>{chainLabel(hyperEvm.id)}</span>
        <button type="button" className={s.connect} disabled>
          {truncateAddress(DEMO_ACCOUNT)}
        </button>
      </>
    )
  }

  if (isConnected && address) {
    return (
      <>
        <span className={`${s.chain} ${supported ? s.chainLive : ''}`}>{chainLabel(chainId)}</span>
        <button type="button" className={s.connect} onClick={() => disconnect()} title="Disconnect">
          {truncateAddress(address)}
        </button>
      </>
    )
  }
  const injected = connectors[0]
  return (
    <>
      <span className={s.chain}>{chainLabel(undefined)}</span>
      <button
        type="button"
        className={s.connect}
        disabled={!injected || isPending}
        onClick={() => injected && connect({ connector: injected })}
      >
        {isPending ? 'Connecting' : 'Connect'}
      </button>
    </>
  )
}

export default function Layout() {
  return (
    <>
      <header className="wrap">
        <div className={s.top}>
          <Link to="/" className={s.wordmark}>
            <svg className={s.mark} viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M11.2 2.9A6 6 0 1 0 13.1 4.8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
            <span>orphic</span>
          </Link>
          <nav className={s.nav} aria-label="Primary">
            <NavLink to="/" end>
              Vaults
            </NavLink>
            <NavLink to="/how-it-works">How it works</NavLink>
            <NavLink to="/agents">Agents</NavLink>
          </nav>
          <div className={s.right}>
            <ConnectButton />
          </div>
        </div>
      </header>
      <main className={`wrap ${s.main}`}>
        <Outlet />
      </main>
      <footer className="wrap">
        <div className={s.footer}>
          <span>orphic.fi</span>
          <Link to="/ops">status</Link>
          <a href="https://hyperevmscan.io" target="_blank" rel="noreferrer">
            HyperEVM explorer
          </a>
          <span>Unaudited</span>
        </div>
      </footer>
    </>
  )
}
