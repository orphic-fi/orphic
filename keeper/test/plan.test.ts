import { describe, expect, it } from "vitest";
import { proposeAllocation } from "../src/engine/allocate.js";
import { buildPlan, formatPlanTable, validatePlan } from "../src/exec/plan.js";
import { K62, K77, UBTC, WHYPE, cfg, felix, markets, state, stateAtTarget } from "./helpers.js";

describe("rule 5: plan sequencing", () => {
  const c = cfg();
  const s = state({}, c);
  const p = proposeAllocation({ cfg: c, markets: markets(), felix: felix(), state: s });
  const { plan } = buildPlan(c, s, p);

  it("deallocates before allocating", () => {
    const firstAlloc = plan.findIndex((x) => x.action === "allocate");
    const lastDealloc = plan.map((x) => x.action).lastIndexOf("deallocate");
    expect(firstAlloc).toBeGreaterThan(-1);
    expect(lastDealloc).toBeLessThan(firstAlloc);
    expect(() => validatePlan(c, s, plan)).not.toThrow();
  });

  it("never sends a single transfer above the max clip (25% of vault assets)", () => {
    const clip = 0.25 * s.totalAssets;
    for (const step of plan) expect(step.amount).toBeLessThanOrEqual(clip + 1e-6);
    // 1.96M out of Felix needs more than one clip at 500k
    expect(plan.filter((x) => x.action === "deallocate" && x.marketId === "felix").length).toBeGreaterThanOrEqual(3);
  });

  it("keeps idle at or above 2% after every step", () => {
    let idle = s.idle;
    for (const step of plan) {
      idle += step.action === "deallocate" ? step.amount : -step.amount;
      expect(idle).toBeGreaterThanOrEqual(0.02 * s.totalAssets - 1e-6);
      expect(step.idleAfter).toBeCloseTo(idle, 3);
    }
  });

  it("moves exactly the proposed deltas, routed to the right adapter", () => {
    for (const key of [K62, K77, WHYPE, UBTC, "felix"] as const) {
      const delta = p.lines.find((l) => l.key === key)!.delta;
      const moved = plan.filter((x) => x.marketId === key).reduce((acc, x) => acc + (x.action === "allocate" ? x.amount : -x.amount), 0);
      expect(moved).toBeCloseTo(delta, 3);
      const adapterSlot = key === "felix" ? c.adapters.morphoVaultV1 : c.adapters.morphoMarketV1;
      for (const x of plan.filter((y) => y.marketId === key)) expect(x.adapter).toBe(adapterSlot);
    }
  });

  it("ignores dust deltas below minDeltaFraction", () => {
    const c2 = cfg({ constraints: { rateTilt: 0 } as never });
    const s2 = stateAtTarget(2_000_000, c2);
    s2.positions[K62]! -= 2_000;
    s2.positions[WHYPE]! += 2_000;
    const p2 = proposeAllocation({ cfg: c2, markets: markets(), felix: felix(), state: s2 });
    const { plan: plan2, notes } = buildPlan(c2, s2, p2);
    expect(plan2.length).toBe(0);
    expect(notes.length).toBeGreaterThan(0);
  });

  it("validatePlan rejects a plan that allocates before deallocating or breaks the clip", () => {
    const bad = [...plan].reverse();
    expect(() => validatePlan(c, s, bad)).toThrow(/deallocate after allocate|idle/);
    const big = [{ ...plan[0]!, amount: 0.3 * s.totalAssets }];
    expect(() => validatePlan(c, s, big)).toThrow(/max clip/);
  });

  it("renders a table", () => {
    const table = formatPlanTable(plan, s.totalAssets);
    expect(table).toContain("deallocate");
    expect(table).toContain("allocate");
    expect(table.split("\n").length).toBe(plan.length + 2);
  });
});
