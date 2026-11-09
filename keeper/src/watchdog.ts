/**
 * Watchdog: the GitHub keeper's job once the Rotator runs on Circuit. Reads every invariant hourly, alerts when one
 * breaks, and falls back to the permissionless calls (accrueInterest, settle, syncSenior) when the Rotator has missed
 * them. It never needs a privileged role: anyone can call those three. The checks are pure functions over chain reads
 * so they are unit tested.
 */
import { createPublicClient, encodeFunctionData, http, type Address, type Hex, type PublicClient } from "viem";
import { isPlaceholder, loadConfig, loadDotEnv, parseArgs, type SeniorConfig } from "./config.js";
import { juniorAbi } from "./abi/junior.js";
import { vaultV2Abi } from "./abi/vaultV2.js";
import { erc20Abi } from "./abi/erc20.js";
import { adapterAbi } from "./abi/adapters.js";
import { hyperEvm } from "./exec/chain.js";
import { sendCall, type SignerCtx } from "./exec/send.js";
import { SETTLE_PERIOD, settleDue } from "./exec/junior.js";

export const HEARTBEAT_MAX_AGE = 26n * 3600n; // the Rotator accrues senior daily; 26h without it means it is not running
export const SETTLE_LATE_AFTER = 3n * 3600n; // settle is due Sunday 00:00 UTC; three hours late is an incident
export const MIN_AGENT_GAS_WEI = 50_000_000_000_000_000n; // 0.05 HYPE
export const REAL_VS_BOOK_TOLERANCE_BPS = 50n; // senior real assets may lag book by at most 0.5% (cover in progress)

export interface Reads {
  now: bigint;
  seniorLastUpdate: bigint;
  seniorTotalAssets: bigint;
  seniorRealAssets: bigint; // idle USDC + adapters' realAssets
  seniorIsAllocatorExpected: boolean;
  juniorAgent: Address;
  juniorIdle: bigint;
  juniorReserved: bigint;
  juniorLastSettle: bigint;
  juniorPaused: boolean;
  juniorTotalAssets: bigint;
  agentGasWei: bigint;
  coverInProgress: bigint;
}

export interface Finding {
  level: "alert" | "warn" | "info";
  code: string;
  message: string;
}

export interface Fallback {
  kind: "accrueInterest" | "settle";
  reason: string;
}

export function evaluate(r: Reads, expectedAgent: Address): { findings: Finding[]; fallbacks: Fallback[] } {
  const findings: Finding[] = [];
  const fallbacks: Fallback[] = [];
  const f = (level: Finding["level"], code: string, message: string) => findings.push({ level, code, message });

  // Who runs the vaults.
  if (r.juniorAgent.toLowerCase() !== expectedAgent.toLowerCase()) f("alert", "JUNIOR_AGENT", `junior.agent is ${r.juniorAgent}, expected ${expectedAgent}`);
  if (!r.seniorIsAllocatorExpected) f("alert", "SENIOR_ALLOCATOR", `${expectedAgent} is not an allocator on senior`);
  if (r.agentGasWei < MIN_AGENT_GAS_WEI) f("warn", "AGENT_GAS", `agent wallet holds ${(Number(r.agentGasWei) / 1e18).toFixed(4)} HYPE on HyperEVM, below ${Number(MIN_AGENT_GAS_WEI) / 1e18}`);

  // Heartbeat: the Rotator's daily accrue touches senior.lastUpdate. Deposits and withdrawals touch it too, so a quiet
  // vault with a dead Rotator is exactly the case this catches.
  const sinceUpdate = r.now - r.seniorLastUpdate;
  if (sinceUpdate > HEARTBEAT_MAX_AGE) {
    f("alert", "ROTATOR_HEARTBEAT", `senior last accrued ${(Number(sinceUpdate) / 3600).toFixed(1)}h ago; the Rotator should have called accrueInterest within 24h`);
    fallbacks.push({ kind: "accrueInterest", reason: "heartbeat missed" });
  }

  // Settle: due weekly; late means the Rotator missed the Sunday tick.
  if (settleDue(r.now, r.juniorLastSettle)) {
    const late = r.now - (r.juniorLastSettle + SETTLE_PERIOD);
    if (late > SETTLE_LATE_AFTER) {
      f("alert", "SETTLE_LATE", `junior settle is ${(Number(late) / 3600).toFixed(1)}h overdue`);
      fallbacks.push({ kind: "settle", reason: `settle ${(Number(late) / 3600).toFixed(1)}h overdue` });
    } else {
      f("info", "SETTLE_DUE", `settle due, within the ${Number(SETTLE_LATE_AFTER) / 3600}h window the Rotator has to run it`);
    }
  }

  // Solvency of junior's promises: priced exits must be covered by idle USDC.
  if (r.juniorIdle < r.juniorReserved) f("alert", "JUNIOR_RESERVE", `junior idle ${fmt(r.juniorIdle)} is below reservedAssets ${fmt(r.juniorReserved)} owed to priced exits`);
  if (r.juniorPaused) f("warn", "JUNIOR_PAUSED", "junior deposits are paused");

  // Senior book vs real: a gap beyond tolerance means a loss junior has not covered yet (or an adapter misreporting).
  if (r.seniorTotalAssets > 0n) {
    const gapBps = r.seniorTotalAssets > r.seniorRealAssets ? ((r.seniorTotalAssets - r.seniorRealAssets) * 10_000n) / r.seniorTotalAssets : 0n;
    if (gapBps > REAL_VS_BOOK_TOLERANCE_BPS) f("alert", "SENIOR_REAL_BELOW_BOOK", `senior real assets ${fmt(r.seniorRealAssets)} are ${gapBps.toString()} bps below book ${fmt(r.seniorTotalAssets)}`);
  }
  if (r.coverInProgress > 0n) f("info", "COVER_IN_PROGRESS", `junior cover of ${fmt(r.coverInProgress)} still being recognised by senior's share price`);

  return { findings, fallbacks };
}

function fmt(v: bigint): string {
  return `${(Number(v) / 1e6).toFixed(2)} USDC`;
}

export async function readAll(cfg: SeniorConfig, client: PublicClient, expectedAgent: Address, now: bigint): Promise<Reads> {
  const senior = cfg.vault as Address;
  const junior = cfg.junior as Address;
  const [lastUpdate, totalAssets, isAlloc, juniorAgent, juniorIdle, reserved, lastSettle, paused, juniorTotal, gas, cover, seniorIdle, adaptersLen] = await Promise.all([
    client.readContract({ address: senior, abi: vaultV2Abi, functionName: "lastUpdate" }),
    client.readContract({ address: senior, abi: vaultV2Abi, functionName: "totalAssets" }),
    client.readContract({ address: senior, abi: vaultV2Abi, functionName: "isAllocator", args: [expectedAgent] }),
    client.readContract({ address: junior, abi: juniorAbi, functionName: "agent" }),
    client.readContract({ address: cfg.usdc, abi: erc20Abi, functionName: "balanceOf", args: [junior] }),
    client.readContract({ address: junior, abi: juniorAbi, functionName: "reservedAssets" }),
    client.readContract({ address: junior, abi: juniorAbi, functionName: "lastSettle" }),
    client.readContract({ address: junior, abi: juniorAbi, functionName: "depositsPaused" }),
    client.readContract({ address: junior, abi: juniorAbi, functionName: "totalAssets" }),
    client.getBalance({ address: expectedAgent }),
    client.readContract({ address: junior, abi: juniorAbi, functionName: "coverInProgress" }),
    client.readContract({ address: cfg.usdc, abi: erc20Abi, functionName: "balanceOf", args: [senior] }),
    client.readContract({ address: senior, abi: vaultV2Abi, functionName: "adaptersLength" }),
  ]);
  let real = seniorIdle;
  for (let i = 0n; i < adaptersLen; i++) {
    const adapter = await client.readContract({ address: senior, abi: vaultV2Abi, functionName: "adapters", args: [i] });
    real += await client.readContract({ address: adapter, abi: adapterAbi, functionName: "realAssets" });
  }
  return {
    now,
    seniorLastUpdate: BigInt(lastUpdate),
    seniorTotalAssets: totalAssets,
    seniorRealAssets: real,
    seniorIsAllocatorExpected: isAlloc,
    juniorAgent,
    juniorIdle,
    juniorReserved: reserved,
    juniorLastSettle: lastSettle,
    juniorPaused: paused,
    juniorTotalAssets: juniorTotal,
    agentGasWei: gas,
    coverInProgress: cover,
  };
}

export interface WatchdogReport {
  runAt: string;
  expectedAgent: Address;
  reads: Record<string, string | boolean>;
  findings: Finding[];
  fallbacks: Array<Fallback & { txHash?: Hex; note: string }>;
  alertCount: number;
}

export async function runWatchdog(opts: { cfg: SeniorConfig; client: PublicClient; expectedAgent: Address; dryRun: boolean; agentPrivateKey?: Hex; now?: Date; log?: (l: string) => void }): Promise<WatchdogReport> {
  const log = opts.log ?? ((l: string) => console.log(l));
  const now = BigInt(Math.floor((opts.now ?? new Date()).getTime() / 1000));
  const reads = await readAll(opts.cfg, opts.client, opts.expectedAgent, now);
  const { findings, fallbacks } = evaluate(reads, opts.expectedAgent);
  for (const f of findings) log(`${f.level.toUpperCase()} ${f.code}: ${f.message}`);
  if (!findings.length) log("watchdog: every invariant holds");

  const sctx: SignerCtx = { cfg: opts.cfg, dryRun: opts.dryRun, client: opts.client, agentPrivateKey: opts.agentPrivateKey };
  const done: WatchdogReport["fallbacks"] = [];
  for (const fb of fallbacks) {
    if (opts.dryRun || !opts.agentPrivateKey) {
      done.push({ ...fb, note: `would call ${fb.kind} (${opts.dryRun ? "dry-run" : "no key"})` });
      continue;
    }
    try {
      const hash =
        fb.kind === "accrueInterest"
          ? await sendCall(sctx, opts.cfg.vault as Address, encodeFunctionData({ abi: vaultV2Abi, functionName: "accrueInterest" }), "watchdog accrueInterest")
          : await sendCall(sctx, opts.cfg.junior as Address, encodeFunctionData({ abi: juniorAbi, functionName: "settle" }), "watchdog settle");
      log(`watchdog fallback ${fb.kind} sent ${hash}`);
      done.push({ ...fb, txHash: hash, note: `${fb.kind} sent` });
    } catch (err) {
      const message = (err as Error).message;
      log(`watchdog fallback ${fb.kind} failed: ${message}`);
      done.push({ ...fb, note: `${fb.kind} failed: ${message}` });
    }
  }
  return {
    runAt: new Date(Number(now) * 1000).toISOString(),
    expectedAgent: opts.expectedAgent,
    reads: Object.fromEntries(Object.entries(reads).map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v])),
    findings,
    fallbacks: done,
    alertCount: findings.filter((f) => f.level === "alert").length,
  };
}

/** Telegram alert when TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set; silent otherwise. */
export async function notify(text: string, env: NodeJS.ProcessEnv = process.env, fetchFn: typeof fetch = fetch): Promise<boolean> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chat = env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;
  const res = await fetchFn(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  });
  return res.ok;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (isMain) {
  loadDotEnv();
  const opts = parseArgs(process.argv.slice(2));
  const cfg = loadConfig(opts.configPath);
  const expectedAgent = (process.env.EXPECTED_AGENT ?? "") as Address;
  if (isPlaceholder(expectedAgent)) {
    console.error("EXPECTED_AGENT must be the Rotator's wallet address");
    process.exit(1);
  }
  const client = createPublicClient({ chain: hyperEvm, transport: http(opts.rpcUrl) }) as PublicClient;
  runWatchdog({ cfg, client, expectedAgent, dryRun: opts.dryRun, agentPrivateKey: opts.agentPrivateKey })
    .then(async (r) => {
      console.log(JSON.stringify(r, null, 2));
      if (r.alertCount) {
        const lines = r.findings.filter((f) => f.level === "alert").map((f) => `${f.code}: ${f.message}`);
        const fb = r.fallbacks.map((f) => `${f.kind}: ${f.note}`);
        const sent = await notify(`Orphic watchdog: ${r.alertCount} alert(s)\n${lines.join("\n")}${fb.length ? `\nfallbacks: ${fb.join("; ")}` : ""}`);
        console.log(sent ? "telegram alert sent" : "telegram not configured; relying on the Actions failure email");
      }
      process.exit(r.alertCount ? 2 : 0);
    })
    .catch((err) => {
      console.error(`watchdog failed: ${(err as Error).message}`);
      process.exit(1);
    });
}
