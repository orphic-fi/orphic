import { describe, expect, it } from "vitest";
import { HEARTBEAT_MAX_AGE, SETTLE_LATE_AFTER, evaluate, type Reads } from "../src/watchdog.js";
import { SETTLE_PERIOD } from "../src/exec/junior.js";

const AGENT = "0xC772F0ea992236dA71Fa30b8899D71B680866956" as const;
const U = 1_000_000n;
const now = 1_800_000_000n;
const healthy: Reads = {
  now,
  seniorLastUpdate: now - 3600n,
  seniorTotalAssets: 316n * U,
  seniorRealAssets: 316n * U + 40_000n,
  seniorIsAllocatorExpected: true,
  juniorAgent: AGENT,
  juniorIdle: 5n * U,
  juniorReserved: 0n,
  juniorLastSettle: now - 2n * 24n * 3600n,
  juniorPaused: false,
  juniorTotalAssets: 81n * U,
  agentGasWei: 500_000_000_000_000_000n,
  coverInProgress: 0n,
};
const codes = (r: Reads) => evaluate(r, AGENT).findings.filter((f) => f.level === "alert").map((f) => f.code);

describe("watchdog", () => {
  it("is quiet when every invariant holds", () => {
    const { findings, fallbacks } = evaluate(healthy, AGENT);
    expect(findings).toEqual([]);
    expect(fallbacks).toEqual([]);
  });
  it("alerts when the roles are not on the expected wallet", () => {
    expect(codes({ ...healthy, juniorAgent: "0x000000000000000000000000000000000000dEaD" })).toContain("JUNIOR_AGENT");
    expect(codes({ ...healthy, seniorIsAllocatorExpected: false })).toContain("SENIOR_ALLOCATOR");
  });
  it("treats a missed daily accrue as a dead Rotator and falls back", () => {
    const r = { ...healthy, seniorLastUpdate: now - HEARTBEAT_MAX_AGE - 1n };
    expect(codes(r)).toContain("ROTATOR_HEARTBEAT");
    expect(evaluate(r, AGENT).fallbacks.map((f) => f.kind)).toEqual(["accrueInterest"]);
  });
  it("gives the Rotator three hours to settle before taking over", () => {
    const dueNow = { ...healthy, juniorLastSettle: now - SETTLE_PERIOD - 3600n };
    expect(codes(dueNow)).not.toContain("SETTLE_LATE");
    expect(evaluate(dueNow, AGENT).findings.map((f) => f.code)).toContain("SETTLE_DUE");
    const late = { ...healthy, juniorLastSettle: now - SETTLE_PERIOD - SETTLE_LATE_AFTER - 1n };
    expect(codes(late)).toContain("SETTLE_LATE");
    expect(evaluate(late, AGENT).fallbacks.map((f) => f.kind)).toEqual(["settle"]);
  });
  it("alerts on junior reserve shortfall and senior real below book", () => {
    expect(codes({ ...healthy, juniorIdle: 1n * U, juniorReserved: 2n * U })).toContain("JUNIOR_RESERVE");
    expect(codes({ ...healthy, seniorRealAssets: 310n * U })).toContain("SENIOR_REAL_BELOW_BOOK");
    expect(codes({ ...healthy, seniorRealAssets: 315n * U + 500_000n })).not.toContain("SENIOR_REAL_BELOW_BOOK");
  });
  it("warns, not alerts, on low gas and paused deposits", () => {
    const f = evaluate({ ...healthy, agentGasWei: 1n, juniorPaused: true }, AGENT).findings;
    expect(f.map((x) => x.code).sort()).toEqual(["AGENT_GAS", "JUNIOR_PAUSED"]);
    expect(f.every((x) => x.level === "warn")).toBe(true);
  });
});
