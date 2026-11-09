/**
 * Circuit partner API, the part that works without a user permit: the public agent catalogue. Orphic is a registered
 * partner app (app id "orphic"); linking users and starting agents from here needs the server-side permit flow and
 * comes with the $ORPH launch. Until then "Run on Circuit" opens the agent on Circuit itself.
 */
import { useQuery } from '@tanstack/react-query'

export const CIRCUIT_API = 'https://api.circuit.org/partner/v0.1'
export const CIRCUIT_APP = 'https://app.circuit.org'

/** Orphic's own agents on Circuit, pinned and labelled. */
export const ORPHIC_AGENT_IDS: Record<string, { slug: string; chain: string }> = {
  'agt_3c05032e-3df5-4454-aa3d-b25550f23f0d': { slug: 'orphic-rotator', chain: 'Elysium' },
}
export const ROTATOR_AGENT_ID = '3c05032e-3df5-4454-aa3d-b25550f23f0d'

export interface CircuitAgent {
  id: string // agt_...
  name: string
  description: string
  official: boolean
  yours: boolean
  return_percent: string | null // 30-day, as Circuit reports it
  paper: boolean
  people: number
}

async function fetchAgents(): Promise<CircuitAgent[]> {
  const r = await fetch(`${CIRCUIT_API}/agents`, { headers: { accept: 'application/json' } })
  if (!r.ok) throw new Error(`circuit agents ${r.status}`)
  const j = (await r.json()) as { agents: CircuitAgent[] }
  return j.agents
}

export function useCircuitAgents() {
  return useQuery({ queryKey: ['circuit-agents'], queryFn: fetchAgents, staleTime: 5 * 60_000, refetchInterval: 10 * 60_000 })
}

export function circuitAgentUrl(id: string): string {
  return `${CIRCUIT_APP}/agents/${id.replace(/^agt_/, '')}`
}

/** Strip the "agt_" prefix for routes. */
export function shortId(id: string): string {
  return id.replace(/^agt_/, '')
}

export interface RotatorPublic {
  runAt: string
  mode: string
  vaultUsd: number | null
  bookApy: number | null
  decision: { move: boolean; reason: string; actions: number; movedAmount: number }
  juniorIdle?: { action: string; note: string; idleUsdc?: number; felixUsdc?: number }
  juniorAccrue?: { called: boolean; note: string }
  juniorSync?: { called: boolean; note: string }
  alerts: string[]
  allocation: { label: string; share: number; rate: number }[]
}

async function fetchRotator(): Promise<RotatorPublic> {
  const r = await fetch('/data/rotator.json', { cache: 'no-store' })
  if (!r.ok) throw new Error(`rotator ${r.status}`)
  return (await r.json()) as RotatorPublic
}

export function useRotator() {
  return useQuery({ queryKey: ['rotator-public'], queryFn: fetchRotator, staleTime: 60_000, refetchInterval: 5 * 60_000 })
}
