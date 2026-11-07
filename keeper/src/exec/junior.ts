import { createWalletClient, http, type Address, type Hex, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { isPlaceholder, type SeniorConfig } from "../config.js";
import { juniorAbi } from "../abi/junior.js";
import { vaultV2Abi } from "../abi/vaultV2.js";
import { erc20Abi } from "../abi/erc20.js";
import { assertCanBroadcast, hyperEvm } from "./send.js";

const WAD = 10n ** 18n;
export const SETTLE_PERIOD = 7n * 24n * 3600n;
export const SETTLE_GRACE = 3600n;

// ---------------------------------------------------------------------------
// Pure math (unit tested)
// ---------------------------------------------------------------------------

/**
 * Hours until the cover in progress is fully recognised by the senior vault.
 * H = coverInProgress / (totalAssets * maxRate * 3600 / 1e18). maxRate is the
 * senior vault's per-second WAD rate cap. Both amounts in the same unit.
 * Returns 0 when there is no cover in progress and Infinity when the rate is 0.
 */
export function hoursToRecognition(coverInProgress: bigint, totalAssets: bigint, maxRate: bigint): number {
  if (coverInProgress <= 0n) return 0;
  const perHour = (totalAssets * maxRate * 3600n) / WAD;
  if (perHour <= 0n) return Infinity;
  return Number(coverInProgress) / Number(perHour);
}

/** USDC (6 decimals) owed to maturing exits: shares * pricePerShare / 1e18 / 1e12. */
export function owedToExits(pendingExitShares: bigint, pricePerShare: bigint): bigint {
  return (pendingExitShares * pricePerShare) / WAD / 10n ** 12n;
}

/** Shortfall in USDC base units, 0 when the junior idle balance covers what matures. */
export function exitShortfall(juniorIdle: bigint, owed: bigint): bigint {
  return owed > juniorIdle ? owed - juniorIdle : 0n;
}

/** settle() is due once block.timestamp >= lastSettle + 7 days - 1 hour. */
export function settleDue(nowTs: bigint, lastSettle: bigint): boolean {
  return nowTs >= lastSettle + SETTLE_PERIOD - SETTLE_GRACE;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export interface JuniorStatus {
  enabled: boolean;
  junior?: Address;
  coverInProgress?: string;
  coverInProgressUsdc?: number;
  maxRate?: string;
  seniorTotalAssets?: string;
  hoursToRecognition?: number;
  note: string;
}

export interface JuniorCtx {
  cfg: SeniorConfig;
  dryRun: boolean;
  client?: PublicClient;
  agentPrivateKey?: Hex;
  /** Senior total assets in USDC whole units, used when the senior vault is a placeholder. */
  seniorTotalAssetsFallback?: number;
  nowTs?: bigint;
  log?: (line: string) => void;
}

export function juniorEnabled(cfg: SeniorConfig): boolean {
  return !isPlaceholder(cfg.junior);
}

export async function readJuniorStatus(ctx: JuniorCtx): Promise<JuniorStatus> {
  const { cfg, client } = ctx;
  if (!juniorEnabled(cfg)) return { enabled: false, note: "junior is a placeholder; skipped" };
  if (!client) return { enabled: true, junior: cfg.junior as Address, note: "no RPC client; junior reads skipped" };
  const junior = cfg.junior as Address;
  const scale = 10n ** BigInt(cfg.usdcDecimals);

  const cover = await client.readContract({ address: junior, abi: juniorAbi, functionName: "coverInProgress" });
  let maxRate = 0n;
  let total = BigInt(Math.round((ctx.seniorTotalAssetsFallback ?? 0) * Number(scale)));
  if (!isPlaceholder(cfg.vault)) {
    const vault = cfg.vault as Address;
    [maxRate, total] = await Promise.all([
      client.readContract({ address: vault, abi: vaultV2Abi, functionName: "maxRate" }),
      client.readContract({ address: vault, abi: vaultV2Abi, functionName: "totalAssets" }),
    ]);
  }
  const hours = hoursToRecognition(cover, total, maxRate);
  return {
    enabled: true,
    junior,
    coverInProgress: cover.toString(),
    coverInProgressUsdc: Number(cover) / Number(scale),
    maxRate: maxRate.toString(),
    seniorTotalAssets: total.toString(),
    hoursToRecognition: hours,
    note: coverLine(Number(cover) / Number(scale), hours),
  };
}

export function coverLine(coverUsdc: number, hours: number): string {
  const h = hours === Infinity ? "unknown (maxRate is 0)" : hours.toFixed(1);
  return `cover in progress: ${coverUsdc.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC, about ${coverUsdc > 0 ? h : 0} hours to full recognition`;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

async function send(ctx: JuniorCtx, functionName: "syncSenior" | "settle"): Promise<Hex> {
  assertCanBroadcast(ctx.cfg, ctx.agentPrivateKey, !ctx.dryRun);
  const account = privateKeyToAccount(ctx.agentPrivateKey!);
  const wallet = createWalletClient({ account, chain: hyperEvm, transport: http(ctx.cfg.rpcUrl) });
  const { request } = await ctx.client!.simulateContract({ account, address: ctx.cfg.junior as Address, abi: juniorAbi, functionName, chain: hyperEvm });
  const hash = await wallet.writeContract(request);
  await ctx.client!.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 120_000 });
  return hash;
}

export interface SyncResult {
  called: boolean;
  txHash?: Hex;
  note: string;
}

/** Hourly: permissionless junior.syncSenior() so newly deposited senior shares become covered. */
export async function syncSenior(ctx: JuniorCtx): Promise<SyncResult> {
  const log = ctx.log ?? ((l: string) => console.log(l));
  if (!juniorEnabled(ctx.cfg)) {
    log("syncSenior: junior is a placeholder; skipped");
    return { called: false, note: "junior placeholder; skipped" };
  }
  if (ctx.dryRun) {
    log("syncSenior: would call junior.syncSenior() (dry-run)");
    return { called: false, note: "dry-run: syncSenior not sent" };
  }
  const hash = await send(ctx, "syncSenior");
  log(`syncSenior sent ${hash}`);
  return { called: true, txHash: hash, note: "syncSenior sent" };
}

export interface JuniorWeeklyResult {
  checked: boolean;
  pendingExitShares?: string;
  pricePerShare?: string;
  owedUsdc?: number;
  juniorIdleUsdc?: number;
  shortfallUsdc?: number;
  warning?: string;
  lastSettle?: string;
  settleDue?: boolean;
  settleTx?: Hex;
  note: string;
}

/**
 * Weekly: check junior idle USDC covers maturing exits, warn on a shortfall
 * (the agent must bring funds back via junior.execute; not implemented here),
 * then call settle() when lastSettle + 7 days - 1 hour has passed.
 */
export async function juniorWeekly(ctx: JuniorCtx): Promise<JuniorWeeklyResult> {
  const log = ctx.log ?? ((l: string) => console.log(l));
  if (!juniorEnabled(ctx.cfg)) {
    log("junior weekly: junior is a placeholder; skipped");
    return { checked: false, note: "junior placeholder; skipped" };
  }
  if (!ctx.client) return { checked: false, note: "no RPC client; junior weekly skipped" };
  const junior = ctx.cfg.junior as Address;
  const scale = Number(10n ** BigInt(ctx.cfg.usdcDecimals));

  const [pending, pps, idle, lastSettle] = await Promise.all([
    ctx.client.readContract({ address: junior, abi: juniorAbi, functionName: "pendingExitShares" }),
    ctx.client.readContract({ address: junior, abi: juniorAbi, functionName: "pricePerShare" }),
    ctx.client.readContract({ address: ctx.cfg.usdc, abi: erc20Abi, functionName: "balanceOf", args: [junior] }),
    ctx.client.readContract({ address: junior, abi: juniorAbi, functionName: "lastSettle" }),
  ]);
  const owed = owedToExits(pending, pps);
  const shortfall = exitShortfall(idle, owed);
  const result: JuniorWeeklyResult = {
    checked: true,
    pendingExitShares: pending.toString(),
    pricePerShare: pps.toString(),
    owedUsdc: Number(owed) / scale,
    juniorIdleUsdc: Number(idle) / scale,
    shortfallUsdc: Number(shortfall) / scale,
    lastSettle: lastSettle.toString(),
    note: "",
  };
  if (shortfall > 0n) {
    result.warning = `WARNING: junior idle USDC ${result.juniorIdleUsdc} is short of maturing exits ${result.owedUsdc} by ${result.shortfallUsdc} USDC; bring funds back via junior.execute before settle`;
    log(result.warning);
  } else {
    log(`junior exits covered: owed ${result.owedUsdc} USDC, idle ${result.juniorIdleUsdc} USDC`);
  }

  const nowTs = ctx.nowTs ?? BigInt(Math.floor(Date.now() / 1000));
  result.settleDue = settleDue(nowTs, lastSettle);
  if (!result.settleDue) {
    result.note = `settle not due (lastSettle ${lastSettle})`;
    log(`junior weekly: ${result.note}`);
    return result;
  }
  if (ctx.dryRun) {
    result.note = "dry-run: settle not sent";
    log("junior weekly: would call junior.settle() (dry-run)");
    return result;
  }
  result.settleTx = await send(ctx, "settle");
  result.note = "settle sent";
  log(`junior settle sent ${result.settleTx}`);
  return result;
}
