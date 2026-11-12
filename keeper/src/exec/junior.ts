import { encodeFunctionData, parseAbi, type Address, type Hex, type PublicClient } from "viem";
import { isPlaceholder, type SeniorConfig } from "../config.js";
import { juniorAbi } from "../abi/junior.js";
import { vaultV2Abi } from "../abi/vaultV2.js";
import { erc20Abi } from "../abi/erc20.js";
import { sendCall, type SignerCtx } from "./send.js";
import { recallAll, touchFelix } from "./juniorDeploy.js";
import { TOO_SOON, isMissingFunction, isPanic, revertSelector } from "./errors.js";

const WAD = 10n ** 18n;
export const SETTLE_PERIOD = 7n * 24n * 3600n;
export const SETTLE_GRACE = 3600n;
/** JuniorVault.SETTLE_INTERVAL: settle() is allowed from lastSettle + this. */
export const SETTLE_INTERVAL = SETTLE_PERIOD - SETTLE_GRACE;
/** The settle sequence (touch, recall) starts on the first tick that is within this of the due second. */
export const SETTLE_LEAD = 3600n;
/** The keeper waits in-tick for the due second only when it is at most this far away (15 min: the whole Action job must fit its 30 min timeout with margin). */
export const SETTLE_MAX_WAIT = 900n;

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

/**
 * K4, every tick: junior.observeSenior() records senior's lowest share supply so an exit followed by a buy is not billed
 * as one exposure (L10). Permissionless. Sent only when the supply is below the recorded minimum, since otherwise the
 * call is a no-op; syncSenior below observes as well.
 */
export async function observeSenior(ctx: JuniorCtx): Promise<SyncResult> {
  const log = ctx.log ?? ((l: string) => console.log(l));
  if (!juniorEnabled(ctx.cfg) || isPlaceholder(ctx.cfg.vault) || !ctx.client) return { called: false, note: "placeholder or no client; observeSenior skipped" };
  let min: bigint;
  try {
    min = await ctx.client.readContract({ address: ctx.cfg.junior as Address, abi: juniorAbi, functionName: "seniorSupplyMin" });
  } catch (err) {
    if (!isMissingFunction(err)) throw err; // an RPC error is not "pre-fix": do not guess
    return { called: false, note: "junior has no seniorSupplyMin (pre-fix build); observeSenior skipped" };
  }
  const supply = await ctx.client.readContract({ address: ctx.cfg.vault as Address, abi: vaultV2Abi, functionName: "totalSupply" });
  if (supply >= min) {
    log(`observeSenior: senior supply ${supply} not below the recorded minimum ${min}, nothing to record`);
    return { called: false, note: "supply not below the recorded minimum; nothing to observe" };
  }
  if (ctx.dryRun) {
    log("observeSenior: would call junior.observeSenior() (dry-run)");
    return { called: false, note: "dry-run: observeSenior not sent" };
  }
  const hash = await sendCall(ctx, ctx.cfg.junior as Address, encodeFunctionData({ abi: juniorAbi, functionName: "observeSenior" }), "observeSenior");
  log(`observeSenior sent ${hash}`);
  return { called: true, txHash: hash, note: "observeSenior sent" };
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

const PRICE_UNIT = 10n ** 24n;
/** Safety bound for the felixExp scan; the array ends at the first out-of-bounds revert, so this is only reached on a bug. */
const MAX_FELIX_ENTRIES = 256;
const lostAssetsAbi = parseAbi(["function lostAssets() view returns (uint256)"]);

/** One Felix vault in junior's exposure snapshot, with Felix's `lostAssets` read now. */
export interface FelixEntry {
  lostBase: bigint;
  fraction: bigint;
  assetsRef: bigint;
  lost: bigint;
}

/**
 * Junior's own 1 ppm guard (JuniorVault._felixOwed, SeniorReceiveGate item 3): a Felix loss is booked and unbilled when
 * (lostAssets - lostBase) * fraction / 1e24 * 1e6 > assetsRef for any entry. Smaller bumps are Felix rounding.
 */
export function felixLossUnbilled(entries: FelixEntry[]): boolean {
  return entries.some((e) => e.lost > e.lostBase && ((e.lost - e.lostBase) * e.fraction) / PRICE_UNIT * 1_000_000n > e.assetsRef);
}

/**
 * K3, every tick: junior.snapFelixExposure() (agent key) keeps the Felix exposure current. Skipped while a Felix loss
 * is booked and unbilled (a snapshot then lets a flash deposit shrink the bill, L11 item 3) until a settle bills it,
 * and while senior holds nothing (the constructor's snapshot has fraction 0; the first real one needs funded senior).
 */
export async function snapFelix(ctx: JuniorCtx): Promise<SyncResult> {
  const log = ctx.log ?? ((l: string) => console.log(l));
  if (!juniorEnabled(ctx.cfg) || isPlaceholder(ctx.cfg.vault) || !ctx.client) return { called: false, note: "placeholder or no client; Felix snapshot skipped" };
  const c = ctx.client;
  const junior = ctx.cfg.junior as Address;
  const skip = (note: string): SyncResult => {
    log(`snapFelixExposure: skip (${note})`);
    return { called: false, note };
  };
  // A pre-fix junior has no snapshot at all. Any OTHER read error means the state is unknown: fail closed, no snapshot.
  try {
    await c.readContract({ address: junior, abi: juniorAbi, functionName: "felixExpSupply" });
  } catch (err) {
    if (isMissingFunction(err)) return skip("junior has no snapFelixExposure (pre-fix build)");
    return skip(`felixExpSupply read failed (${(err as Error).message.split("\n")[0]}); not snapshotting on unknown state`);
  }
  if ((await c.readContract({ address: ctx.cfg.vault as Address, abi: vaultV2Abi, functionName: "totalSupply" })) === 0n) return skip("senior is not funded yet");
  // Read felixExp(i) until the array-end revert. Any other failure, or no end in sight, skips the tick.
  const entries: FelixEntry[] = [];
  for (let i = 0; ; i++) {
    if (i >= MAX_FELIX_ENTRIES) return skip(`felixExp has no end within ${MAX_FELIX_ENTRIES} entries; not snapshotting`);
    let e: readonly [Address, bigint, bigint, bigint];
    try {
      e = await c.readContract({ address: junior, abi: juniorAbi, functionName: "felixExp", args: [BigInt(i)] });
    } catch (err) {
      // Past the end of the array: a public array getter reverts with NO data there (measured on the fork), and a Panic(0x32)
      // is accepted too. felixExpSupply was read above, so the function exists; a transport error or a revert that carries
      // other data is NOT the end and skips the tick.
      if (isPanic(err, 0x32n) || isMissingFunction(err)) break;
      return skip(`felixExp(${i}) read failed (${(err as Error).message.split("\n")[0]}); not snapshotting on unknown state`);
    }
    const lost = await c.readContract({ address: e[0], abi: lostAssetsAbi, functionName: "lostAssets" });
    entries.push({ lostBase: e[1], fraction: e[2], assetsRef: e[3], lost });
  }
  if (felixLossUnbilled(entries)) return skip("a Felix loss is booked and unbilled; waiting for the settle that bills it");
  if (ctx.dryRun) {
    log("snapFelixExposure: would call junior.snapFelixExposure() (dry-run)");
    return { called: false, note: "dry-run: snapFelixExposure not sent" };
  }
  const hash = await sendCall(ctx, junior, encodeFunctionData({ abi: juniorAbi, functionName: "snapFelixExposure" }), "snapFelixExposure");
  log(`snapFelixExposure sent ${hash}`);
  return { called: true, txHash: hash, note: "snapFelixExposure sent" };
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
  /** Due second of this settle (set on a settle tick). */
  dueTs?: string;
  /** The settle was already done by someone else (lastSettle moved): success, not failure. */
  alreadySettled?: boolean;
  /** The settle tick failed (touch, recall, wait or settle). The tick is still a settle tick: nothing is redeployed. */
  error?: string;
  /** The settle tick in the order it ran (or would run): touch, recall, settle. */
  steps?: string[];
}

/**
 * Weekly, part 1 (start of the junior section): check junior idle USDC covers maturing exits, decide whether this tick
 * is a settle tick and, if so, touch Felix and recall every position. Never throws once the tick is known to be a settle
 * tick: a failure lands in `error` with `settleDue` still true, so the caller redeploys nothing.
 */
export async function juniorWeeklyPrepare(ctx: JuniorCtx): Promise<JuniorWeeklyResult> {
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
  // settleDue = "this tick is a settle tick" (the caller redeploys nothing until settle has happened, whatever happens below).
  result.settleDue = settleTickDue(nowTs, lastSettle);
  if (!result.settleDue) {
    result.note = `settle not due (lastSettle ${lastSettle})`;
    log(`junior weekly: ${result.note}`);
    return result;
  }
  result.dueTs = (lastSettle + SETTLE_INTERVAL).toString();
  const steps: string[] = [];
  result.steps = steps;
  const sctx = { cfg: ctx.cfg, dryRun: ctx.dryRun, client: ctx.client, signer: ctx.signer, agentPrivateKey: ctx.agentPrivateKey, log };
  // 1. Touch Felix so a pending bad debt is booked in lostAssets, 2. recall every position to idle, so cover and
  // matured exits are paid in full. Both happen before the due second. The touch runs first of everything on the tick.
  if (!isPlaceholder(ctx.cfg.vault)) {
    const errors: string[] = [];
    try {
      const touch = await touchFelix(sctx);
      steps.push(`1 touch: ${touch.note}`);
    } catch (err) {
      errors.push(`touch failed: ${(err as Error).message.split("\n")[0]}`);
      steps.push(`1 touch: ${errors[errors.length - 1]}`);
    }
    // The recall is the safety property, so it is attempted even when the touch failed.
    try {
      const recall = await recallAll(sctx, { seniorShares: false });
      steps.push(`2 recall: ${recall.note}`);
      result.recall = recall.note;
      if (recall.txHashes.length) result.recallTx = recall.txHashes[recall.txHashes.length - 1];
      errors.push(...recall.errors);
    } catch (err) {
      errors.push(`recall failed: ${(err as Error).message.split("\n")[0]}`);
      steps.push(`2 recall: ${errors[errors.length - 1]}`);
    }
    if (errors.length) {
      result.error = `settle tick failed before settle: ${errors.join("; ")}`;
      result.note = result.error;
      log(`junior weekly: ${result.error}`);
    }
  }
  return result;
}

/**
 * Weekly, part 2: wait for the due second (only when it is at most SETTLE_MAX_WAIT away) and call settle(). A
 * `lastSettle` newer than the one the tick started with means someone else settled: success. Never throws.
 */
export async function juniorWeeklyFinish(ctx: JuniorCtx, result: JuniorWeeklyResult): Promise<JuniorWeeklyResult> {
  const log = ctx.log ?? ((l: string) => console.log(l));
  if (!result.settleDue || result.error || !result.dueTs || !ctx.client) return result;
  const steps = (result.steps ??= []);
  const dueTs = BigInt(result.dueTs);
  const startSettle = BigInt(result.lastSettle!);
  const nowTs = ctx.nowTs ?? BigInt(Math.floor(Date.now() / 1000));
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
  const c = ctx.client;
  const junior = ctx.cfg.junior as Address;
  const settledMeanwhile = async () => (await c.readContract({ address: junior, abi: juniorAbi, functionName: "lastSettle" })) > startSettle;
  try {
    // Wait for CHAIN time (what the contract compares), not wall time.
    const sleep = ctx.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
    const giveUp = Date.now() + Number(SETTLE_MAX_WAIT + 60n) * 1000;
    for (;;) {
      const chainTs = (await c.getBlock()).timestamp;
      if (chainTs >= dueTs) break;
      if (!ctx.sleep && Date.now() > giveUp) throw new Error("chain time did not reach the settle due second");
      await sleep(Math.min(Number(dueTs - chainTs), 5) * 1000);
    }
    if (await settledMeanwhile()) {
      result.alreadySettled = true;
    } else {
      try {
        result.settleTx = await send(ctx, "settle");
      } catch (err) {
        // Someone else settled first (a TooSoon simulate, or a revert at send): success when lastSettle moved.
        if (await settledMeanwhile()) result.alreadySettled = true;
        else throw revertSelector(err) === TOO_SOON ? new Error("settle refused with TooSoon but lastSettle did not move") : err;
      }
    }
    steps.push(result.alreadySettled ? "3 settle: already settled by someone else" : "3 settle: sent at the due second");
    result.note = result.alreadySettled ? "settle already done by someone else" : "settle sent";
    log(`junior weekly: ${result.note}${result.settleTx ? ` ${result.settleTx}` : ""}`);
  } catch (err) {
    result.error = `settle failed: ${(err as Error).message.split("\n")[0]}`;
    result.note = result.error;
    steps.push(`3 settle: ${result.error}`);
    log(`junior weekly: ${result.error}`);
  }
  return result;
}

/** Both parts back to back (tests, and any caller that needs no work in between). */
export async function juniorWeekly(ctx: JuniorCtx): Promise<JuniorWeeklyResult> {
  return juniorWeeklyFinish(ctx, await juniorWeeklyPrepare(ctx));
}
