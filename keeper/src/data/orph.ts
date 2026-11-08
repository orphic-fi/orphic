import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { encodeAbiParameters, keccak256, zeroAddress, type Address, type Hex, type PublicClient } from "viem";
import { isPlaceholder, type SeniorConfig } from "../config.js";
import { poolKeyAbi, stateViewAbi } from "../abi/uniswapV4.js";
import { pruneSamples, sqrtPriceX96ToOrphPerHype, stakePerAsset, twap, type PriceSample } from "../engine/twap.js";

/** poolId = keccak256(abi.encode(PoolKey{currency0, currency1, fee, tickSpacing, hooks})). */
export function orphPoolId(cfg: SeniorConfig): Hex {
  return keccak256(
    encodeAbiParameters(
      [poolKeyAbi],
      [{ currency0: zeroAddress, currency1: cfg.orph as Address, fee: cfg.orphPool.fee, tickSpacing: cfg.orphPool.tickSpacing, hooks: cfg.orphPool.hooks }],
    ),
  );
}

export function orphEnabled(cfg: SeniorConfig): boolean {
  return !isPlaceholder(cfg.orph);
}

/** Resolve the pool id: the config value when set, otherwise derived from the PoolKey. */
export function resolvePoolId(cfg: SeniorConfig): { poolId: Hex; warning?: string } {
  const derived = orphPoolId(cfg);
  const configured = cfg.poolId;
  if (!configured || configured === "0xTODO" || !/^0x[0-9a-fA-F]{64}$/.test(configured)) return { poolId: derived };
  if (configured.toLowerCase() !== derived.toLowerCase()) {
    return { poolId: configured, warning: `config poolId ${configured} does not match PoolKey-derived ${derived}; using config value` };
  }
  return { poolId: configured };
}

export async function readSlot0(client: PublicClient, stateView: Address, poolId: Hex): Promise<{ sqrtPriceX96: bigint; tick: number }> {
  const [sqrtPriceX96, tick] = await client.readContract({ address: stateView, abi: stateViewAbi, functionName: "getSlot0", args: [poolId] });
  return { sqrtPriceX96, tick };
}

// ---------------------------------------------------------------------------
// Sample store: ops/price-samples.jsonl
// ---------------------------------------------------------------------------

export function samplesPath(opsDir: string): string {
  return resolve(opsDir, "price-samples.jsonl");
}

export function readSamples(opsDir: string): PriceSample[] {
  const path = samplesPath(opsDir);
  if (!existsSync(path)) return [];
  const out: PriceSample[] = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      out.push(JSON.parse(t) as PriceSample);
    } catch {
      // skip a corrupt line rather than lose the whole record
    }
  }
  return out;
}

export function appendSample(opsDir: string, sample: PriceSample): void {
  mkdirSync(opsDir, { recursive: true });
  appendFileSync(samplesPath(opsDir), `${JSON.stringify(sample)}\n`);
}

export function rewriteSamples(opsDir: string, samples: PriceSample[]): void {
  mkdirSync(opsDir, { recursive: true });
  writeFileSync(samplesPath(opsDir), samples.map((s) => JSON.stringify(s)).join("\n") + (samples.length ? "\n" : ""));
}

// ---------------------------------------------------------------------------
// Tick step
// ---------------------------------------------------------------------------

export interface OrphPriceResult {
  enabled: boolean;
  poolId?: Hex;
  sample?: PriceSample;
  twap7d?: number | null;
  sampleCount: number;
  proposedStakePerAsset?: string;
  proposalLine?: string;
  note: string;
}

export interface OrphCtx {
  cfg: SeniorConfig;
  opsDir: string;
  client?: PublicClient;
  hypeUsd: number;
  nowTs: number;
  log?: (line: string) => void;
}

export async function sampleOrphPrice(ctx: OrphCtx): Promise<{ result: OrphPriceResult; warnings: string[] }> {
  const { cfg } = ctx;
  const warnings: string[] = [];
  if (!orphEnabled(cfg)) return { result: { enabled: false, sampleCount: 0, note: "orph is a placeholder; price sampling skipped" }, warnings };
  if (!ctx.client) return { result: { enabled: true, sampleCount: 0, note: "no RPC client; price sampling skipped" }, warnings };

  const { poolId, warning } = resolvePoolId(cfg);
  if (warning) warnings.push(warning);

  const slot0 = await readSlot0(ctx.client, cfg.uniswapStateView, poolId);
  const orphPerHype = sqrtPriceX96ToOrphPerHype(slot0.sqrtPriceX96);
  // orphPerHype is ORPH per 1 HYPE, so USD per ORPH = hypeUsd / orphPerHype.
  const orphUsd = orphPerHype > 0 ? ctx.hypeUsd / orphPerHype : 0;
  const sample: PriceSample = { timestamp: ctx.nowTs, sqrtPriceX96: slot0.sqrtPriceX96.toString(), tick: slot0.tick, orphPerHype, hypeUsd: ctx.hypeUsd, orphUsd };

  if (!(orphUsd > 0)) {
    warnings.push("ORPH pool returned a zero price; sample not recorded");
    return { result: { enabled: true, poolId, sample, sampleCount: readSamples(ctx.opsDir).length, note: "zero price; not recorded" }, warnings };
  }

  appendSample(ctx.opsDir, sample);
  const all = readSamples(ctx.opsDir);
  const kept = pruneSamples(all, ctx.nowTs, cfg.stakeRate.sampleRetentionDays * 86400);
  if (kept.length !== all.length) rewriteSamples(ctx.opsDir, kept);

  const result = summariseSamples(cfg, kept, ctx.nowTs);
  return { result: { ...result, enabled: true, poolId, sample, note: `ORPH $${orphUsd.toFixed(6)} (${orphPerHype.toFixed(4)} ORPH per HYPE at $${ctx.hypeUsd.toFixed(2)})` }, warnings };
}

export function summariseSamples(cfg: SeniorConfig, samples: PriceSample[], nowTs: number): Pick<OrphPriceResult, "twap7d" | "sampleCount" | "proposedStakePerAsset" | "proposalLine"> {
  const t = twap(samples, nowTs, cfg.stakeRate.twapWindowDays * 86400);
  if (!t) return { twap7d: null, sampleCount: 0 };
  const spa = stakePerAsset(cfg.stakeRate.usdPerAsset, t.twap);
  return {
    twap7d: t.twap,
    sampleCount: t.sampleCount,
    proposedStakePerAsset: spa.toString(),
    proposalLine: `stake rate proposal: proposeStakePerAsset(${spa.toString()})  (7d TWAP $${t.twap.toFixed(6)}, ${t.sampleCount} samples)`,
  };
}
