/**
 * Marketplace agents. Strategy definitions are fixed here until the agent registry contract exists;
 * performance and subscriber counts are read from chain and are empty until an agent has live fills.
 */
export type AgentCategory = 'Reversion' | 'Momentum' | 'Yield' | 'Event'

export interface AgentDef {
  slug: string
  name: string
  role: string
  symbol: string
  category: AgentCategory
  market: string
  rule: string
  longRule: string
  params: { k: string; v: string }[]
  subscription: number // $ORPH per subscriber
  leverage: string
  worstCase: string
  fee: string
  icon: string // inline svg path data
}

export const AGENTS: AgentDef[] = [
  {
    slug: 'rozi',
    name: 'Rozi',
    role: 'RSI agent',
    symbol: 'ROZI',
    category: 'Reversion',
    market: 'HYPE perp',
    rule: 'Waits for 4h RSI on HYPE to drop below 30, opens a 4x long with your allotment, takes profit at +30%, stops at −50%.',
    longRule:
      'Rozi waits. When the 4-hour RSI on HYPE drops under 30, it opens a 4x long with your whole allotment, places a take-profit at +30% and a stop at −50% on the position, then goes back to waiting. One trade at a time, never averaging down.',
    params: [
      { k: 'Trigger', v: 'RSI < 30' },
      { k: 'Lev', v: '4x' },
      { k: 'TP', v: '+30%' },
      { k: 'SL', v: '−50%' },
    ],
    subscription: 500,
    leverage: '4x',
    worstCase: '−50% of allotment per trade',
    fee: '10% of profit',
    icon: 'M2 11 6 5l3 5 2-3 3 4',
  },
  {
    slug: 'breaker',
    name: 'Breaker',
    role: 'Breakout agent',
    symbol: 'BRKR',
    category: 'Momentum',
    market: 'BTC and ETH perps',
    rule: 'Buys a daily close above the 20-day high on BTC or ETH with 3x, trails the stop 8% under the highest close since entry.',
    longRule:
      'Breaker watches the daily close. A close above the 20-day high on BTC or ETH opens a 3x long; the stop trails 8% below the highest close since entry and there is no fixed take-profit, so winners run until the trail is hit.',
    params: [
      { k: 'Trigger', v: '20d high' },
      { k: 'Lev', v: '3x' },
      { k: 'TP', v: 'Trail' },
      { k: 'SL', v: '−8% trail' },
    ],
    subscription: 250,
    leverage: '3x',
    worstCase: '−24% of allotment per trade',
    fee: '10% of profit',
    icon: 'M3 12V4m5 8V7m5 5V2',
  },
  {
    slug: 'vega',
    name: 'Vega',
    role: 'Funding agent',
    symbol: 'VEGA',
    category: 'Yield',
    market: 'HYPE spot and perp',
    rule: 'Holds spot HYPE and shorts the perp 1:1 when 8h funding is above 0.01%, collecting funding while price exposure stays flat. Unwinds when funding turns.',
    longRule:
      'Vega holds spot HYPE and an equal perp short, so price moves cancel out and what is left is the funding paid by longs. It opens when 8-hour funding is above 0.01% and unwinds when funding turns negative.',
    params: [
      { k: 'Trigger', v: 'Fund > .01%' },
      { k: 'Lev', v: '1x hedged' },
      { k: 'TP', v: 'n/a' },
      { k: 'SL', v: 'Fund < 0' },
    ],
    subscription: 1000,
    leverage: '1x, hedged',
    worstCase: 'Basis slippage on unwind',
    fee: '10% of profit',
    icon: 'M2 8h12M8 2v12',
  },
  {
    slug: 'tide',
    name: 'Tide',
    role: 'Range LP agent',
    symbol: 'TIDE',
    category: 'Yield',
    market: 'USDC/HYPE pool',
    rule: 'Provides USDC/HYPE liquidity in a ±12% range on the v4 pool, recenters when price leaves the range for 6 hours. No leverage.',
    longRule:
      'Tide provides USDC/HYPE liquidity in a ±12% band around the current price on the Uniswap v4 pool and recenters the band when price has sat outside it for six hours. No leverage; the risk is impermanent loss on a sharp move.',
    params: [
      { k: 'Trigger', v: 'Out 6h' },
      { k: 'Lev', v: 'None' },
      { k: 'Range', v: '±12%' },
      { k: 'Fee tier', v: '1%' },
    ],
    subscription: 400,
    leverage: 'None',
    worstCase: 'Impermanent loss on a sharp move',
    fee: '10% of fees',
    icon: 'M2 10c2-4 4-4 6 0s4 4 6 0',
  },
  {
    slug: 'drift',
    name: 'Drift',
    role: 'Rotation agent',
    symbol: 'DRFT',
    category: 'Momentum',
    market: 'Hyperliquid perps',
    rule: 'Every Monday ranks Hyperliquid perps by 7-day momentum, holds the top three 2x long equally, exits anything that falls out of the top five.',
    longRule:
      'Drift ranks every Hyperliquid perp by 7-day momentum each Monday, holds the top three at 2x in equal size, and drops any name that falls out of the top five before the next rebalance.',
    params: [
      { k: 'Trigger', v: 'Weekly' },
      { k: 'Lev', v: '2x' },
      { k: 'Hold', v: 'Top 3' },
      { k: 'Exit', v: 'Out of top 5' },
    ],
    subscription: 300,
    leverage: '2x',
    worstCase: 'Correlated drawdown across all three',
    fee: '10% of profit',
    icon: 'M3 13 13 3M9 3h4v4',
  },
  {
    slug: 'glass',
    name: 'Glass',
    role: 'Cascade agent',
    symbol: 'GLSS',
    category: 'Event',
    market: 'Major perps',
    rule: 'When open interest on a major perp drops more than 15% in one hour, buys the flush with 2x, takes profit at +8%, stops at −6%.',
    longRule:
      'Glass waits for liquidation cascades: when open interest on a major perp falls more than 15% in one hour, it buys the flush at 2x, takes profit at +8% and stops at −6%.',
    params: [
      { k: 'Trigger', v: 'OI −15% / 1h' },
      { k: 'Lev', v: '2x' },
      { k: 'TP', v: '+8%' },
      { k: 'SL', v: '−6%' },
    ],
    subscription: 600,
    leverage: '2x',
    worstCase: '−12% of allotment per trade',
    fee: '10% of profit',
    icon: 'M8 2v5l3 3M8 14A6 6 0 1 1 8 2',
  },
  {
    slug: 'meridian',
    name: 'Meridian',
    role: 'VWAP agent',
    symbol: 'MRDN',
    category: 'Reversion',
    market: 'ETH perp',
    rule: 'Fades moves more than 2.5% away from daily VWAP on ETH with 3x, back toward VWAP, takes profit at the band, stops at −4%.',
    longRule:
      'Meridian fades stretched moves: when ETH trades more than 2.5% from its daily VWAP, it opens a 3x position back toward VWAP, takes profit when price reaches it and stops at −4%.',
    params: [
      { k: 'Trigger', v: '±2.5% VWAP' },
      { k: 'Lev', v: '3x' },
      { k: 'TP', v: 'VWAP' },
      { k: 'SL', v: '−4%' },
    ],
    subscription: 350,
    leverage: '3x',
    worstCase: '−12% of allotment per trade',
    fee: '10% of profit',
    icon: 'M2 8h3l2-4 2 8 2-4h3',
  },
  {
    slug: 'nocturne',
    name: 'Nocturne',
    role: 'Session agent',
    symbol: 'NOCT',
    category: 'Event',
    market: 'BTC perp',
    rule: 'Fades the Asia-session move on BTC at the London open when it exceeds 1.5%, 2x, takes profit at half the move, stops at −3%.',
    longRule:
      'Nocturne trades one moment a day: at the London open, if BTC moved more than 1.5% through the Asia session, it fades the move at 2x, takes profit at half the move and stops at −3%.',
    params: [
      { k: 'Trigger', v: 'Asia > 1.5%' },
      { k: 'Lev', v: '2x' },
      { k: 'TP', v: '50% of move' },
      { k: 'SL', v: '−3%' },
    ],
    subscription: 450,
    leverage: '2x',
    worstCase: '−6% of allotment per trade',
    fee: '10% of profit',
    icon: 'M10 2.5a5.5 5.5 0 1 0 3.5 7A4.5 4.5 0 0 1 10 2.5Z',
  },
]

export function findAgent(slug: string | undefined): AgentDef | undefined {
  return AGENTS.find((a) => a.slug === slug)
}
