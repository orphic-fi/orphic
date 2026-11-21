import { describe, expect, it } from "vitest";
import { planJunior, type JuniorAllocInputs, type JuniorAllocParams } from "../src/engine/juniorAllocate.js";

const U = (n: number) => BigInt(Math.round(n * 1e6));
const P: JuniorAllocParams = { hlMaxFraction: 0.2, minMove: U(20), marginFactor: 3, gasCostUsdPerAction: 0.02 };
const base = (o: Partial<JuniorAllocInputs> = {}): JuniorAllocInputs => ({
  idle: U(10),
  reserve: U(10),
  felixAssets: U(0),
  felixWithdrawable: U(0),
  hlAssets: U(0),
  hlWithdrawable: U(0),
  felixRate: 0.04,
  hlRate: 0.039,
  felixAllowance: 0n,
  hlAllowance: 0n,
  ...o,
});

describe("planJunior", () => {
  it("puts excess idle into Felix when Felix pays more, approving first", () => {
    const plan = planJunior(base({ idle: U(1010) }), P);
    expect(plan.actions).toEqual([
      { kind: "approve", venue: "felix", amount: U(1000) },
      { kind: "deposit", venue: "felix", amount: U(1000) },
    ]);
    expect(plan.target.idle).toBe(U(10));
  });

  it("splits excess idle when HyperLend pays more, HyperLend capped at 20% of the book", () => {
    const plan = planJunior(base({ idle: U(1010), hlRate: 0.05, felixAllowance: U(1e9), hlAllowance: U(1e9) }), P);
    const hl = plan.actions.find((a) => a.venue === "hyperlend");
    const fx = plan.actions.find((a) => a.venue === "felix");
    expect(hl).toEqual({ kind: "deposit", venue: "hyperlend", amount: U(200) });
    expect(fx).toEqual({ kind: "deposit", venue: "felix", amount: U(800) });
  });

  it("holds at target", () => {
    const plan = planJunior(base({ idle: U(10), felixAssets: U(800), felixWithdrawable: U(800), hlAssets: U(200), hlWithdrawable: U(200), hlRate: 0.05 }), P);
    expect(plan.actions).toEqual([]);
    expect(plan.reason).toMatch(/at target/);
  });

  it("does not shuffle venue to venue for a gain below the margin", () => {
    // all in Felix, HyperLend 0.1% better: moving $200 earns $0.004/week, 2 actions cost $0.04
    const plan = planJunior(base({ felixAssets: U(1000), felixWithdrawable: U(1000), hlRate: 0.041 }), P);
    expect(plan.actions).toEqual([]);
    expect(plan.reason).toMatch(/^hold: moving/);
  });

  it("does shuffle venue to venue when the gain clears the margin", () => {
    // $100k in Felix, HyperLend 2% better: moving $20k earns $7.7/week against $0.04 of gas
    const plan = planJunior(base({ felixAssets: U(100_000), felixWithdrawable: U(100_000), hlRate: 0.06, hlAllowance: U(1e9) }), P);
    expect(plan.actions).toEqual([
      { kind: "withdraw", venue: "felix", amount: U(20_000) },
      { kind: "deposit", venue: "hyperlend", amount: U(20_000) },
    ]);
    expect(plan.reason).toMatch(/rebalance toward hyperlend/);
  });

  it("still puts new idle to work in the better venue when the shuffle itself does not pay", () => {
    const plan = planJunior(base({ idle: U(110), felixAssets: U(1000), felixWithdrawable: U(1000), hlRate: 0.041, hlAllowance: U(1e9) }), P);
    // cap is 20% of 1100 = 220; hl has room, so the $100 of idle goes to HyperLend, Felix untouched
    expect(plan.actions).toEqual([{ kind: "deposit", venue: "hyperlend", amount: U(100) }]);
  });

  it("pulls back to the reserve from Felix first, then HyperLend", () => {
    const plan = planJunior(base({ idle: U(2), reserve: U(50), felixAssets: U(30), felixWithdrawable: U(30), hlAssets: U(100), hlWithdrawable: U(100) }), P);
    expect(plan.actions).toEqual([
      { kind: "withdraw", venue: "felix", amount: U(30) },
      { kind: "withdraw", venue: "hyperlend", amount: U(18) },
    ]);
    expect(plan.reason).toMatch(/^reserve/);
  });

  it("respects venue liquidity on withdrawals and says when it is short", () => {
    const plan = planJunior(base({ idle: U(0), reserve: U(50), felixAssets: U(30), felixWithdrawable: U(5), hlAssets: U(100), hlWithdrawable: U(10) }), P);
    expect(plan.actions).toEqual([
      { kind: "withdraw", venue: "felix", amount: U(5) },
      { kind: "withdraw", venue: "hyperlend", amount: U(10) },
    ]);
    expect(plan.reason).toMatch(/still short 35.00/);
  });

  it("ignores dust", () => {
    const plan = planJunior(base({ idle: U(25) }), P); // $15 excess, under minMove
    expect(plan.actions).toEqual([]);
  });

  it("never exceeds the HyperLend cap when rebalancing out of HyperLend", () => {
    // HyperLend overweight (50%) and Felix now pays more: whole HyperLend position comes back to Felix
    const plan = planJunior(base({ felixAssets: U(50_000), felixWithdrawable: U(50_000), hlAssets: U(50_000), hlWithdrawable: U(50_000), hlRate: 0.03, felixAllowance: U(1e9) }), P);
    expect(plan.actions).toEqual([
      { kind: "withdraw", venue: "hyperlend", amount: U(50_000) },
      { kind: "deposit", venue: "felix", amount: U(50_000) },
    ]);
  });
});
