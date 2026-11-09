import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Address, Hex } from "viem";

// ---------------------------------------------------------------------------
// Types shared across the keeper
// ---------------------------------------------------------------------------

/** Allocation key: a Morpho Blue market id, "felix", or "idle". */
export type AllocKey = Hex | "felix" | "idle";

export interface TargetEntry {
  key: AllocKey;
  label: string;
  weight: number;
}

export interface CapEntry {
  /** Absolute cap in USDC (whole units, not base units). */
  absoluteCap: number;
  /** Relative cap as a fraction of vault total assets (0..1). */
  relativeCap: number;
}

export interface Constraints {
  minIdle: number;
  minFelix: number;
  maxShareOfMarketSupply: number;
  maxShareOfFelixAssets: number;
  maxUtilization: number;
  maxSupplyApy: number;
  rateTilt: number;
  maxTiltMultiplier: number;
  minTiltMultiplier: number;
  minDeltaFraction: number;
  maxClipFraction: number;
}

export interface Economics {
  marginFactor: number;
  slippagePenalty: number;
  gasPerAction: number;
  fallbackGasPriceGwei: number;
  fallbackHypePriceUsd: number;
}

export interface SeniorConfig {
  chainId: number;
  rpcUrl: string;
  usdc: Address;
  usdcDecimals: number;
  morphoBlue: Address;
  morphoApi: string;
  hyperlendApi: string;
  vault: Address | "0xTODO";
  /** JuniorVault. Skipped entirely while a placeholder. */
  junior: Address | "0xTODO";
  /** ORPH token. Price sampling is skipped while a placeholder. */
  orph: Address | "0xTODO";
  /** Uniswap v4 pool id (bytes32). Computed from the PoolKey when a placeholder. */
  poolId: Hex | "0xTODO";
  uniswapStateView: Address;
  orphPool: { fee: number; tickSpacing: number; hooks: Address };
  stakeRate: { usdPerAsset: number; twapWindowDays: number; sampleRetentionDays: number };
  adapters: {
    morphoMarketV1: Address | "0xTODO";
    morphoVaultV1: Address | "0xTODO";
  };
  /** Expected senior maxRate (per-second WAD). Drift raises an alert and fails the run. */
  expectedMaxRate: string;
  /** Expected liquidity adapter. Falls back to adapters.morphoVaultV1 while a placeholder. */
  felixAdapter?: Address | "0xTODO";
  felix: { address: Address; label: string };
  targets: TargetEntry[];
  excludedMarkets: Hex[];
  constraints: Constraints;
  dryRunCaps: Record<string, CapEntry>;
  economics: Economics;
}

export interface RunOptions {
  dryRun: boolean;
  weekly: boolean;
  fixturePath?: string;
  configPath: string;
  opsDir: string;
  rpcUrl: string;
  agentPrivateKey?: Hex;
  now: Date;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

const here = dirname(fileURLToPath(import.meta.url));
export const keeperRoot = resolve(here, "..");

export const PLACEHOLDER = "0xTODO";

export function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return value === PLACEHOLDER || !/^0x[0-9a-fA-F]{40}$/.test(value);
}

/** True when any address needed to broadcast is still a placeholder. */
export function hasPlaceholders(cfg: SeniorConfig): string[] {
  const missing: string[] = [];
  if (isPlaceholder(cfg.vault)) missing.push("vault");
  if (isPlaceholder(cfg.adapters.morphoMarketV1)) missing.push("adapters.morphoMarketV1");
  if (isPlaceholder(cfg.adapters.morphoVaultV1)) missing.push("adapters.morphoVaultV1");
  return missing;
}

export function loadConfig(path = resolve(keeperRoot, "config/senior.json")): SeniorConfig {
  const raw = JSON.parse(readFileSync(path, "utf8")) as SeniorConfig;
  validateConfig(raw);
  return raw;
}

export function validateConfig(cfg: SeniorConfig): void {
  const total = cfg.targets.reduce((s, t) => s + t.weight, 0);
  if (Math.abs(total - 1) > 1e-6) {
    throw new Error(`target weights must sum to 1, got ${total}`);
  }
  const keys = new Set(cfg.targets.map((t) => t.key));
  if (!keys.has("idle")) throw new Error("targets must include idle");
  if (!keys.has("felix")) throw new Error("targets must include felix");
  const idle = cfg.targets.find((t) => t.key === "idle")!;
  if (idle.weight < cfg.constraints.minIdle - 1e-9) {
    throw new Error("idle target below minIdle");
  }
  const felix = cfg.targets.find((t) => t.key === "felix")!;
  if (felix.weight < cfg.constraints.minFelix - 1e-9) {
    throw new Error("felix target below minFelix");
  }
  if (cfg.constraints.maxClipFraction <= 0 || cfg.constraints.maxClipFraction > 1) {
    throw new Error("maxClipFraction must be in (0, 1]");
  }
  if (cfg.economics.marginFactor < 1) throw new Error("marginFactor must be >= 1");
}

/** Tiny .env loader so the keeper has no dotenv dependency. Never logs values. */
export function loadDotEnv(path = resolve(keeperRoot, ".env")): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function parseArgs(argv: string[], env: NodeJS.ProcessEnv = process.env, now = new Date()): RunOptions {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith("--")) continue;
    const [k, v] = a.slice(2).split("=", 2);
    if (v !== undefined) values.set(k!, v);
    else if (argv[i + 1] && !argv[i + 1]!.startsWith("--") && ["fixture", "config", "ops-dir"].includes(k!)) {
      values.set(k!, argv[++i]!);
    } else flags.add(k!);
  }

  const live = env.LIVE === "1" && !flags.has("dry-run");
  const fixturePath = values.get("fixture") ?? env.STATE_FIXTURE;
  // Accept the key with or without the 0x prefix; anything else is treated as missing (and reported, never echoed).
  const rawPk = env.AGENT_PRIVATE_KEY?.trim().replace(/^["']|["']$/g, "");
  const pk = rawPk && /^[0-9a-fA-F]{64}$/.test(rawPk) ? `0x${rawPk}` : rawPk;
  if (rawPk && !(pk && /^0x[0-9a-fA-F]{64}$/.test(pk))) {
    console.error(`AGENT_PRIVATE_KEY is set but malformed (length ${rawPk.length}, starts with ${rawPk.slice(0, 2)}); expected 0x + 64 hex characters`);
  }

  return {
    dryRun: !live,
    weekly: flags.has("weekly"),
    fixturePath: fixturePath ? resolve(keeperRoot, fixturePath) : undefined,
    configPath: resolve(keeperRoot, values.get("config") ?? "config/senior.json"),
    opsDir: resolve(keeperRoot, values.get("ops-dir") ?? env.OPS_DIR ?? "ops"),
    rpcUrl: env.RPC_URL?.trim() || "https://rpc.hyperliquid.xyz/evm",
    agentPrivateKey: pk && /^0x[0-9a-fA-F]{64}$/.test(pk) ? (pk as Hex) : undefined,
    now,
  };
}

/** Sunday 00:xx UTC. The GitHub Action runs hourly, so the hour bucket is enough. */
export function isWeeklyCloseWindow(now: Date): boolean {
  return now.getUTCDay() === 0 && now.getUTCHours() === 0;
}
