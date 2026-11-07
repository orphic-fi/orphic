import { describe, expect, it } from "vitest";
import { curveMultiplier, projectMarketRate, projectSupplyRate, utilizationAfter, KINK } from "../src/engine/irm.js";

describe("rule 4: Adaptive Curve IRM approximation", () => {
  it("returns the observed rate unchanged when utilization does not move", () => {
    expect(projectSupplyRate(0.062, 0.8, 0.8)).toBeCloseTo(0.062, 12);
    expect(projectSupplyRate(0.12, 0.95, 0.95)).toBeCloseTo(0.12, 12);
  });

  it("lowers the supply rate when we add supply and raises it when we remove supply", () => {
    const m = { supplyAssets: 10_000_000, borrowAssets: 8_000_000, supplyApy: 0.06, utilization: 0.8, fee: 0 };
    expect(projectMarketRate(m, 1_000_000)).toBeLessThan(0.06);
    expect(projectMarketRate(m, -1_000_000)).toBeGreaterThan(0.06);
  });

  it("is piecewise linear with the kink at 90% and 4x the target rate at full utilization", () => {
    expect(curveMultiplier(KINK)).toBeCloseTo(1, 12);
    expect(curveMultiplier(1)).toBeCloseTo(4, 12);
    expect(curveMultiplier(0)).toBeCloseTo(0.25, 12);
    // slope in rate terms per point of utilization: far steeper above the kink
    const below = (curveMultiplier(0.9) - curveMultiplier(0.8)) / 0.1;
    const above = (curveMultiplier(1.0) - curveMultiplier(0.9)) / 0.1;
    expect(above / below).toBeCloseTo(36, 6);
    // 4x steeper in the normalised error space used by the IRM
    expect(above * (1 - KINK) / (below * KINK)).toBeCloseTo(4, 6);
  });

  it("computes post-move utilization and clamps it", () => {
    expect(utilizationAfter(100, 80, 20)).toBeCloseTo(80 / 120);
    expect(utilizationAfter(100, 80, -30)).toBeCloseTo(1);
    expect(utilizationAfter(100, 80, -100)).toBe(1);
  });

  it("yields zero when there is no borrow demand", () => {
    expect(projectSupplyRate(0, 0, 0.5)).toBe(0);
    expect(projectMarketRate({ supplyAssets: 100, borrowAssets: 0, supplyApy: 0, utilization: 0, fee: 0 }, 50)).toBe(0);
  });
});
