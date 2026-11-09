import { describe, expect, it } from "vitest";
import type { PublicClient } from "viem";
import { checkSeniorDrift, expectedLiquidityAdapter } from "../src/exec/drift.js";
import { cfg, placeholderCfg } from "./helpers.js";

const VAULT = "0x1000000000000000000000000000000000000001";
const FELIX_ADAPTER = "0x1000000000000000000000000000000000000003";
const OTHER = "0x1000000000000000000000000000000000000099";
const EXPECTED_RATE = 63419583967n;

function fakeClient(maxRate: bigint, liquidityAdapter: string) {
  return {
    readContract: async (args: { functionName: string }) => {
      if (args.functionName === "maxRate") return maxRate;
      if (args.functionName === "liquidityAdapter") return liquidityAdapter;
      throw new Error(`unexpected ${args.functionName}`);
    },
  } as unknown as PublicClient;
}

function liveCfg() {
  const c = placeholderCfg();
  c.vault = VAULT;
  c.adapters.morphoVaultV1 = FELIX_ADAPTER;
  return c;
}

describe("senior config drift", () => {
  it("expected maxRate in config is 63419583967 and the expected adapter falls back to the MorphoVaultV1 adapter", () => {
    expect(cfg().expectedMaxRate).toBe("63419583967");
    expect(expectedLiquidityAdapter(placeholderCfg())).toBeUndefined();
    expect(expectedLiquidityAdapter(liveCfg())).toBe(FELIX_ADAPTER);
    const c = liveCfg();
    c.felixAdapter = OTHER;
    expect(expectedLiquidityAdapter(c)).toBe(OTHER);
  });

  it("skips while the vault is a placeholder", async () => {
    const res = await checkSeniorDrift(placeholderCfg(), fakeClient(0n, OTHER), () => undefined);
    expect(res.checked).toBe(false);
    expect(res.alerts).toEqual([]);
  });

  it("clean case: no alerts when both match (address compare is case-insensitive)", async () => {
    const log: string[] = [];
    const res = await checkSeniorDrift(liveCfg(), fakeClient(EXPECTED_RATE, FELIX_ADAPTER.toUpperCase().replace("0X", "0x")), (l) => log.push(l));
    expect(res.checked).toBe(true);
    expect(res.alerts).toEqual([]);
    expect(log).toEqual([]);
  });

  it("maxRate drift raises exactly one alert with the expected wording", async () => {
    const log: string[] = [];
    const res = await checkSeniorDrift(liveCfg(), fakeClient(1n, FELIX_ADAPTER), (l) => log.push(l));
    expect(res.alerts).toEqual(["senior config drift: maxRate 1 (expected 63419583967)"]);
    expect(log[0]).toBe("WARNING: senior config drift: maxRate 1 (expected 63419583967)");
  });

  it("liquidityAdapter drift raises exactly one alert with the expected wording", async () => {
    const res = await checkSeniorDrift(liveCfg(), fakeClient(EXPECTED_RATE, OTHER), () => undefined);
    expect(res.alerts).toEqual([`senior config drift: liquidityAdapter ${OTHER} (expected ${FELIX_ADAPTER})`]);
  });

  it("both drifting raises both alerts", async () => {
    const res = await checkSeniorDrift(liveCfg(), fakeClient(0n, OTHER), () => undefined);
    expect(res.alerts.length).toBe(2);
    expect(res.alerts[0]).toMatch(/maxRate/);
    expect(res.alerts[1]).toMatch(/liquidityAdapter/);
  });
});
