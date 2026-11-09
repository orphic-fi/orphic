/**
 * Junior idle management. Junior's USDC earns nothing while idle, but junior pays senior's cover and its own
 * priced exits out of idle USDC at settle. So: keep a reserve idle, deploy the rest to Felix USDC through
 * junior.execute (the only path the contract allows the agent), and pull back before each settle.
 *
 *   reserve = max(owed to exits that will have matured by the next settle,
 *                 coverBufferBps of senior assets,
 *                 minReserve)
 *   deploy   = idle - reserve            when idle - reserve >= minMove
 *   withdraw = reserve - idle            when idle < reserve and Felix holds something
 *
 * Every number comes from chain reads; the plan is pure and unit tested. junior.execute enforces the allowlist
 * (Felix is a registered vault, deposit/withdraw have the receiver pinned to junior) and refuses any call that
 * would dip idle below reservedAssets.
 */
import { createWalletClient, encodeFunctionData, http, parseAbi, type Address, type Hex, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { isPlaceholder, type SeniorConfig } from "../config.js";
import { juniorAbi } from "../abi/junior.js";
import { vaultV2Abi } from "../abi/vaultV2.js";
import { assertCanBroadcast, hyperEvm } from "./send.js";

export const COVER_BUFFER_BPS = 100n; // 1% of senior assets kept idle for a settle-day cover bill
export const MIN_RESERVE = 5_000_000n; // 5 USDC
export const MIN_MOVE = 20_000_000n; // do not bother Felix for less than 20 USDC

const erc20Full = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

const erc4626 = parseAbi([
  "function deposit(uint256 assets, address receiver) returns (uint256)",
  "function withdraw(uint256 assets, address receiver, address owner) returns (uint256)",
  "function maxWithdraw(address owner) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
]);

export interface IdleInputs {
  idle: bigint; // junior USDC balance
  reserved: bigint; // junior.reservedAssets (owed to priced exits)
  owedToMaturing: bigint; // USDC owed to exits maturing before the next settle, at today's price
  seniorAssets: bigint; // senior totalAssets
  felixAssets: bigint; // junior's Felix position in USDC
  felixWithdrawable: bigint; // Felix maxWithdraw(junior)
  allowance: bigint; // USDC allowance junior -> Felix
}

export type IdleAction =
  | { kind: "hold"; reason: string }
  | { kind: "deploy"; amount: bigint; approve: boolean }
  | { kind: "withdraw"; amount: bigint };

export function reserveFor(i: IdleInputs): bigint {
  const coverBuffer = (i.seniorAssets * COVER_BUFFER_BPS) / 10_000n;
  let r = i.reserved + i.owedToMaturing;
  if (coverBuffer > r) r = coverBuffer;
  if (MIN_RESERVE > r) r = MIN_RESERVE;
  return r;
}

export function planIdle(i: IdleInputs): IdleAction {
  const reserve = reserveFor(i);
  if (i.idle >= reserve) {
    const excess = i.idle - reserve;
    if (excess < MIN_MOVE) return { kind: "hold", reason: `idle ${fmt(i.idle)} within ${fmt(MIN_MOVE)} of reserve ${fmt(reserve)}` };
    return { kind: "deploy", amount: excess, approve: i.allowance < excess };
  }
  const need = reserve - i.idle;
  if (i.felixAssets === 0n) return { kind: "hold", reason: `idle ${fmt(i.idle)} below reserve ${fmt(reserve)} but nothing deployed to pull back` };
  const amount = need < i.felixWithdrawable ? need : i.felixWithdrawable;
  if (amount === 0n) return { kind: "hold", reason: "Felix has no withdrawable liquidity right now" };
  return { kind: "withdraw", amount };
}

function fmt(v: bigint): string {
  return `${(Number(v) / 1e6).toFixed(2)} USDC`;
}

export interface JuniorIdleResult {
  checked: boolean;
  idleUsdc?: number;
  reserveUsdc?: number;
  felixUsdc?: number;
  action: IdleAction["kind"] | "skipped";
  amountUsdc?: number;
  txHashes?: Hex[];
  note: string;
}

export interface IdleCtx {
  cfg: SeniorConfig;
  dryRun: boolean;
  client?: PublicClient;
  agentPrivateKey?: Hex;
  nowTs?: bigint;
  log?: (line: string) => void;
}

export async function readIdleInputs(ctx: IdleCtx): Promise<IdleInputs> {
  const c = ctx.client!;
  const junior = ctx.cfg.junior as Address;
  const felix = ctx.cfg.felix.address;
  const [idle, reserved, pending, pps, seniorAssets, felixShares, felixWithdrawable, allowance] = await Promise.all([
    c.readContract({ address: ctx.cfg.usdc, abi: erc20Full, functionName: "balanceOf", args: [junior] }),
    c.readContract({ address: junior, abi: juniorAbi, functionName: "reservedAssets" }),
    c.readContract({ address: junior, abi: juniorAbi, functionName: "pendingExitShares" }),
    c.readContract({ address: junior, abi: juniorAbi, functionName: "pricePerShare" }),
    c.readContract({ address: ctx.cfg.vault as Address, abi: vaultV2Abi, functionName: "totalAssets" }),
    c.readContract({ address: felix, abi: erc4626, functionName: "balanceOf", args: [junior] }),
    c.readContract({ address: felix, abi: erc4626, functionName: "maxWithdraw", args: [junior] }),
    c.readContract({ address: ctx.cfg.usdc, abi: erc20Full, functionName: "allowance", args: [junior, felix] }),
  ]);
  const felixAssets = felixShares > 0n ? await c.readContract({ address: felix, abi: erc4626, functionName: "convertToAssets", args: [felixShares] }) : 0n;
  // All pending exit shares are treated as maturing before the next settle: the queue is 7 days and settles are
  // weekly, so anything requested by now is owed at the next settle or the one after. Conservative on purpose.
  const owedToMaturing = (pending * pps) / 10n ** 18n / 10n ** 12n;
  return { idle, reserved, owedToMaturing, seniorAssets, felixAssets, felixWithdrawable, allowance };
}

async function execute(ctx: IdleCtx, target: Address, data: Hex): Promise<Hex> {
  assertCanBroadcast(ctx.cfg, ctx.agentPrivateKey, !ctx.dryRun);
  const account = privateKeyToAccount(ctx.agentPrivateKey!);
  const wallet = createWalletClient({ account, chain: hyperEvm, transport: http(ctx.cfg.rpcUrl) });
  const { request } = await ctx.client!.simulateContract({
    account,
    address: ctx.cfg.junior as Address,
    abi: juniorAbi,
    functionName: "execute",
    args: [target, data],
    chain: hyperEvm,
  });
  const hash = await wallet.writeContract(request);
  await ctx.client!.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 120_000 });
  return hash;
}

/** Hourly: deploy excess idle to Felix, or pull back to the reserve. */
export async function manageJuniorIdle(ctx: IdleCtx): Promise<JuniorIdleResult> {
  const log = ctx.log ?? (() => undefined);
  if (isPlaceholder(ctx.cfg.junior) || isPlaceholder(ctx.cfg.vault)) {
    return { checked: false, action: "skipped", note: "junior or senior is a placeholder; idle management skipped" };
  }
  if (!ctx.client) return { checked: false, action: "skipped", note: "no RPC client; idle management skipped" };
  const i = await readIdleInputs(ctx);
  const reserve = reserveFor(i);
  const action = planIdle(i);
  const base: JuniorIdleResult = {
    checked: true,
    idleUsdc: Number(i.idle) / 1e6,
    reserveUsdc: Number(reserve) / 1e6,
    felixUsdc: Number(i.felixAssets) / 1e6,
    action: action.kind,
    note: "",
  };
  const junior = ctx.cfg.junior as Address;
  const felix = ctx.cfg.felix.address;
  if (action.kind === "hold") {
    log(`junior idle: hold (${action.reason})`);
    return { ...base, note: action.reason };
  }
  const amountUsdc = Number(action.amount) / 1e6;
  if (action.kind === "deploy") {
    const verb = `deploy ${amountUsdc.toFixed(2)} USDC idle to Felix (reserve ${base.reserveUsdc!.toFixed(2)})${action.approve ? ", approving first" : ""}`;
    if (ctx.dryRun) {
      log(`junior idle: would ${verb} (dry-run)`);
      return { ...base, amountUsdc, note: `dry-run: would ${verb}` };
    }
    const hashes: Hex[] = [];
    if (action.approve) {
      hashes.push(await execute(ctx, ctx.cfg.usdc, encodeFunctionData({ abi: erc20Full, functionName: "approve", args: [felix, action.amount] })));
    }
    hashes.push(await execute(ctx, felix, encodeFunctionData({ abi: erc4626, functionName: "deposit", args: [action.amount, junior] })));
    log(`junior idle: ${verb}; sent ${hashes.join(", ")}`);
    return { ...base, amountUsdc, txHashes: hashes, note: verb };
  }
  const verb = `withdraw ${amountUsdc.toFixed(2)} USDC from Felix back to idle (reserve ${base.reserveUsdc!.toFixed(2)})`;
  if (ctx.dryRun) {
    log(`junior idle: would ${verb} (dry-run)`);
    return { ...base, amountUsdc, note: `dry-run: would ${verb}` };
  }
  const hash = await execute(ctx, felix, encodeFunctionData({ abi: erc4626, functionName: "withdraw", args: [action.amount, junior, junior] }));
  log(`junior idle: ${verb}; sent ${hash}`);
  return { ...base, amountUsdc, txHashes: [hash], note: verb };
}

/** Settle day: pull everything back from Felix so cover and matured exits are paid from idle. */
export async function recallFromFelix(ctx: IdleCtx): Promise<{ txHash?: Hex; note: string }> {
  const log = ctx.log ?? (() => undefined);
  if (!ctx.client) return { note: "no RPC client; recall skipped" };
  const junior = ctx.cfg.junior as Address;
  const felix = ctx.cfg.felix.address;
  const [shares, withdrawable] = await Promise.all([
    ctx.client.readContract({ address: felix, abi: erc4626, functionName: "balanceOf", args: [junior] }),
    ctx.client.readContract({ address: felix, abi: erc4626, functionName: "maxWithdraw", args: [junior] }),
  ]);
  if (shares === 0n) return { note: "nothing in Felix to recall" };
  const assets = await ctx.client.readContract({ address: felix, abi: erc4626, functionName: "convertToAssets", args: [shares] });
  const amount = assets < withdrawable ? assets : withdrawable;
  const verb = `recall ${(Number(amount) / 1e6).toFixed(2)} of ${(Number(assets) / 1e6).toFixed(2)} USDC from Felix before settle`;
  if (amount === 0n) {
    log("junior recall: Felix has no withdrawable liquidity; settle proceeds with idle only");
    return { note: "Felix illiquid; nothing recalled" };
  }
  if (ctx.dryRun) {
    log(`junior recall: would ${verb} (dry-run)`);
    return { note: `dry-run: would ${verb}` };
  }
  const hash = await execute(ctx, felix, encodeFunctionData({ abi: erc4626, functionName: "withdraw", args: [amount, junior, junior] }));
  log(`junior recall: ${verb}; sent ${hash}`);
  return { txHash: hash, note: verb };
}
