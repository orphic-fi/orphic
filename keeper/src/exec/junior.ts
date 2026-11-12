import { encodeFunctionData, type Address, type Hex, type PublicClient } from "viem";
import { isPlaceholder, type SeniorConfig } from "../config.js";
import { juniorAbi } from "../abi/junior.js";
import { vaultV2Abi } from "../abi/vaultV2.js";
import { erc20Abi } from "../abi/erc20.js";
import { sendCall, type SignerCtx } from "./send.js";
import { recallAll, touchFelix } from "./juniorDeploy.js";

const WAD = 10n ** 18n;
export const SETTLE_PERIOD = 7n * 24n * 3600n;
export const SETTLE_GRACE = 3600n;
/** JuniorVault.SETTLE_INTERVAL: settle() is allowed from lastSettle + this. */
export const SETTLE_INTERVAL = SETTLE_PERIOD - SETTLE_GRACE;
/** The settle sequence (touch, recall) starts on the first tick that is within this of the due second. */
export const SETTLE_LEAD = 3600n;
/** The keeper waits in-tick for the due second only when it is at most this far away (fits a 30 min Action job). */
export const SETTLE_MAX_WAIT = 1200n;

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

/** True on the tick that must start the settle sequence: the due second is within SETTLE_LEAD, or already past. */
export function settleTickDue(nowTs: bigint, lastSettle: bigint): boolean {
  return nowTs + SETTLE_LEAD >= lastSettle + SETTLE_INTERVAL;
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

export interface JuniorCtx extends SignerCtx {
  /** Senior total assets in USDC whole units, used when the senior vault is a placeholder. */
  seniorTotalAssetsFallback?: number;
  nowTs?: bigint;
  log?: (line: string) => void;
  /** Injected in tests; real timers by default. */
  sleep?: (ms: number) => Promise<void>;
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
  return sendCall(ctx, ctx.cfg.junior as Address, encodeFunctionData({ abi: juniorAbi, functionName }), functionName);
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
  // Only worth a transaction when senior's share supply moved since junior last synced; otherwise the call is a no-op.
  if (ctx.client && !isPlaceholder(ctx.cfg.vault)) {
    const [base, supply] = await Promise.all([
      ctx.client.readContract({ address: ctx.cfg.junior as Address, abi: juniorAbi, functionName: "seniorSupplyBase" }),
      ctx.client.readContract({ address: ctx.cfg.vault as Address, abi: vaultV2Abi, functionName: "totalSupply" }),
    ]);
    if (base === supply) {
      log(`syncSenior: senior supply unchanged (${supply.toString()}), nothing to sync`);
      return { called: false, note: "senior supply unchanged; syncSenior not needed" };
    }
  }
  if (ctx.dryRun) {
    log("syncSenior: would call junior.syncSenior() (dry-run)");
    return { called: false, note: "dry-run: syncSenior not sent" };
  }
  const hash = await send(ctx, "syncSenior");
  log(`syncSenior sent ${hash}`);
  return { called: true, txHash: hash, note: "syncSenior sent" };
}

export const ACCRUE_EVERY = 23n * 3600n; // once a day, with an hour of slack for the hourly tick

/**
 * Pure: should the keeper nudge senior.accrueInterest()? Vault V2 mints junior's management-fee shares only when
 * someone touches the vault, so with no deposits a quiet week shows junior earning nothing until settle. One
 * permissionless call a day keeps the minted shares (and the UI) current. Skipped when nothing would be minted.
 */
export function shouldAccrue(i: { lastUpdate: bigint; now: bigint; pendingMgmtShares: bigint }): { due: boolean; reason: string } {
  if (i.pendingMgmtShares === 0n) return { due: false, reason: "no fee shares pending" };
  const since = i.now - i.lastUpdate;
  if (since < ACCRUE_EVERY) return { due: false, reason: `senior accrued ${(Number(since) / 3600).toFixed(1)}h ago` };
  return { due: true, reason: `senior last accrued ${(Number(since) / 3600).toFixed(1)}h ago, ${i.pendingMgmtShares.toString()} fee shares pending` };
}

/** Daily: senior.accrueInterest() so junior's fee shares are minted between settles. Permissionless. */
export async function accrueSenior(ctx: JuniorCtx): Promise<SyncResult> {
  const log = ctx.log ?? ((l: string) => console.log(l));
  if (!juniorEnabled(ctx.cfg) || isPlaceholder(ctx.cfg.vault) || !ctx.client) return { called: false, note: "placeholder or no client; accrue skipped" };
  const senior = ctx.cfg.vault as Address;
  const [lastUpdate, view] = await Promise.all([
    ctx.client.readContract({ address: senior, abi: vaultV2Abi, functionName: "lastUpdate" }),
    ctx.client.readContract({ address: senior, abi: vaultV2Abi, functionName: "accrueInterestView" }),
  ]);
  const now = ctx.nowTs ?? BigInt(Math.floor(Date.now() / 1000));
  const d = shouldAccrue({ lastUpdate: BigInt(lastUpdate), now, pendingMgmtShares: view[2] });
  if (!d.due) {
    log(`accrue: skip (${d.reason})`);
    return { called: false, note: d.reason };
  }
  if (ctx.dryRun) {
    log(`accrue: would call senior.accrueInterest() (${d.reason}) (dry-run)`);
    return { called: false, note: `dry-run: ${d.reason}` };
  }
  const hash = await sendCall(ctx, senior, encodeFunctionData({ abi: vaultV2Abi, functionName: "accrueInterest" }), "accrueInterest");
  log(`accrue: senior.accrueInterest() sent ${hash} (${d.reason})`);
  return { called: true, txHash: hash, note: `accrueInterest sent: ${d.reason}` };
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
  recall?: string;
  recallTx?: Hex;
  /** The settle tick in the order it ran (or would run): touch, recall, settle. */
  steps?: string[];
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
  // settleDue = "this tick runs the settle sequence" (the idle step then redeploys nothing until settle has happened).
  result.settleDue = settleTickDue(nowTs, lastSettle);
  if (!result.settleDue) {
    result.note = `settle not due (lastSettle ${lastSettle})`;
    log(`junior weekly: ${result.note}`);
    return result;
  }
  const dueTs = lastSettle + SETTLE_INTERVAL;
  const steps: string[] = [];
  result.steps = steps;
  const sctx = { cfg: ctx.cfg, dryRun: ctx.dryRun, client: ctx.client, signer: ctx.signer, agentPrivateKey: ctx.agentPrivateKey, log };
  // 1. Touch Felix so a pending bad debt is booked in lostAssets, 2. recall every position to idle, so cover and
  // matured exits are paid in full. Both happen before the due second; the hourly idle step redeploys after settle.
  if (!isPlaceholder(ctx.cfg.vault)) {
    const touch = await touchFelix(sctx);
    steps.push(`1 touch: ${touch.note}`);
    const recall = await recallAll(sctx, { seniorShares: false });
    steps.push(`2 recall: ${recall.note}`);
    result.recall = recall.note;
    if (recall.txHashes.length) result.recallTx = recall.txHashes[recall.txHashes.length - 1];
    if (recall.errors.length) throw new Error(`settle aborted, recall failed: ${recall.errors.join("; ")}`);
  }
  const wait = dueTs - nowTs;
  if (wait > SETTLE_MAX_WAIT) {
    steps.push(`3 settle: due in ${wait}s, more than ${SETTLE_MAX_WAIT}s away; the next tick settles`);
    result.note = `recalled; settle due in ${wait}s, next tick settles`;
    log(`junior weekly: ${result.note}`);
    return result;
  }
  if (ctx.dryRun) {
    steps.push(`3 settle: would wait ${wait > 0n ? wait : 0n}s for the due second, then call junior.settle() (dry-run)`);
    result.note = "dry-run: settle not sent";
    log("junior weekly: would call junior.settle() at the due second (dry-run)");
    return result;
  }
  // Wait for CHAIN time (what the contract compares), not wall time.
  const sleep = ctx.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const giveUp = Date.now() + Number(SETTLE_MAX_WAIT + 120n) * 1000;
  for (;;) {
    const chainTs = (await ctx.client.getBlock()).timestamp;
    if (chainTs >= dueTs) break;
    if (!ctx.sleep && Date.now() > giveUp) throw new Error("chain time did not reach the settle due second; the next tick settles");
    await sleep(Math.min(Number(dueTs - chainTs), 5) * 1000);
  }
  result.settleTx = await send(ctx, "settle");
  steps.push("3 settle: sent at the due second");
  result.note = "settle sent";
  log(`junior settle sent ${result.settleTx}`);
  return result;
}
