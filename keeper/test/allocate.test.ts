import { describe, expect, it } from "vitest";
import { decide, filterMarkets, proposeAllocation } from "../src/engine/allocate.js";
import { buildPlan } from "../src/exec/plan.js";
import { BANNED, FULL, K62, K77, UBTC, WHYPE, WILD, cfg, felix, markets, state, stateAtTarget } from "./helpers.js";

const line = (p: ReturnType<typeof proposeAllocation>, key: string) => p.lines.find((l) => l.key === key)!;
const sumAmounts = (p: ReturnType<typeof proposeAllocation>) => p.lines.reduce((s, l) => s + l.amount, 0);

describe("rule 1/3: market filtering", () => {
  it("excludes the banned market, 100% utilization and APY above 100%", () => {
    const { eligible, excluded } = filterMarkets(markets(), cfg());
    expect(eligible.has(K62)).toBe(true);
    expect(eligible.has(UBTC)).toBe(true);
    expect(eligible.has(BANNED)).toBe(false);
    expect(eligible.has(FULL)).toBe(false);
    expect(eligible.has(WILD)).toBe(false);
    expect(excluded.map((e) => e.key).sort()).toEqual([BANNED, FULL, WILD].sort());
    expect(excluded.find((e) => e.key === FULL)!.reason).toMatch(/utilization/);
    expect(excluded.find((e) => e.key === WILD)!.reason).toMatch(/APY/);
  });
});

describe("rule 3: proposal", () => {
  it("starts from the target mix and sums to total assets", () => {
    const c = cfg({ constraints: { rateTilt: 0 } as never });
    const p = proposeAllocation({ cfg: c, markets: markets(), felix: felix(), state: state({}, c) });
    expect(sumAmounts(p)).toBeCloseTo(2_000_000, 3);
    for (const t of c.targets) expect(line(p, t.key).weight).toBeCloseTo(t.weight, 6);
  });

  it("tilts weight toward higher projected rates while keeping the market bucket size", () => {
    const c = cfg();
    const p = proposeAllocation({ cfg: c, markets: markets(), felix: felix(), state: state({}, c) });
    // kHYPE 77% has the highest rate (8.1%), UBTC the lowest (4.8%)
    expect(line(p, K77).weight).toBeGreaterThan(0.10);
    expect(line(p, UBTC).weight).toBeLessThan(0.19);
    const bucket = [K62, K77, WHYPE, UBTC].reduce((s, k) => s + line(p, k).weight, 0);
    expect(bucket).toBeCloseTo(0.83, 6);
    expect(line(p, "felix").weight).toBeCloseTo(0.15, 6);
    expect(line(p, "idle").weight).toBeCloseTo(0.02, 6);
    expect(line(p, K77).reasons.some((r) => r.includes("rate tilt"))).toBe(true);
  });

  it("never exceeds 50% of a market's total supply and redistributes the overflow", () => {
    const c = cfg({ constraints: { rateTilt: 0 } as never });
    const ms = markets().map((m) => (m.id === K62 ? { ...m, supplyAssets: 300_000, borrowAssets: 240_000 } : m));
    const p = proposeAllocation({ cfg: c, markets: ms, felix: felix(), state: state({}, c) });
    // our position may be at most equal to everyone else's supply (50% of post-move total)
    expect(line(p, K62).amount).toBeLessThanOrEqual(300_000 + 1e-6);
    expect(line(p, K62).amount / (300_000 + line(p, K62).amount)).toBeLessThanOrEqual(0.5 + 1e-9);
    expect(line(p, WHYPE).amount).toBeGreaterThan(400_000);
    expect(sumAmounts(p)).toBeCloseTo(2_000_000, 3);
  });

  it("never exceeds 50% of Felix total assets", () => {
    const c = cfg({ constraints: { rateTilt: 0 } as never });
    const p = proposeAllocation({ cfg: c, markets: markets(), felix: felix({ totalAssets: 2_100_000 }), state: state({}, c) });
    // we already hold 1.96M of a 2.1M vault, so others = 140k and our cap is 140k
    expect(line(p, "felix").amount).toBeLessThanOrEqual(140_000 + 1e-6);
    expect(p.notes.some((n) => n.includes("Felix cap binds"))).toBe(true);
    expect(sumAmounts(p)).toBeCloseTo(2_000_000, 3);
  });

  it("keeps idle at or above 2% and Felix at or above 10%", () => {
    const c = cfg();
    c.targets = c.targets.map((t) => (t.key === "idle" ? { ...t, weight: 0.02 } : t));
    // Tiny markets everywhere so most weight is pushed toward Felix and idle.
    const ms = markets().map((m) => ({ ...m, supplyAssets: 50_000, borrowAssets: 40_000 }));
    const p = proposeAllocation({ cfg: c, markets: ms, felix: felix(), state: state({}, c) });
    expect(line(p, "idle").weight).toBeGreaterThanOrEqual(0.02 - 1e-9);
    expect(line(p, "felix").weight).toBeGreaterThanOrEqual(0.10 - 1e-9);
    expect(sumAmounts(p)).toBeCloseTo(2_000_000, 3);
  });

  it("respects absolute and relative caps read from the vault", () => {
    const c = cfg({ constraints: { rateTilt: 0 } as never });
    const s = state({ caps: { [K62]: { absoluteCap: 100_000, relativeCap: 1 }, [WHYPE]: { absoluteCap: 10_000_000, relativeCap: 0.05 } } }, c);
    const p = proposeAllocation({ cfg: c, markets: markets(), felix: felix(), state: s });
    expect(line(p, K62).amount).toBeLessThanOrEqual(100_000 + 1e-6);
    expect(line(p, WHYPE).amount).toBeLessThanOrEqual(0.05 * 2_000_000 + 1e-6);
    expect(line(p, K62).reasons.some((r) => r.includes("absolute cap"))).toBe(true);
    expect(line(p, WHYPE).reasons.some((r) => r.includes("relative cap"))).toBe(true);
    expect(sumAmounts(p)).toBeCloseTo(2_000_000, 3);
  });

  it("drops an excluded market from the mix and redistributes its target weight", () => {
    const c = cfg({ constraints: { rateTilt: 0 } as never });
    // make the 62.5% market look 100% utilised
    const ms = markets().map((m) => (m.id === K62 ? { ...m, utilization: 1, liquidityAssets: 0 } : m));
    const s = state({ positions: { [K62]: 100_000, felix: 1_860_000 } }, c);
    const p = proposeAllocation({ cfg: c, markets: ms, felix: felix(), state: s });
    expect(line(p, K62).amount).toBe(0);
    expect(line(p, K62).delta).toBeCloseTo(-100_000, 3);
    expect(p.excluded.some((e) => e.key === K62)).toBe(true);
    const rest = [K77, WHYPE, UBTC].reduce((s2, k) => s2 + line(p, k).weight, 0);
    expect(rest).toBeCloseTo(0.83, 6);
  });
});

describe("rule 4: move only when gain beats cost by the margin", () => {
  it("holds when the vault already sits on the target mix", () => {
    const c = cfg({ constraints: { rateTilt: 0 } as never });
    const s = stateAtTarget(2_000_000, c);
    const p = proposeAllocation({ cfg: c, markets: markets(), felix: felix(), state: s });
    const { plan } = buildPlan(c, s, p);
    const d = decide({ cfg: c, proposal: p, plan, hypePriceUsd: 30, gasPriceGwei: 0.1 });
    expect(plan.length).toBe(0);
    expect(d.move).toBe(false);
    expect(d.reason).toMatch(/dust/);
  });

  it("holds when the projected weekly gain is below marginFactor times cost", () => {
    const c = cfg({ economics: { marginFactor: 3, slippagePenalty: 0.0002 } as never });
    // Small drift: 0.5% of the vault needs to move out of Felix into kHYPE 62.5%.
    const s = stateAtTarget(2_000_000, c);
    s.positions[K62]! -= 12_000;
    s.positions.felix! += 12_000;
    const p = proposeAllocation({ cfg: c, markets: markets(), felix: felix(), state: s });
    const { plan } = buildPlan(c, s, p);
    const d = decide({ cfg: c, proposal: p, plan, hypePriceUsd: 30, gasPriceGwei: 0.1 });
    expect(d.weeklyGainUsd).toBeGreaterThan(0);
    expect(d.weeklyGainUsd).toBeLessThan(d.threshold);
    expect(d.move).toBe(false);
  });

  it("holds when the spread over Felix is too thin to pay for the rotation", () => {
    const c = cfg();
    const s = state({}, c);
    const p = proposeAllocation({ cfg: c, markets: markets(), felix: felix(), state: s });
    const { plan } = buildPlan(c, s, p);
    const d = decide({ cfg: c, proposal: p, plan, hypePriceUsd: 30, gasPriceGwei: 0.1 });
    // fixture spread is roughly 1.3% over Felix before crowding: gain is positive but under 3x cost
    expect(d.weeklyGainUsd).toBeGreaterThan(0);
    expect(d.move).toBe(false);
    expect(d.reason).toMatch(/below 3x cost/);
    // moved amount counts the repositioned amount once, not both legs
    const allocated = plan.filter((x) => x.action === "allocate").reduce((a, x) => a + x.amount, 0);
    expect(d.movedAmount).toBeCloseTo(allocated, 3);
  });

  it("moves when the gain clears the margin, and gas plus slippage are priced in", () => {
    const c = cfg();
    const s = state({}, c);
    // double every market rate so the spread over Felix is clearly worth the move
    const hot = markets().map((m) => ({ ...m, supplyApy: m.supplyApy * 2 }));
    const p = proposeAllocation({ cfg: c, markets: hot, felix: felix(), state: s });
    const { plan } = buildPlan(c, s, p);
    const d = decide({ cfg: c, proposal: p, plan, hypePriceUsd: 30, gasPriceGwei: 0.1 });
    expect(d.move).toBe(true);
    expect(d.slippageCostUsd).toBeCloseTo(d.movedAmount * 0.0002, 6);
    expect(d.gasCostUsd).toBeCloseTo((plan.length * c.economics.gasPerAction * 0.1 * 30) / 1e9, 9);
    expect(d.threshold).toBeCloseTo(3 * d.totalCostUsd, 9);
    expect(d.weeklyGainUsd).toBeGreaterThan(d.threshold);
  });

  it("holds when the margin factor is raised enough", () => {
    const c = cfg({ economics: { marginFactor: 1000 } as never });
    const s = state({}, c);
    const hot = markets().map((m) => ({ ...m, supplyApy: m.supplyApy * 2 }));
    const p = proposeAllocation({ cfg: c, markets: hot, felix: felix(), state: s });
    const { plan } = buildPlan(c, s, p);
    const d = decide({ cfg: c, proposal: p, plan, hypePriceUsd: 30, gasPriceGwei: 0.1 });
    expect(d.move).toBe(false);
  });

  it("projects a lower rate for the market we crowd into", () => {
    const c = cfg();
    const s = state({}, c);
    const p = proposeAllocation({ cfg: c, markets: markets(), felix: felix(), state: s });
    const k77 = line(p, K77);
    expect(k77.delta).toBeGreaterThan(0);
    expect(k77.projectedRate).toBeLessThan(k77.currentRate);
  });
});
