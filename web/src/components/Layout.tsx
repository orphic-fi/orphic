import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { chainLabel, hyperEvm } from '../chains'
import { DEMO, DEMO_ACCOUNT } from '../config/demo'
import { useTheme } from '../hooks/useTheme'
import { truncateAddress } from '../lib/format'
import Readout from './Readout'
import s from './Layout.module.css'

export function Mark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M11.2 2.9A6 6 0 1 0 13.1 4.8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

function NetworkPill() {
  const { chainId, isConnected } = useAccount()
  const id = DEMO ? hyperEvm.id : chainId
  const label = isConnected || DEMO ? chainLabel(id) : 'Elysium'
  const live = DEMO || (isConnected && label !== 'Unsupported chain')
  return (
    <span className={s.pill} title={live ? 'Connected network' : 'Not connected'}>
      <span className={`${s.dot} ${live ? s.dotLive : ''}`} />
      {label}
    </span>
  )
}

function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  if (DEMO) {
    return (
      <button type="button" className={s.wallet} disabled>
        {truncateAddress(DEMO_ACCOUNT)}
      </button>
    )
  }
  if (isConnected && address) {
    return (
      <button type="button" className={s.wallet} onClick={() => disconnect()} title="Disconnect">
        {truncateAddress(address)}
      </button>
    )
  }
  const injected = connectors[0]
  return (
    <button type="button" className={`${s.wallet} ${s.walletCta}`} disabled={!injected || isPending} onClick={() => injected && connect({ connector: injected })}>
      {isPending ? 'Connecting' : 'Connect'}
    </button>
  )
}

function ThemeToggle() {
  const [theme, toggle] = useTheme()
  return (
    <button type="button" className={s.theme} onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.25" />
          <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  const home = pathname === '/'
  return (
    <div className={`${s.shell} ${home ? s.shellHome : ''}`}>
      <header className={s.header}>
        <div className={`wrap ${s.top}`}>
          <div className={s.left}>
            <Link to="/" className={s.wordmark}>
              <Mark />
              <span>orphic</span>
            </Link>
            <nav className={s.nav} aria-label="Primary">
              <NavLink to="/vaults">Vaults</NavLink>
              <NavLink to="/portfolio">Portfolio</NavLink>
              <NavLink to="/agents">Agents</NavLink>
              <NavLink to="/docs">Docs</NavLink>
            </nav>
          </div>
          <div className={s.right}>
            <NetworkPill />
            {home ? (
              <Link to="/vaults" className={`${s.wallet} ${s.walletCta}`}>
                Launch app
              </Link>
            ) : (
              <ConnectButton />
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className={s.main}>
        <Outlet />
      </main>
      <footer className={s.footer}>
        <div className={`wrap ${s.footerRow}`}>
          <Readout />
          <div className={s.footerLinks}>
            <Link to="/ops">status</Link>
            <a href="https://hyperevmscan.io" target="_blank" rel="noreferrer">
              explorer
            </a>
            <a href="https://x.com/orphicfi" target="_blank" rel="noreferrer">
              @orphicfi
            </a>
            <span className={s.footerNote}>Unaudited. Deposits capped. Rates are estimates, never promises.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
