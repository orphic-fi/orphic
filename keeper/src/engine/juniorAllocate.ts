/**
 * Junior allocation: the same read, project, move loop senior runs, for junior's two lending venues.
 *
 *   Felix USDC   (Morpho Vault V1.1, instant exit while liquid)
 *   HyperLend    (Aave v3 pool, instant exit while the reserve has liquidity), capped at a slice of the book
 *
 * Pure: every number is an input, the output is an ordered list of actions. The executor turns actions into
 * junior.execute calls, which the contract allowlist bounds (deposit/withdraw/supply/withdraw with junior as the
 * receiver; nothing else).
 *
 * Rules, in order:
 *   1. Reserve first. Idle must cover the reserve (exits maturing by the next settle, the cover buffer, the floor).
 *      A shortfall is pulled back from Felix first (cheapest, most liquid), then HyperLend.
 *   2. Idle above the reserve is never left idle: it goes to the better venue, subject to the HyperLend cap.
 *   3. A venue-to-venue move happens only when the extra weekly yield beats marginFactor x gas, like senior.
 *   4. Nothing under minMove moves; nothing is sized by a rate we did not read from the venue itself.
 */

export interface JuniorAllocInputs {
  idle: bigint; // junior's USDC balance
  reserve: bigint; // what must stay idle (reserveFor in juniorDeploy)
  felixAssets: bigint; // junior's Felix position in USDC
  felixWithdrawable: bigint; // Felix maxWithdraw(junior)
  hlAssets: bigint; // junior's aUSDC balance (USDC owed, interest included)
  hlWithdrawable: bigint; // min(hlAssets, pool liquidity)
  felixRate: number; // Felix supply APY net of fee, read from the vault (fraction, 0.04 = 4%)
  hlRate: number; // HyperLend currentLiquidityRate, read from the pool (fraction)
  felixAllowance: bigint; // USDC allowance junior -> Felix
  hlAllowance: bigint; // USDC allowance junior -> HyperLend pool
}

export interface JuniorAllocParams {
  hlMaxFraction: number; // HyperLend slice cap, of (felix + hl + deployable idle)
  minMove: bigint; // USDC, 6 decimals
  marginFactor: number; // venue-to-venue moves need weekly gain > marginFactor x cost
  gasCostUsdPerAction: number; // from gas price and HYPE price, like senior
}

export type Venue = "felix" | "hyperlend";

export type JuniorAction =
  | { kind: "approve"; venue: Venue; amount: bigint }
  | { kind: "deposit"; venue: Venue; amount: bigint }
  | { kind: "withdraw"; venue: Venue; amount: bigint };

export interface JuniorPlan {
  actions: JuniorAction[];
  reason: string;
  weeklyGainUsd: number;
  costUsd: number;
  target: { felix: bigint; hyperlend: bigint; idle: bigint };
}

const fmt = (v: bigint) => `${(Number(v) / 1e6).toFixed(2)} USDC`;
const pct = (r: number) => `${(r * 100).toFixed(2)}%`;

export function planJunior(i: JuniorAllocInputs, p: JuniorAllocParams): JuniorPlan {
  const book = i.idle + i.felixAssets + i.hlAssets;
  const hold = (reason: string): JuniorPlan => ({ actions: [], reason, weeklyGainUsd: 0, costUsd: 0, target: { felix: i.felixAssets, hyperlend: i.hlAssets, idle: i.idle } });

  // 1. Reserve shortfall: pull back, Felix first.
  if (i.idle < i.reserve) {
    let need = i.reserve - i.idle;
    const actions: JuniorAction[] = [];
    const fromFelix = need < i.felixWithdrawable ? need : i.felixWithdrawable;
    if (fromFelix > 0n) {
      actions.push({ kind: "withdraw", venue: "felix", amount: fromFelix });
      need -= fromFelix;
    }
    const fromHl = need < i.hlWithdrawable ? need : i.hlWithdrawable;
    if (need > 0n && fromHl > 0n) {
      actions.push({ kind: "withdraw", venue: "hyperlend", amount: fromHl });
      need -= fromHl;
    }
    if (actions.length === 0) return hold(`idle ${fmt(i.idle)} below reserve ${fmt(i.reserve)} and nothing withdrawable to pull back`);
    const pulled = actions.reduce((s, a) => s + a.amount, 0n);
    return {
      actions,
      reason: `reserve: idle ${fmt(i.idle)} below ${fmt(i.reserve)}; pulling ${fmt(pulled)} back${need > 0n ? `, still short ${fmt(need)}` : ""}`,
      weeklyGainUsd: 0,
      costUsd: actions.length * p.gasCostUsdPerAction,
      target: { felix: i.felixAssets - (actions.find((a) => a.venue === "felix")?.amount ?? 0n), hyperlend: i.hlAssets - (actions.find((a) => a.venue === "hyperlend")?.amount ?? 0n), idle: i.idle + pulled },
    };
  }

  // 2. Target mix for everything above the reserve.
  const deployable = book - i.reserve; // what may sit in venues
  const better: Venue = i.hlRate > i.felixRate ? "hyperlend" : "felix";
  const hlCap = BigInt(Math.floor(Number(deployable) * p.hlMaxFraction));
  const hlTarget = better === "hyperlend" ? (deployable < hlCap ? deployable : hlCap) : 0n;
  const felixTarget = deployable - hlTarget;
  const target = { felix: felixTarget, hyperlend: hlTarget, idle: i.reserve };

  const dFelix = felixTarget - i.felixAssets;
  const dHl = hlTarget - i.hlAssets;
  const excessIdle = i.idle - i.reserve;

  // How much is venue-to-venue (needs the margin rule) versus idle being put to work (always worth it)?
  const outflow = (dFelix < 0n ? -dFelix : 0n) + (dHl < 0n ? -dHl : 0n);
  const rateGap = Math.abs(i.hlRate - i.felixRate);
  const weeklyGainUsd = (Number(outflow) / 1e6) * (rateGap / 52);
  const movesNeeded = (dFelix !== 0n ? 1 : 0) + (dHl !== 0n ? 1 : 0);
  const costUsd = movesNeeded * p.gasCostUsdPerAction;

  let planFelix = dFelix;
  let planHl = dHl;
  if (outflow > 0n && weeklyGainUsd <= p.marginFactor * costUsd) {
    // The rebalance does not pay. Still put excess idle to work in the better venue, inside the cap.
    const room = better === "hyperlend" ? (hlCap > i.hlAssets ? hlCap - i.hlAssets : 0n) : excessIdle;
    const toBetter = excessIdle < room ? excessIdle : room;
    planHl = better === "hyperlend" ? toBetter : 0n;
    planFelix = excessIdle - planHl;
  }

  const actions: JuniorAction[] = [];
  const push = (venue: Venue, delta: bigint, withdrawable: bigint, allowance: bigint) => {
    if (delta < 0n) {
      const amt = -delta < withdrawable ? -delta : withdrawable;
      if (amt >= p.minMove) actions.push({ kind: "withdraw", venue, amount: amt });
    }
  };
  push("felix", planFelix, i.felixWithdrawable, i.felixAllowance);
  push("hyperlend", planHl, i.hlWithdrawable, i.hlAllowance);
  const deposits: JuniorAction[] = [];
  const dep = (venue: Venue, delta: bigint, allowance: bigint) => {
    if (delta >= p.minMove) {
      if (allowance < delta) deposits.push({ kind: "approve", venue, amount: delta });
      deposits.push({ kind: "deposit", venue, amount: delta });
    }
  };
  dep("felix", planFelix, i.felixAllowance);
  dep("hyperlend", planHl, i.hlAllowance);
  actions.push(...deposits);

  if (actions.length === 0) {
    if (excessIdle >= p.minMove && outflow === 0n) return hold(`idle ${fmt(i.idle)} above reserve but no venue can take ${fmt(excessIdle)}`);
    if (outflow > 0n && weeklyGainUsd <= p.marginFactor * costUsd) {
      return hold(`hold: moving ${fmt(outflow)} to ${better} (${pct(i.hlRate)} vs ${pct(i.felixRate)}) earns ${weeklyGainUsd.toFixed(3)}/week, below ${p.marginFactor}x cost ${costUsd.toFixed(3)}`);
    }
    return hold(`at target: Felix ${fmt(i.felixAssets)} (${pct(i.felixRate)}), HyperLend ${fmt(i.hlAssets)} (${pct(i.hlRate)}), idle ${fmt(i.idle)} for a reserve of ${fmt(i.reserve)}`);
  }
  const moved = actions.filter((a) => a.kind !== "approve").reduce((s, a) => s + a.amount, 0n);
  const reason =
    outflow > 0n && weeklyGainUsd > p.marginFactor * costUsd
      ? `rebalance toward ${better}: ${pct(i.hlRate)} HyperLend vs ${pct(i.felixRate)} Felix, ${weeklyGainUsd.toFixed(3)}/week gain beats ${p.marginFactor}x cost ${costUsd.toFixed(3)}`
      : `put ${fmt(moved)} of idle to work in ${better === "hyperlend" && planHl > 0n ? "HyperLend" : "Felix"} (${pct(better === "hyperlend" ? i.hlRate : i.felixRate)}), reserve ${fmt(i.reserve)} stays idle`;
  return { actions, reason, weeklyGainUsd, costUsd: actions.filter((a) => a.kind !== "approve").length * p.gasCostUsdPerAction, target };
}
