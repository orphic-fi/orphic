/**
 * Orphic's Circuit link, entirely in the user's browser. The permit (a 30-day, revocable credential that lets Orphic
 * start and stop agents on the user's Circuit wallets, never withdraw) is decrypted here with a key generated here and
 * kept in this browser only. Orphic's servers never see it. It is the same trust model as a session token.
 */
import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CircuitError, circuit, link, type Account, type Session } from './circuitClient'

export const APP_ID = 'orphic'
const STORE = 'orphic-circuit-permit'

interface Stored {
  permit: string
  linkedAt: number
}

function readStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORE)
    if (!raw) return null
    const s = JSON.parse(raw) as Stored
    return typeof s.permit === 'string' ? s : null
  } catch {
    return null
  }
}

function writeStored(s: Stored | null) {
  try {
    if (s) localStorage.setItem(STORE, JSON.stringify(s))
    else localStorage.removeItem(STORE)
  } catch {
    /* private mode: the link lasts for this page only */
  }
}

let memory: Stored | null = readStored()
const listeners = new Set<() => void>()
function setPermit(s: Stored | null) {
  memory = s
  writeStored(s)
  listeners.forEach((l) => l())
}

export function usePermit(): string | null {
  const [, tick] = useState(0)
  useEffect(() => {
    const l = () => tick((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return memory?.permit ?? null
}

export type LinkState = { phase: 'idle' } | { phase: 'waiting'; url: string } | { phase: 'linked' } | { phase: 'failed'; message: string }

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
      window.open(url, '_blank', 'noopener')
      setState({ phase: 'waiting', url })
      const p = await pending
      setPermit({ permit: p, linkedAt: Date.now() })
      setState({ phase: 'linked' })
    } catch (err) {
      setState({ phase: 'failed', message: err instanceof Error ? err.message : 'Linking failed' })
    }
  }, [])

  const unlink = useCallback(async () => {
    const p = memory?.permit
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
  if (q.error && q.error.status === 401 && memory) setPermit(null)
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
