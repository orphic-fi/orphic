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
  'agt_8bcba87d-fc43-49ef-9803-af3ac0d093f6': { slug: 'orphic-neutral', chain: 'Hyperliquid' },
}
export const ROTATOR_AGENT_ID = '3c05032e-3df5-4454-aa3d-b25550f23f0d'
export const NEUTRAL_AGENT_ID = '8bcba87d-fc43-49ef-9803-af3ac0d093f6'

/**
 * Rough grouping of Circuit's catalogue by what an agent does, from its name and description. Circuit publishes no
 * category, so this is a reading aid, not a classification Circuit stands behind.
 */
export type AgentGroup = 'Yield' | 'Neutral' | 'Long' | 'Short' | 'Liquidity' | 'Copy' | 'Farming' | 'Other'
export function groupOf(a: CircuitAgent): AgentGroup {
  const t = `${a.name} ${a.description}`.toLowerCase()
  // Papertrade points farming: high-leverage paired trades whose point is the PAPER emission, not the trade.
  if (/\bpaper\b/.test(t)) return 'Farming'
  if (/liquidity|\blp\b|pool/.test(t)) return 'Liquidity'
  if (/yield|stablecoin|stables|vault|loops|lend/.test(t)) return 'Yield'
  if (/hedged|carry|funding|neutral|delta/.test(t)) return 'Neutral'
  if (/copies|copier|copy|whale|leader|consensus|pelosi|follow/.test(t)) return 'Copy'
  if (/\bshort\b|inverse|fade/.test(t)) return 'Short'
  if (/\blong\b|buys|ride|trend|momentum|breakout|basket|index|dip/.test(t)) return 'Long'
  return 'Other'
}
/** Agents whose venue is outside the Hyperliquid and Elysium world (Robinhood Chain stock tokens and the like). Hidden by default. */
export function offEcosystem(a: CircuitAgent): boolean {
  return /robinhood|stock token|stock tokens|pelosi|wall street|equity|stocks?\b/i.test(`${a.name} ${a.description}`)
}
export const GROUPS: AgentGroup[] = ['Yield', 'Neutral', 'Liquidity', 'Long', 'Short', 'Copy', 'Farming', 'Other']
export const GROUP_BLURB: Record<AgentGroup, string> = {
  Yield: 'Lends or parks stablecoins and stock tokens for rates. No price view.',
  Neutral: 'Hedged books that earn funding or carry. Price moves mostly cancel.',
  Liquidity: 'Provides liquidity in pools for fees. Loses to sharp moves.',
  Long: 'Directional long. Pays in up markets, bleeds in drawdowns.',
  Short: 'Directional short. Pays in drawdowns, bleeds in rallies.',
  Copy: 'Follows other wallets or traders.',
  Farming: 'Paired trades built to farm Papertrade points. Experiments, not strategies.',
  Other: 'Everything else, including private and bespoke agents.',
}

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
