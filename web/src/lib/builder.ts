/**
 * Builder config: what a team fills in to get its own vault pair. Phase one: the config is reviewed by Orphic, deployed
 * from it with the same scripts and signer page Orphic uses for its own pair, and ownership is handed to the team's Safe.
 * Phase two swaps the manual deploy for a factory call. The shape stays the same so configs written now still work.
 */
export type Template = 'pair' | 'senior' | 'strategy'
export type AgentChoice = 'rotator' | 'rotator-ranger' | 'own'

export interface VenueChoice {
  id: 'felix' | 'hyperlend' | 'morpho' | 'hlp' | 'nest'
  on: boolean
  capPct: number
}

export interface BuilderConfig {
  version: 1
  template: Template
  venues: VenueChoice[]
  agent: AgentChoice
  ownAgentId?: string
  settleDays: 7 | 14 | 30
  gasMultiple: 3 | 5 | 10
  pauseLossPct: 1 | 2 | 5
  juniorCoverPct: number
  mgmtFeePct: number
  perfFeePct: number
  seniorCapUsd: number
  walletCapUsd: number
  name: string
  symbol: string
  accent: string
  domain: string
  disclosure: string
  ownerSafe: string
  contact: string
}

export const VENUES: { id: VenueChoice['id']; name: string; sub: string; chain: string; slow?: boolean; soon?: boolean }[] = [
  { id: 'felix', name: 'Felix USDC', sub: 'Morpho vault, audited, instant exit', chain: 'HyperEVM' },
  { id: 'hyperlend', name: 'HyperLend USDC', sub: 'Lending pool, instant exit when liquid', chain: 'HyperEVM' },
  { id: 'morpho', name: 'Morpho markets, kHYPE and UBTC collateral', sub: 'Direct supply, exit depends on utilisation', chain: 'HyperEVM' },
  { id: 'hlp', name: 'HLP', sub: 'Hypercore vault, 4-day exit, counted as slow', chain: 'Hypercore', slow: true, soon: true },
  { id: 'nest', name: 'Nest HYPE/USDC range', sub: "Uniswap v4 with Nest's hook; long the pair, short volatility", chain: 'Elysium', soon: true },
]

export const DEFAULT_CONFIG: BuilderConfig = {
  version: 1,
  template: 'pair',
  venues: [
    { id: 'felix', on: true, capPct: 60 },
    { id: 'hyperlend', on: true, capPct: 40 },
    { id: 'morpho', on: true, capPct: 25 },
    { id: 'hlp', on: false, capPct: 15 },
    { id: 'nest', on: false, capPct: 5 },
  ],
  agent: 'rotator',
  settleDays: 7,
  gasMultiple: 3,
  pauseLossPct: 2,
  juniorCoverPct: 10,
  mgmtFeePct: 1,
  perfFeePct: 10,
  seniorCapUsd: 2_000_000,
  walletCapUsd: 250_000,
  name: '',
  symbol: '',
  accent: '#7c5cff',
  domain: '',
  disclosure: 'Estimates are estimates. Junior takes the first loss. Smart contracts can fail. Nothing here is a promise of yield.',
  ownerSafe: '',
  contact: '',
}

export const STEPS = ['Template', 'Venues and caps', 'Agent and rules', 'Tranches and fees', 'Brand and site', 'Review and request'] as const

const KEY = 'orphic.builder.draft.v1'

export function loadDraft(): BuilderConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_CONFIG
    const parsed = JSON.parse(raw) as Partial<BuilderConfig>
    return { ...DEFAULT_CONFIG, ...parsed, venues: parsed.venues ?? DEFAULT_CONFIG.venues }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveDraft(c: BuilderConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c))
  } catch {
    /* storage can be unavailable; the form still works for the session */
  }
}

/** What is wrong with the config, in the order a reader would fix it. Empty means ready to request. */
export function problems(c: BuilderConfig): string[] {
  const out: string[] = []
  if (!c.venues.some((v) => v.on)) out.push('Switch on at least one venue.')
  if (c.template !== 'strategy' && !c.venues.some((v) => v.on && (v.id === 'felix' || v.id === 'hyperlend'))) out.push('A senior vault needs at least one instant-exit lender (Felix or HyperLend).')
  if (c.template === 'strategy' && c.agent === 'rotator') out.push('A strategy vault needs Ranger or your own agent.')
  if (c.agent === 'own' && !/^[0-9a-f-]{36}$/i.test(c.ownAgentId ?? '')) out.push('Your own agent needs its Circuit agent id.')
  if (c.template === 'pair' && (c.juniorCoverPct < 5 || c.juniorCoverPct > 50)) out.push('Junior cover should be between 5% and 50% of senior.')
  if (!c.name.trim()) out.push('Give the vault a name.')
  if (!/^[A-Za-z0-9]{2,8}$/.test(c.symbol)) out.push('Symbol: 2 to 8 letters or digits.')
  if (!/^0x[0-9a-fA-F]{40}$/.test(c.ownerSafe)) out.push('Owner must be a Safe address on HyperEVM.')
  if (!c.contact.trim()) out.push('A contact for the review (Telegram or email).')
  return out
}

/** Illustration of who gets what at a fixed rate, for the fees step. Not a forecast. */
export function split(c: BuilderConfig, seniorUsd = 1_000_000, rate = 0.05) {
  const gross = seniorUsd * rate
  const mgmt = seniorUsd * (c.mgmtFeePct / 100)
  const perf = (gross - mgmt) * (c.perfFeePct / 100)
  return {
    seniorHolders: gross - mgmt - perf,
    juniorFromFee: mgmt,
    team: perf * 0.7,
    agent: perf * 0.2,
    orphic: perf * 0.1,
  }
}

export function toRequest(c: BuilderConfig) {
  return JSON.stringify({ ...c, requestedAt: new Date().toISOString() }, null, 2)
}
