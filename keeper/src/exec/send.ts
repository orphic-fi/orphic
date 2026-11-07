import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createWalletClient,
  http,
  parseUnits,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
  type Account,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hasPlaceholders, type SeniorConfig } from "../config.js";
import type { ExecutionResult, MarketData, PlanStep, VaultState } from "../types.js";
import { vaultV2Abi } from "../abi/vaultV2.js";
import { adapterAbi, marketAdapterAbi } from "../abi/adapters.js";
import { erc20Abi } from "../abi/erc20.js";
import { encodeMarketParams } from "../data/state.js";
import { formatPlanTable } from "./plan.js";

export const hyperEvm: Chain = {
  id: 999,
  name: "HyperEVM",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.hyperliquid.xyz/evm"] } },
};

export interface ExecContext {
  cfg: SeniorConfig;
  dryRun: boolean;
  opsDir: string;
  state: VaultState;
  markets: MarketData[];
  client?: PublicClient;
  agentPrivateKey?: Hex;
  log?: (line: string) => void;
}

/** Throws unless every precondition for broadcasting holds. */
export function assertCanBroadcast(cfg: SeniorConfig, agentPrivateKey: Hex | undefined, live: boolean): void {
  if (!live) throw new Error("not in live mode");
  const missing = hasPlaceholders(cfg);
  if (missing.length) throw new Error(`refusing to broadcast: placeholder addresses in config: ${missing.join(", ")}`);
  if (!agentPrivateKey) throw new Error("refusing to broadcast: AGENT_PRIVATE_KEY missing or malformed");
}

export function writeLastPlan(opsDir: string, plan: PlanStep[], extra: Record<string, unknown>): string {
  mkdirSync(opsDir, { recursive: true });
  const path = resolve(opsDir, "last-plan.json");
  writeFileSync(path, JSON.stringify({ writtenAt: new Date().toISOString(), ...extra, plan }, null, 2));
  return path;
}

function stepCalldata(ctx: ExecContext, step: PlanStep): { data: Hex; adapter: Address } {
  if (step.marketId === "felix") return { data: "0x", adapter: ctx.cfg.adapters.morphoVaultV1 as Address };
  const m = ctx.markets.find((x) => x.id.toLowerCase() === step.marketId.toLowerCase());
  if (!m) throw new Error(`no market params for ${step.marketId}`);
  return { data: encodeMarketParams(m.params), adapter: ctx.cfg.adapters.morphoMarketV1 as Address };
}

async function readPost(ctx: ExecContext, step: PlanStep): Promise<{ idle: number; position: number }> {
  const client = ctx.client!;
  const scale = 10 ** ctx.cfg.usdcDecimals;
  const vault = ctx.cfg.vault as Address;
  const idle = await client.readContract({ address: ctx.cfg.usdc, abi: erc20Abi, functionName: "balanceOf", args: [vault] });
  let position: bigint;
  if (step.marketId === "felix") {
    position = await client.readContract({ address: ctx.cfg.adapters.morphoVaultV1 as Address, abi: adapterAbi, functionName: "realAssets" });
  } else {
    position = await client.readContract({
      address: ctx.cfg.adapters.morphoMarketV1 as Address,
      abi: marketAdapterAbi,
      functionName: "expectedSupplyAssets",
      args: [step.marketId],
    });
  }
  return { idle: Number(idle) / scale, position: Number(position) / scale };
}

/**
 * Rule 6. Dry-run prints the table and writes ops/last-plan.json. Live mode sends
 * sequentially, waits for each receipt, re-reads state and aborts on any failed check.
 */
export async function executePlan(ctx: ExecContext, plan: PlanStep[]): Promise<ExecutionResult[]> {
  const log = ctx.log ?? ((l: string) => console.log(l));
  const total = ctx.state.totalAssets;

  log("");
  log(formatPlanTable(plan, total));
  log("");

  const planPath = writeLastPlan(ctx.opsDir, plan, { mode: ctx.dryRun ? "dry-run" : "live", totalAssets: total });
  log(`plan written to ${planPath}`);

  if (ctx.dryRun) {
    return plan.map((step) => ({ step, status: "simulated" as const }));
  }

  assertCanBroadcast(ctx.cfg, ctx.agentPrivateKey, true);
  if (!ctx.client) throw new Error("live mode needs an RPC client");

  const account: Account = privateKeyToAccount(ctx.agentPrivateKey!);
  const wallet: WalletClient = createWalletClient({ account, chain: hyperEvm, transport: http(ctx.cfg.rpcUrl) });
  const vault = ctx.cfg.vault as Address;

  const isAllocator = await ctx.client.readContract({ address: vault, abi: vaultV2Abi, functionName: "isAllocator", args: [account.address] });
  if (!isAllocator) throw new Error(`agent ${account.address} is not an allocator on ${vault}`);

  const results: ExecutionResult[] = [];
  const idleFloor = ctx.cfg.constraints.minIdle * total;
  let aborted = false;

  for (const step of plan) {
    if (aborted) {
      results.push({ step, status: "skipped", error: "aborted after a failed post-state check" });
      continue;
    }
    const { data, adapter } = stepCalldata(ctx, step);
    const assets = parseUnits(step.amount.toFixed(ctx.cfg.usdcDecimals), ctx.cfg.usdcDecimals);
    try {
      const before = await readPost(ctx, step);
      const { request } = await ctx.client.simulateContract({
        account,
        address: vault,
        abi: vaultV2Abi,
        functionName: step.action,
        args: [adapter, data, assets],
        chain: hyperEvm,
      });
      const hash = await wallet.writeContract(request);
      log(`${step.action} ${step.label} ${step.amount} USDC -> ${hash}`);
      const receipt = await ctx.client.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 120_000 });
      if (receipt.status !== "success") throw new Error(`tx ${hash} reverted`);

      const after = await readPost(ctx, step);
      const expected = step.action === "allocate" ? step.amount : -step.amount;
      const observed = after.position - before.position;
      // Allow 1% tolerance for interest accrual and share rounding.
      const tol = Math.max(1, step.amount * 0.01);
      if (Math.abs(observed - expected) > tol) {
        throw new Error(`post-state check failed: position changed by ${observed}, expected ${expected}`);
      }
      if (after.idle < idleFloor - tol) {
        throw new Error(`post-state check failed: idle ${after.idle} below floor ${idleFloor}`);
      }
      results.push({ step, status: "sent", txHash: hash, gasUsed: receipt.gasUsed.toString(), postIdle: after.idle, postPosition: after.position });
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      log(`ABORT: ${message}`);
      results.push({ step, status: "failed", error: message });
      aborted = true;
    }
  }
  return results;
}

/**
 * Rule 7: weekly close. There are no emission positions yet, so this only calls
 * accrueInterest() on the vault so fees accrue on a fixed schedule.
 */
export async function weeklyClose(ctx: ExecContext): Promise<{ emissionsSold: number; accrueTx?: Hex; note: string }> {
  const log = ctx.log ?? ((l: string) => console.log(l));
  log("weekly close: no emission positions to sell (stub)");
  if (ctx.dryRun) {
    log("weekly close: would call vault.accrueInterest() (dry-run)");
    return { emissionsSold: 0, note: "dry-run: accrueInterest not sent" };
  }
  assertCanBroadcast(ctx.cfg, ctx.agentPrivateKey, true);
  const account = privateKeyToAccount(ctx.agentPrivateKey!);
  const wallet = createWalletClient({ account, chain: hyperEvm, transport: http(ctx.cfg.rpcUrl) });
  const { request } = await ctx.client!.simulateContract({
    account,
    address: ctx.cfg.vault as Address,
    abi: vaultV2Abi,
    functionName: "accrueInterest",
    chain: hyperEvm,
  });
  const hash = await wallet.writeContract(request);
  await ctx.client!.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 120_000 });
  log(`weekly close: accrueInterest sent ${hash}`);
  return { emissionsSold: 0, accrueTx: hash, note: "accrueInterest sent" };
}
