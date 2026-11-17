/**
 * Orphic's Sniper presets. Each one is an upload of the same agent code (agents/orphic-sniper*) with a different
 * PRESET block; the three knobs Circuit exposes per session (cap, take profit, stop) are the ones a user can change
 * on Circuit's run sheet without a new upload. Every number here is a rule the live code enforces, nothing else.
 */
export type SniperPreset = {
  slug: 'proven' | 'early' | 'runner'
  name: string
  agentId: string
  blurb: string
  // buy when
  minMcapUsd: number
  minHolders: number
  minVolumeUsd: number
  minAgeMin: number
  maxFeePct: number
  // sell when
  takeProfitPct: number
  stopLossPct: number
  timeStopMin: number
  trailPct: number // 0 = plain take profit
  slots: number
  /** Which knobs can be changed per session on Circuit without a new upload. */
  perSession: ReadonlyArray<'minMcapUsd' | 'takeProfitPct' | 'stopLossPct'>
}

export const SNIPER_PRESETS: SniperPreset[] = [
  {
    slug: 'proven',
    name: 'Proven',
    agentId: '68d25adc-ca1d-4e34-8d82-a17510e50360',
    blurb: 'Waits for a launch to show a crowd, then takes a quick profit.',
    minMcapUsd: 25_000,
    minHolders: 50,
    minVolumeUsd: 5_000,
    minAgeMin: 30,
    maxFeePct: 5,
    takeProfitPct: 30,
    stopLossPct: 30,
    timeStopMin: 60,
    trailPct: 0,
    slots: 5,
    perSession: ['minMcapUsd', 'takeProfitPct', 'stopLossPct'],
  },
  {
    slug: 'early',
    name: 'Early',
    agentId: '5adcc683-6c0f-4aa7-9dd3-6fdf6dafd1f5',
    blurb: 'Gets in sooner on thinner proof. More losers, bigger winners.',
    minMcapUsd: 10_000,
    minHolders: 30,
    minVolumeUsd: 2_000,
    minAgeMin: 30,
    maxFeePct: 5,
    takeProfitPct: 50,
    stopLossPct: 35,
    timeStopMin: 45,
    trailPct: 0,
    slots: 8,
    perSession: ['minMcapUsd', 'takeProfitPct', 'stopLossPct'],
  },
  {
    slug: 'runner',
    name: 'Runner',
    agentId: '46474367-7fb7-43d4-aebf-c772083b8880',
    blurb: 'Lets winners run with a trailing stop; fewer, longer trades.',
    minMcapUsd: 35_000,
    minHolders: 80,
    minVolumeUsd: 10_000,
    minAgeMin: 60,
    maxFeePct: 5,
    takeProfitPct: 30,
    stopLossPct: 30,
    timeStopMin: 240,
    trailPct: 25,
    slots: 3,
    perSession: ['minMcapUsd', 'takeProfitPct', 'stopLossPct'],
  },
]

/** Launchpads the agent can read. Only one has a router and fee model verified on a fork; the rest are listed so the gap is visible. */
export const LAUNCHPADS: { name: string; verified: boolean; note: string }[] = [
  {
    name: 'Montra',
    verified: true,
    note: 'Uniswap v4 pools against native HYPE, 1% to 5% a side, 99% anti-snipe fee for 30 minutes',
  },
  {
    name: 'Ascend',
    verified: false,
    note: 'router and fee model not yet verified on a fork',
  },
  {
    name: 'Boxa',
    verified: false,
    note: 'router and fee model not yet verified on a fork',
  },
  {
    name: 'ElysPump',
    verified: false,
    note: 'router and fee model not yet verified on a fork',
  },
  {
    name: 'Flux',
    verified: false,
    note: 'router and fee model not yet verified on a fork',
  },
]

export const fmtMin = (m: number) => (m >= 120 ? `${m / 60} h` : `${m} min`)
export const sellRule = (p: Pick<SniperPreset, 'takeProfitPct' | 'stopLossPct' | 'timeStopMin' | 'trailPct'>) =>
  p.trailPct > 0
    ? `up ${p.takeProfitPct}% then trail ${p.trailPct}% from peak · −${p.stopLossPct}% out · ${fmtMin(p.timeStopMin)} time stop`
    : `+${p.takeProfitPct}% out · −${p.stopLossPct}% out · ${fmtMin(p.timeStopMin)} time stop`
