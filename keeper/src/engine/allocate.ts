import type { Hex } from "viem";
import type { AllocKey, SeniorConfig } from "../config.js";
import type { Decision, FelixData, MarketData, PlanStep, Proposal, ProposalLine, VaultState } from "../types.js";
import { projectMarketRate } from "./irm.js";

const WEEK = 7 / 365;

// ---------------------------------------------------------------------------
// Rule 1b: market filtering
// ---------------------------------------------------------------------------

export interface FilterResult {
  eligible: Map<Hex, MarketData>;
  excluded: { key: string; reason: string }[];
}

export function filterMarkets(markets: MarketData[], cfg: SeniorConfig): FilterResult {
  const eligible = new Map<Hex, MarketData>();
  const excluded: { key: string; reason: string }[] = [];
  const banned = new Set(cfg.excludedMarkets.map((m) => m.toLowerCase()));
  for (const m of markets) {
    const id = m.id.toLowerCase() as Hex;
    if (banned.has(id)) {
      excluded.push({ key: id, reason: "on the exclusion list" });
      continue;
    }
    if (m.utilization >= cfg.constraints.maxUtilization) {
      excluded.push({ key: id, reason: `utilization ${(m.utilization * 100).toFixed(2)}% at or above ${cfg.constraints.maxUtilization * 100}%` });
      continue;
    }
    if (m.supplyApy > cfg.constraints.maxSupplyApy) {
      excluded.push({ key: id, reason: `supply APY ${(m.supplyApy * 100).toFixed(2)}% above ${cfg.constraints.maxSupplyApy * 100}%` });
      continue;
    }
    eligible.set(id, m);
  }
  return { eligible, excluded };
}

// ---------------------------------------------------------------------------
// Rule 3: proposal
// ---------------------------------------------------------------------------

export interface ProposeInput {
  cfg: SeniorConfig;
  markets: MarketData[];
  felix: FelixData;
  state: VaultState;
}

interface Work {
  key: AllocKey;
  label: string;
  targetWeight: number;
  weight: number;
  amount: number;
  cap: number;
  fixed: boolean;
  current: number;
  reasons: string[];
}

const r6 = (x: number) => Math.round(x * 1e6) / 1e6;

export function proposeAllocation(input: ProposeInput): Proposal {
  const { cfg, felix, state } = input;
  const c = cfg.constraints;
  const total = state.totalAssets;
  const notes: string[] = [];
  const { eligible, excluded } = filterMarkets(input.markets, cfg);

  // 1. Start from the target mix, dropping markets that are excluded or have no data.
  const marketWork: Work[] = [];
  let felixW: Work | undefined;
  let idleW: Work | undefined;
  let droppedWeight = 0;

  for (const t of cfg.targets) {
    const key = (t.key === "felix" || t.key === "idle" ? t.key : (t.key.toLowerCase() as Hex)) as AllocKey;
    const current = key === "idle" ? state.idle : state.positions[key] ?? 0;
    const w: Work = { key, label: t.label, targetWeight: t.weight, weight: t.weight, amount: 0, cap: Infinity, fixed: false, current, reasons: [] };
    if (key === "felix") felixW = w;
    else if (key === "idle") idleW = w;
    else if (!eligible.has(key)) {
      const why = excluded.find((e) => e.key === key)?.reason ?? "no market data";
      if (!excluded.find((e) => e.key === key)) excluded.push({ key, reason: why });
      droppedWeight += t.weight;
      // Still track it so that any existing position is fully withdrawn.
      w.weight = 0;
      w.cap = 0;
      w.fixed = true;
      w.reasons.push(`target dropped: ${why}`);
      marketWork.push(w);
    } else marketWork.push(w);
  }
  if (!felixW || !idleW) throw new Error("targets must include felix and idle");

  const live = marketWork.filter((w) => !w.fixed);
  if (droppedWeight > 0) {
    const liveWeight = live.reduce((s, w) => s + w.weight, 0);
    if (liveWeight > 0) {
      for (const w of live) {
        const add = droppedWeight * (w.weight / liveWeight);
        w.weight += add;
        w.reasons.push(`+${(add * 100).toFixed(2)}% redistributed from excluded markets`);
      }
    } else {
      felixW.weight += droppedWeight;
      felixW.reasons.push(`+${(droppedWeight * 100).toFixed(2)}% redistributed (no eligible markets)`);
    }
    notes.push(`redistributed ${(droppedWeight * 100).toFixed(2)}% from excluded markets`);
  }

  // 2. Re-weight by projected rate. Rate is evaluated after moving to target so
  //    that a market we would crowd gets credit only for its post-move rate.
  if (live.length > 1 && c.rateTilt > 0) {
    const rates = live.map((w) => projectMarketRate(eligible.get(w.key as Hex)!, total * w.weight - w.current));
    const liveWeight = live.reduce((s, w) => s + w.weight, 0);
    const rAvg = live.reduce((s, w, i) => s + w.weight * rates[i]!, 0) / liveWeight;
    if (rAvg > 0) {
      let newSum = 0;
      live.forEach((w, i) => {
        const raw = 1 + c.rateTilt * ((rates[i]! - rAvg) / rAvg);
        const mult = Math.min(c.maxTiltMultiplier, Math.max(c.minTiltMultiplier, raw));
        w.weight *= mult;
        newSum += w.weight;
        w.reasons.push(`rate tilt x${mult.toFixed(3)} (projected ${(rates[i]! * 100).toFixed(2)}% vs avg ${(rAvg * 100).toFixed(2)}%)`);
      });
      // Renormalise so the market bucket keeps its size; felix and idle untouched.
      for (const w of live) w.weight *= liveWeight / newSum;
    }
  }

  // 3. Caps per key (absolute, relative, share of market supply, share of Felix).
  for (const w of live) {
    const m = eligible.get(w.key as Hex)!;
    const caps = state.caps[w.key] ?? { absoluteCap: 0, relativeCap: 0 };
    const others = Math.max(0, m.supplyAssets - w.current);
    const share = c.maxShareOfMarketSupply;
    const shareCap = share >= 1 ? Infinity : (share / (1 - share)) * others;
    const absCap = caps.absoluteCap;
    const relCap = caps.relativeCap * total;
    w.cap = Math.min(shareCap, absCap, relCap);
    if (w.cap === shareCap) w.reasons.push(`cap: ${(share * 100).toFixed(0)}% of market supply (${r6(shareCap).toLocaleString()} USDC)`);
    else if (w.cap === absCap) w.reasons.push(`cap: vault absolute cap (${absCap.toLocaleString()} USDC)`);
    else w.reasons.push(`cap: vault relative cap (${(caps.relativeCap * 100).toFixed(0)}% = ${r6(relCap).toLocaleString()} USDC)`);
  }
  {
    const caps = state.caps.felix ?? { absoluteCap: 0, relativeCap: 0 };
    const others = Math.max(0, felix.totalAssets - felixW.current);
    const share = c.maxShareOfFelixAssets;
    const shareCap = share >= 1 ? Infinity : (share / (1 - share)) * others;
    felixW.cap = Math.min(shareCap, caps.absoluteCap, caps.relativeCap * total);
  }

  // 4. Amounts from weights, then water-fill overflow from capped keys.
  for (const w of [...marketWork, felixW, idleW]) w.amount = total * w.weight;
  const felixFloor = c.minFelix * total;
  const idleFloor = c.minIdle * total;

  for (let iter = 0; iter < 25; iter++) {
    let overflow = 0;
    for (const w of live) {
      if (!w.fixed && w.amount > w.cap + 1e-9) {
        overflow += w.amount - w.cap;
        w.amount = w.cap;
        w.fixed = true;
        w.reasons.push("capped; overflow redistributed");
      }
    }
    if (overflow <= 1e-9) break;
    const open = live.filter((w) => !w.fixed);
    const openWeight = open.reduce((s, w) => s + w.weight, 0);
    if (open.length > 0 && openWeight > 0) {
      for (const w of open) w.amount += overflow * (w.weight / openWeight);
    } else if (felixW.amount + overflow <= felixW.cap) {
      felixW.amount += overflow;
      felixW.reasons.push(`+${r6(overflow).toLocaleString()} USDC overflow from capped markets`);
    } else {
      const toFelix = Math.max(0, felixW.cap - felixW.amount);
      felixW.amount += toFelix;
      idleW.amount += overflow - toFelix;
      idleW.reasons.push(`+${r6(overflow - toFelix).toLocaleString()} USDC overflow (markets and Felix capped)`);
      notes.push("markets and Felix are capped; excess parked idle");
    }
  }

  // 5. Floors. Felix first (liquidity adapter), then idle. Shortfall comes from
  //    markets pro rata; Felix cap still wins and any remainder goes idle.
  if (felixW.amount < felixFloor - 1e-9) {
    const need = felixFloor - felixW.amount;
    const take = takeFrom(live, need);
    felixW.amount += take;
    felixW.reasons.push(`raised to ${(c.minFelix * 100).toFixed(0)}% floor (+${r6(take).toLocaleString()} USDC)`);
  }
  if (felixW.amount > felixW.cap + 1e-9) {
    const excess = felixW.amount - felixW.cap;
    felixW.amount = felixW.cap;
    idleW.amount += excess;
    felixW.reasons.push("Felix cap binds below the floor; remainder parked idle");
    notes.push("WARNING: Felix cap binds below the 10% liquidity floor");
  }
  if (idleW.amount < idleFloor - 1e-9) {
    const need = idleFloor - idleW.amount;
    let take = takeFrom(live, need);
    if (take < need - 1e-9 && felixW.amount - (need - take) >= felixFloor) {
      felixW.amount -= need - take;
      take = need;
    }
    idleW.amount += take;
    idleW.reasons.push(`raised to ${(c.minIdle * 100).toFixed(0)}% floor (+${r6(take).toLocaleString()} USDC)`);
  }

  // 6. Close any rounding gap into idle so the proposal sums to totalAssets.
  const all = [...marketWork, felixW, idleW];
  const sum = all.reduce((s, w) => s + w.amount, 0);
  idleW.amount += total - sum;

  const lines: ProposalLine[] = all.map((w) => {
    const amount = r6(w.amount);
    const delta = r6(amount - w.current);
    let currentRate = 0;
    let projectedRate = 0;
    if (w.key === "felix") {
      currentRate = felix.netApy;
      projectedRate = felix.netApy;
    } else if (w.key !== "idle") {
      const m = input.markets.find((x) => x.id.toLowerCase() === w.key);
      if (m) {
        currentRate = m.supplyApy;
        projectedRate = projectMarketRate(m, delta);
      }
    }
    return {
      key: w.key,
      label: w.label,
      targetWeight: w.targetWeight,
      weight: total > 0 ? amount / total : 0,
      amount,
      currentAmount: w.current,
      delta,
      currentRate,
      projectedRate,
      reasons: w.reasons,
    };
  });

  return { totalAssets: total, lines, excluded, notes };
}

/** Take `need` from the given lines pro rata to their amounts. Returns what was taken. */
function takeFrom(from: Work[], need: number): number {
  const pool = from.filter((w) => w.amount > 0);
  const avail = pool.reduce((s, w) => s + w.amount, 0);
  if (avail <= 0) return 0;
  const take = Math.min(need, avail);
  for (const w of pool) w.amount -= take * (w.amount / avail);
  return take;
}

// ---------------------------------------------------------------------------
// Rule 4: move only when projected weekly gain beats cost by the margin
// ---------------------------------------------------------------------------

export interface DecideInput {
  cfg: SeniorConfig;
  proposal: Proposal;
  plan: PlanStep[];
  hypePriceUsd: number;
  gasPriceGwei: number;
}

export function decide(input: DecideInput): Decision {
  const { cfg, proposal, plan } = input;
  const e = cfg.economics;

  // Lines whose delta survived the dust filter in the plan are "moved"; the rest
  // stay where they are, so their projected rate is their current rate.
  const movedKeys = new Set(plan.map((s) => s.marketId));
  let weeklyCurrent = 0;
  let weeklyProposed = 0;
  for (const l of proposal.lines) {
    weeklyCurrent += l.currentAmount * l.currentRate * WEEK;
    if (movedKeys.has(l.key as Hex | "felix")) weeklyProposed += l.amount * l.projectedRate * WEEK;
    else weeklyProposed += l.currentAmount * l.currentRate * WEEK;
  }
  const weeklyGainUsd = weeklyProposed - weeklyCurrent;

  // Amount repositioned: a rotation of X from A to B moves X once, not twice.
  const deallocated = plan.filter((p) => p.action === "deallocate").reduce((s, p) => s + p.amount, 0);
  const allocated = plan.filter((p) => p.action === "allocate").reduce((s, p) => s + p.amount, 0);
  const movedAmount = Math.max(deallocated, allocated);
  const actions = plan.length;
  const gasHype = (actions * e.gasPerAction * input.gasPriceGwei) / 1e9;
  const gasCostUsd = gasHype * input.hypePriceUsd;
  const slippageCostUsd = movedAmount * e.slippagePenalty;
  const totalCostUsd = gasCostUsd + slippageCostUsd;
  const threshold = e.marginFactor * totalCostUsd;

  let move = false;
  let reason: string;
  if (actions === 0) reason = "no deltas above the dust threshold";
  else if (weeklyGainUsd <= 0) reason = `projected weekly gain ${fmt(weeklyGainUsd)} is not positive`;
  else if (weeklyGainUsd <= threshold) reason = `projected weekly gain ${fmt(weeklyGainUsd)} below ${e.marginFactor}x cost ${fmt(totalCostUsd)} = ${fmt(threshold)}`;
  else {
    move = true;
    reason = `projected weekly gain ${fmt(weeklyGainUsd)} exceeds ${e.marginFactor}x cost ${fmt(totalCostUsd)} = ${fmt(threshold)}`;
  }

  return {
    move,
    movedAmount: r6(movedAmount),
    weeklyGainUsd,
    weeklyCurrentUsd: weeklyCurrent,
    weeklyProposedUsd: weeklyProposed,
    gasCostUsd,
    slippageCostUsd,
    totalCostUsd,
    marginFactor: e.marginFactor,
    threshold,
    actions,
    reason,
  };
}

const fmt = (x: number) => `$${x.toFixed(2)}`;
