import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { encodeAbiParameters, keccak256, zeroAddress, type PublicClient } from "viem";
import { Q96, pruneSamples, sqrtPriceX96ToOrphPerHype, stakePerAsset, twap, type PriceSample } from "../src/engine/twap.js";
import { orphPoolId, readSamples, resolvePoolId, sampleOrphPrice, summariseSamples } from "../src/data/orph.js";
import { poolKeyAbi } from "../src/abi/uniswapV4.js";
import { cfg } from "./helpers.js";

const ORPH = "0x3000000000000000000000000000000000000001";

describe("ORPH price: sqrtPriceX96 conversion", () => {
  it("2^96 means exactly 1 ORPH per HYPE", () => {
    expect(sqrtPriceX96ToOrphPerHype(Q96)).toBe(1);
  });

  it("scales quadratically: 2 * 2^96 means 4 ORPH per HYPE, 2^96 / 2 means 0.25", () => {
    expect(sqrtPriceX96ToOrphPerHype(2n * Q96)).toBe(4);
    expect(sqrtPriceX96ToOrphPerHype(Q96 / 2n)).toBe(0.25);
  });

  it("handles a realistic value: sqrt(2500) * 2^96 is about 2500 ORPH per HYPE", () => {
    const sqrt = BigInt(Math.round(Math.sqrt(2500) * 2 ** 48)) * 2n ** 48n;
    expect(sqrtPriceX96ToOrphPerHype(sqrt)).toBeCloseTo(2500, 3);
    expect(sqrtPriceX96ToOrphPerHype(0n)).toBe(0);
  });
});

describe("ORPH price: TWAP weighting", () => {
  const s = (timestamp: number, orphUsd: number): PriceSample => ({ timestamp, sqrtPriceX96: "0", orphPerHype: 1, hypeUsd: 1, orphUsd });
  const H = 3600;
  const now = 1_000_000;

  it("weights each sample by how long it held, not by count", () => {
    // $1 held for 3 hours, then $2 held for 1 hour: TWAP = (3 + 2) / 4 = 1.25; simple mean would be 1.5
    const res = twap([s(now - 4 * H, 1), s(now - 1 * H, 2)], now, 7 * 86400)!;
    expect(res.twap).toBeCloseTo(1.25, 12);
    expect(res.sampleCount).toBe(2);
  });

  it("clips the window: a sample before the window only counts from the window start", () => {
    // sample at -10h holds $1 until -1h, then $3 for the last hour, window = 4h
    const res = twap([s(now - 10 * H, 1), s(now - 1 * H, 3)], now, 4 * H)!;
    // 3 hours at $1 plus 1 hour at $3 over 4 hours
    expect(res.twap).toBeCloseTo(1.5, 12);
  });

  it("ignores samples outside the window entirely and returns null when none apply", () => {
    expect(twap([], now, 7 * 86400)).toBeNull();
    // only sample is in the future relative to now
    expect(twap([s(now + H, 1)], now, 7 * 86400)).toBeNull();
    const res = twap([s(now - 30 * 86400, 100), s(now - 2 * H, 2)], now, 7 * 86400)!;
    // the old sample holds $100 until -2h; clipped to the 7 day window start it still contributes
    expect(res.twap).toBeGreaterThan(2);
    expect(res.sampleCount).toBe(2);
  });

  it("derives stakePerAsset = floor(0.20 / twap * 1e18) in ORPH wei per USDC", () => {
    expect(stakePerAsset(0.2, 0.05)).toBe(4n * 10n ** 18n);
    expect(stakePerAsset(0.2, 0.2)).toBe(10n ** 18n);
    // 0.2 / 0.03 = 6.666..., floor in wei
    expect(stakePerAsset(0.2, 0.03)).toBe(6666666666666666666n);
    expect(stakePerAsset(0.2, 0)).toBe(0n);
  });

  it("prunes samples older than the retention window", () => {
    const kept = pruneSamples([s(now - 31 * 86400, 1), s(now - 29 * 86400, 1), s(now, 1)], now, 30 * 86400);
    expect(kept.length).toBe(2);
  });
});

describe("ORPH price: pool id and sampling", () => {
  it("poolId = keccak256(abi.encode(PoolKey)) with native HYPE as currency0 and derives it when the config is a placeholder", () => {
    const c = cfg();
    c.orph = ORPH;
    const expected = keccak256(
      encodeAbiParameters([poolKeyAbi], [{ currency0: zeroAddress, currency1: ORPH, fee: 10000, tickSpacing: 200, hooks: zeroAddress }]),
    );
    expect(orphPoolId(c)).toBe(expected);
    expect(resolvePoolId(c).poolId).toBe(expected);
    c.poolId = `0x${"ab".repeat(32)}`;
    const r = resolvePoolId(c);
    expect(r.poolId).toBe(c.poolId);
    expect(r.warning).toMatch(/does not match/);
  });

  it("skips while orph is a placeholder", async () => {
    const { result } = await sampleOrphPrice({ cfg: cfg(), opsDir: mkdtempSync(join(tmpdir(), "orph-")), hypeUsd: 30, nowTs: 1_000_000 });
    expect(result.enabled).toBe(false);
  });

  it("samples the pool, appends to price-samples.jsonl and produces the proposal line", async () => {
    const c = cfg();
    c.orph = ORPH;
    const ops = mkdtempSync(join(tmpdir(), "orph-"));
    const client = {
      readContract: async (args: { functionName: string }) => {
        if (args.functionName !== "getSlot0") throw new Error("unexpected");
        // 600 ORPH per HYPE
        return [BigInt(Math.round(Math.sqrt(600) * 2 ** 48)) * 2n ** 48n, 63_900, 0, 10000];
      },
    } as unknown as PublicClient;
    const t0 = 1_000_000;
    const a = await sampleOrphPrice({ cfg: c, opsDir: ops, client, hypeUsd: 30, nowTs: t0 });
    const b = await sampleOrphPrice({ cfg: c, opsDir: ops, client, hypeUsd: 36, nowTs: t0 + 3600 });
    expect(a.result.sample!.orphUsd).toBeCloseTo(0.05, 6);
    expect(b.result.sample!.orphUsd).toBeCloseTo(0.06, 6);
    expect(readSamples(ops).length).toBe(2);
    // at t0 + 1h the first sample held for the whole hour so far, the second has zero duration
    expect(b.result.twap7d).toBeCloseTo(0.05, 6);
    const later = summariseSamples(c, readSamples(ops), t0 + 2 * 3600);
    expect(later.twap7d).toBeCloseTo(0.055, 6);
    expect(later.sampleCount).toBe(2);
    expect(later.proposalLine).toMatch(/^stake rate proposal: proposeStakePerAsset\(\d+\)  \(7d TWAP \$0\.0550\d+, 2 samples\)$/);
    expect(BigInt(later.proposedStakePerAsset!)).toBe(stakePerAsset(0.2, later.twap7d!));
  });
});
