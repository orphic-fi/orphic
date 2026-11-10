/**
 * Orphic's Circuit link, entirely in the user's browser. The permit (a 30-day, revocable credential that lets Orphic
 * start and stop agents on the user's Circuit wallets, never withdraw) is decrypted here with a key generated here and
 * kept in this browser only. Orphic's servers never see it. It is the same trust model as a session token.
 */
import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { CircuitError, circuit, link, type Account, type Session } from './circuitClient'

export const APP_ID = 'orphic'
const STORE = 'orphic-circuit-permits' // { [connected wallet address or "anon"]: Stored }

interface Stored {
  permit: string
  linkedAt: number
}

type Book = Record<string, Stored>

function readBook(): Book {
  try {
    const raw = localStorage.getItem(STORE)
    if (!raw) return {}
    const b = JSON.parse(raw) as Book
    return b && typeof b === 'object' ? b : {}
  } catch {
    return {}
  }
}

function writeBook(b: Book) {
  try {
    localStorage.setItem(STORE, JSON.stringify(b))
  } catch {
    /* private mode: the link lasts for this page only */
  }
}

/**
 * Links follow the wallet connected to the site: switch MetaMask to another account and Orphic treats you as a
 * new user with no Circuit link yet; switch back and the earlier link is there. Not connected: one shared slot.
 */
const book: Book = readBook()
let currentKey = 'anon'
const listeners = new Set<() => void>()
function notify() {
  listeners.forEach((l) => l())
}
function setPermit(s: Stored | null) {
  if (s) book[currentKey] = s
  else delete book[currentKey]
  writeBook(book)
  notify()
}
export function setWalletScope(address: string | undefined) {
  const k = address ? address.toLowerCase() : 'anon'
  if (k !== currentKey) {
    currentKey = k
    notify()
  }
}
function current(): Stored | null {
  return book[currentKey] ?? null
}

export function usePermit(): string | null {
  const [, tick] = useState(0)
  const { address } = useAccount()
  setWalletScope(address)
  useEffect(() => {
    const l = () => tick((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return current()?.permit ?? null
}

export type LinkState = { phase: 'idle' } | { phase: 'waiting'; url: string; via: 'frame' | 'popup' } | { phase: 'linked' } | { phase: 'failed'; message: string }

/** Does Circuit let orphic.fi frame its sign-in? Flipped to true once their headers allow it; the popup is the fallback. */
export const CIRCUIT_FRAME_ALLOWED = false

/** Start the link flow: opens Circuit in a new tab, polls until the user approves with a passkey, stores the permit. */
export function useCircuitLink() {
  const [local, setState] = useState<LinkState>({ phase: 'idle' })
  const permit = usePermit()
  // Linked is derived from the permit itself, so another tab or component linking shows here without an effect.
  const state: LinkState = permit ? { phase: 'linked' } : local

  const begin = useCallback(async () => {
    try {
      const returnUrl = `${window.location.origin}/linked`
      const { url, permit: pending } = await link(APP_ID, undefined, returnUrl)
      // A small window over Orphic rather than a new tab: the passkey has to happen on Circuit's own page (passkeys
      // are bound to the site that made them), but the user never loses this page. The popup closes itself from /linked.
      let popup: Window | null = null
      if (CIRCUIT_FRAME_ALLOWED) {
        // In-page: the sheet renders an iframe of Circuit's page with passkeys delegated to it.
        setState({ phase: 'waiting', url, via: 'frame' })
      } else {
        const w = Math.min(520, window.screen.availWidth)
        const h = Math.min(760, window.screen.availHeight)
        const left = Math.max(0, (window.screen.availWidth - w) / 2)
        const top = Math.max(0, (window.screen.availHeight - h) / 2)
        popup = window.open(url, 'orphic-circuit-link', `popup=yes,width=${w},height=${h},left=${left},top=${top}`)
        setState({ phase: 'waiting', url, via: 'popup' })
      }
      const p = await pending
      setPermit({ permit: p, linkedAt: Date.now() })
      setState({ phase: 'linked' })
      try {
        popup?.close()
      } catch {
        /* already closed by /linked */
      }
    } catch (err) {
      setState({ phase: 'failed', message: err instanceof Error ? err.message : 'Linking failed' })
    }
  }, [])

  const unlink = useCallback(async () => {
    const p = current()?.permit
    setPermit(null)
    setState({ phase: 'idle' })
    if (p) {
      try {
        await circuit(p).unlink()
      } catch {
        /* already expired or revoked on Circuit's side */
      }
    }
  }, [])

  return { state, begin, unlink }
}

/** The user's Circuit account through our permit: wallets, holdings, running sessions. */
export function useCircuitAccount() {
  const permit = usePermit()
  const q = useQuery<Account, CircuitError>({
    queryKey: ['circuit-account', permit],
    queryFn: () => circuit(permit).account(),
    enabled: !!permit,
    staleTime: 20_000,
    refetchInterval: 60_000,
    retry: (count, err) => err.status !== 401 && count < 2,
  })
  // A 401 means the permit expired or was revoked on Circuit: forget it so the page offers to link again.
  if (q.error && q.error.status === 401 && current()) setPermit(null)
  return q
}

export function useCircuitActions() {
  const permit = usePermit()
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: ['circuit-account'] })
  return {
    /** Paper: wallet null. Live: a wallet id from the account. amount in the agent's starting asset units (USDC for most). */
    start: async (agent: string, wallet: string | null, amount: string): Promise<Session> => {
      if (!permit) throw new CircuitError(401, 'Link Circuit first')
      const s = await circuit(permit).start({ agent, wallet, amount })
      await refresh()
      return s
    },
    stop: async (session: string): Promise<Session> => {
      if (!permit) throw new CircuitError(401, 'Link Circuit first')
      const s = await circuit(permit).stop(session)
      await refresh()
      return s
    },
  }
}

/** Days until the permit's 30 days run out, from the account read; null when unknown. */
export function permitDaysLeft(a: Account | undefined): number | null {
  if (!a) return null
  const ms = new Date(a.permit_expires_at).getTime() - Date.now()
  return Math.max(0, Math.floor(ms / 86_400_000))
}
