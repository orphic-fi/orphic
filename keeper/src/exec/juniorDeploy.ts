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
import { encodeFunctionData, parseAbi, type Address, type Hex, type PublicClient } from "viem";
import { isPlaceholder, type SeniorConfig } from "../config.js";
import { juniorAbi } from "../abi/junior.js";
import { vaultV2Abi } from "../abi/vaultV2.js";
import { sendCall, type SignerCtx } from "./send.js";
import { encodeMarketParams } from "../data/state.js";
import { morphoBlueAbi } from "../abi/morphoBlue.js";
import { keccak256 } from "viem";

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

const morphoWithdrawAbi = parseAbi([
  "function position(bytes32 id, address user) view returns (uint256 supplyShares, uint128 borrowShares, uint128 collateral)",
  "function withdraw((address loanToken, address collateralToken, address oracle, address irm, uint256 lltv) marketParams, uint256 assets, uint256 shares, address onBehalf, address receiver) returns (uint256, uint256)",
]);

const seniorRedeemAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256)",
]);

export interface IdleInputs {
  idle: bigint; // junior USDC balance
  reserved: bigint; // junior.reservedAssets (owed to priced exits)
  carryOwed: bigint; // junior.carryOwed(): cover still owed to senior; execute() refuses to dip idle below reserved + this
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
  let r = i.reserved + i.carryOwed + i.owedToMaturing;
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

export interface IdleCtx extends SignerCtx {
  nowTs?: bigint;
  log?: (line: string) => void;
}

export async function readIdleInputs(ctx: IdleCtx): Promise<IdleInputs> {
  const c = ctx.client!;
  const junior = ctx.cfg.junior as Address;
  const felix = ctx.cfg.felix.address;
  // carryOwed does not exist on a pre-fix junior build: no debt there.
  const carry = c.readContract({ address: junior, abi: juniorAbi, functionName: "carryOwed" }).catch(() => 0n);
  const [carryOwed, idle, reserved, pending, pps, seniorAssets, felixShares, felixWithdrawable, allowance] = await Promise.all([
    carry,
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
  return { idle, reserved, carryOwed, owedToMaturing, seniorAssets, felixAssets, felixWithdrawable, allowance };
}

async function execute(ctx: IdleCtx, target: Address, data: Hex): Promise<Hex> {
  const calldata = encodeFunctionData({ abi: juniorAbi, functionName: "execute", args: [target, data] });
  return sendCall(ctx, ctx.cfg.junior as Address, calldata, `junior.execute -> ${target}`);
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

/**
 * Touch Felix so a bad debt it has not booked yet lands in `lostAssets` before junior is valued at the settle (L11
 * item 4). Felix (MetaMorpho v1.1) runs its accrual, which writes `lostAssets`, on every deposit/withdraw/redeem.
 * `withdraw(0, junior, junior)` through junior.execute is the cheapest safe touch: it needs no USDC and no approval,
 * cannot lower idle, and the Felix withdraw rule with junior pinned as receiver already allows it.
 */
export async function touchFelix(ctx: IdleCtx): Promise<{ txHash?: Hex; note: string }> {
  const log = ctx.log ?? (() => undefined);
  const junior = ctx.cfg.junior as Address;
  const felix = ctx.cfg.felix.address;
  if (ctx.dryRun) {
    log("junior touch: would call Felix.withdraw(0, junior, junior) through junior.execute so a pending bad debt is booked (dry-run)");
    return { note: "dry-run: would touch Felix (withdraw 0)" };
  }
  const hash = await execute(ctx, felix, encodeFunctionData({ abi: erc4626, functionName: "withdraw", args: [0n, junior, junior] }));
  log(`junior touch: Felix accrual run; sent ${hash}`);
  return { txHash: hash, note: "Felix touched (withdraw 0)" };
}

export interface RecallResult {
  txHashes: Hex[];
  /** One line per venue, in the order they were recalled. */
  steps: string[];
  /** Venues whose recall failed (a revert, not an illiquid venue). */
  errors: string[];
  note: string;
}

/**
 * Bring every junior position back to idle: Felix, every `junior.markets()` Morpho market and (only when asked) the
 * senior fee shares junior holds. Each venue is tried independently so one failure never blocks the others.
 */
export async function recallAll(ctx: IdleCtx, opts: { seniorShares: boolean }): Promise<RecallResult> {
  const log = ctx.log ?? (() => undefined);
  const out: RecallResult = { txHashes: [], steps: [], errors: [], note: "" };
  if (!ctx.client) return { ...out, note: "no RPC client; recall skipped" };
  const c = ctx.client;
  const junior = ctx.cfg.junior as Address;
  const step = async (venue: string, fn: () => Promise<{ txHash?: Hex; note: string }>) => {
    try {
      const r = await fn();
      if (r.txHash) out.txHashes.push(r.txHash);
      out.steps.push(`${venue}: ${r.note}`);
    } catch (err) {
      const m = `${venue}: recall failed: ${(err as Error).message.split("\n")[0]}`;
      out.errors.push(m);
      out.steps.push(m);
      log(`junior recall: ${m}`);
    }
  };

  await step("Felix", () => recallFromFelix(ctx));

  const n = Number(await c.readContract({ address: junior, abi: juniorAbi, functionName: "marketsLength" }));
  for (let i = 0; i < n; i++) {
    await step(`market ${i}`, async () => {
      const assets = await c.readContract({ address: junior, abi: juniorAbi, functionName: "marketAssets", args: [BigInt(i)] });
      if (assets === 0n) return { note: "no position" };
      const [loanToken, collateralToken, oracle, irm, lltv] = await c.readContract({ address: junior, abi: juniorAbi, functionName: "markets", args: [BigInt(i)] });
      const mp = { loanToken, collateralToken, oracle, irm, lltv };
      const id = keccak256(encodeMarketParams(mp));
      const [position, m] = await Promise.all([
        c.readContract({ address: ctx.cfg.morphoBlue, abi: morphoWithdrawAbi, functionName: "position", args: [id, junior] }),
        c.readContract({ address: ctx.cfg.morphoBlue, abi: morphoBlueAbi, functionName: "market", args: [id] }),
      ]);
      const liquidity = m[0] - m[2];
      // Whole position by shares when the market can pay it, else what the market can pay right now.
      const all = assets <= liquidity;
      const amount = all ? assets : liquidity;
      const verb = `recall ${(Number(amount) / 1e6).toFixed(2)} of ${(Number(assets) / 1e6).toFixed(2)} USDC from market ${i}`;
      if (amount === 0n) return { note: "market illiquid; nothing recalled" };
      if (ctx.dryRun) return { note: `dry-run: would ${verb}` };
      const data = encodeFunctionData({
        abi: morphoWithdrawAbi,
        functionName: "withdraw",
        args: [mp, all ? 0n : amount, all ? position[0] : 0n, junior, junior],
      });
      const hash = await sendCall(ctx, junior, encodeFunctionData({ abi: juniorAbi, functionName: "execute", args: [ctx.cfg.morphoBlue, data] }), `junior.execute -> morpho withdraw ${i}`);
      return { txHash: hash, note: verb };
    });
  }

  if (opts.seniorShares && !isPlaceholder(ctx.cfg.vault)) {
    const senior = ctx.cfg.vault as Address;
    await step("senior fee shares", async () => {
      const shares = await c.readContract({ address: senior, abi: seniorRedeemAbi, functionName: "balanceOf", args: [junior] });
      if (shares === 0n) return { note: "no senior shares held" };
      if (ctx.dryRun) return { note: `dry-run: would redeem ${shares.toString()} senior shares` };
      const hash = await execute(ctx, senior, encodeFunctionData({ abi: seniorRedeemAbi, functionName: "redeem", args: [shares, junior, junior] }));
      return { txHash: hash, note: `redeemed ${shares.toString()} senior shares` };
    });
  }
  out.note = out.steps.join("; ");
  return out;
}

export interface LiquidityResult {
  checked: boolean;
  idleUsdc?: number;
  owedUsdc?: number;
  short?: boolean;
  recall?: RecallResult;
  note: string;
}

/**
 * K2, every tick: junior's idle USDC must cover what it has priced and promised, `reservedAssets + carryOwed()`
 * (the same bound execute() enforces). When it does not, recall EVERY position (Felix, every market, junior's own
 * senior fee shares) so the priced claims and the carried cover are payable.
 */
export async function ensureLiquidity(ctx: IdleCtx): Promise<LiquidityResult> {
  const log = ctx.log ?? (() => undefined);
  if (isPlaceholder(ctx.cfg.junior) || isPlaceholder(ctx.cfg.vault)) return { checked: false, note: "junior or senior is a placeholder; liquidity check skipped" };
  if (!ctx.client) return { checked: false, note: "no RPC client; liquidity check skipped" };
  const junior = ctx.cfg.junior as Address;
  const c = ctx.client;
  const [idle, reserved, carry] = await Promise.all([
    c.readContract({ address: ctx.cfg.usdc, abi: erc20Full, functionName: "balanceOf", args: [junior] }),
    c.readContract({ address: junior, abi: juniorAbi, functionName: "reservedAssets" }),
    c.readContract({ address: junior, abi: juniorAbi, functionName: "carryOwed" }).catch(() => 0n),
  ]);
  const owed = reserved + carry;
  const base = { checked: true, idleUsdc: Number(idle) / 1e6, owedUsdc: Number(owed) / 1e6 };
  if (idle >= owed) return { ...base, short: false, note: `idle ${fmt(idle)} covers reserved + carry ${fmt(owed)}` };
  log(`junior liquidity: idle ${fmt(idle)} is below reserved + carry ${fmt(owed)}; recalling every position`);
  const recall = await recallAll(ctx, { seniorShares: true });
  return { ...base, short: true, recall, note: `idle ${fmt(idle)} below ${fmt(owed)}: ${recall.note}` };
}
