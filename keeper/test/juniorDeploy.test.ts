import { describe, expect, it } from "vitest";
import { COVER_BUFFER_BPS, MIN_MOVE, MIN_RESERVE, planIdle, reserveFor, type IdleInputs } from "../src/exec/juniorDeploy.js";

const U = 1_000_000n; // 1 USDC
const base: IdleInputs = {
  idle: 81n * U,
  reserved: 0n,
  owedToMaturing: 0n,
  seniorAssets: 316n * U,
  felixAssets: 0n,
  felixWithdrawable: 0n,
  allowance: 0n,
};

describe("junior idle: reserve", () => {
  it("is the larger of the cover buffer, exits owed plus reserved, and the floor", () => {
    // 1% of 316 = 3.16 < 5 floor
    expect(reserveFor(base)).toBe(MIN_RESERVE);
    expect(COVER_BUFFER_BPS).toBe(100n);
    // 1% of 100k senior = 1,000 beats the floor
    expect(reserveFor({ ...base, seniorAssets: 100_000n * U })).toBe(1_000n * U);
    // exits owed beat the buffer
    expect(reserveFor({ ...base, seniorAssets: 100_000n * U, owedToMaturing: 2_500n * U, reserved: 100n * U })).toBe(2_600n * U);
  });
});

describe("junior idle: plan", () => {
  it("today's state: deploys 76 USDC and approves first", () => {
    const a = planIdle(base);
    expect(a).toEqual({ kind: "deploy", amount: 76n * U, approve: true });
  });

  it("skips the approve when the allowance already covers it", () => {
    const a = planIdle({ ...base, allowance: 1_000n * U });
    expect(a).toEqual({ kind: "deploy", amount: 76n * U, approve: false });
  });

  it("holds when the excess over the reserve is below the minimum move", () => {
    const a = planIdle({ ...base, idle: MIN_RESERVE + MIN_MOVE - 1n });
    expect(a.kind).toBe("hold");
  });

  it("pulls back from Felix when idle falls below the reserve", () => {
    const a = planIdle({ ...base, idle: 1n * U, felixAssets: 76n * U, felixWithdrawable: 76n * U });
    expect(a).toEqual({ kind: "withdraw", amount: 4n * U });
  });

  it("pulls back only what Felix will release right now", () => {
    const a = planIdle({ ...base, idle: 0n, owedToMaturing: 50n * U, felixAssets: 76n * U, felixWithdrawable: 10n * U });
    expect(a).toEqual({ kind: "withdraw", amount: 10n * U });
  });

  it("holds, and says why, when idle is short but nothing is deployed", () => {
    const a = planIdle({ ...base, idle: 1n * U });
    expect(a.kind).toBe("hold");
    if (a.kind === "hold") expect(a.reason).toMatch(/nothing deployed/);
  });

  it("never deploys USDC that priced exits are owed", () => {
    // reservedAssets 60 of 81 idle: only 81 - max(60, 5) = 21 is free, and 21 >= 20 so it deploys exactly 21
    const a = planIdle({ ...base, reserved: 60n * U });
    expect(a).toEqual({ kind: "deploy", amount: 21n * U, approve: true });
  });
});
