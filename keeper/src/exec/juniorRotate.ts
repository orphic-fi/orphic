/**
 * Junior rotation executor: reads junior's book and both venues' rates from the chain, asks planJunior for
 * the actions, and turns them into junior.execute calls (the only path the contract gives the agent).
 *
 * HyperLend is optional: with no `juniorVenues.hyperlend` in config (junior v1 and v1.1 have no lender venue),
 * the plan degenerates to Felix only, which is exactly what manageJuniorIdle did.
 */
import { encodeFunctionData, parseAbi, type Address, type Hex } from "viem";
import { juniorAbi } from "../abi/junior.js";
import { isPlaceholder } from "../config.js";
import { planJunior, type JuniorAction, type JuniorAllocInputs, type JuniorPlan } from "../engine/juniorAllocate.js";
import { readIdleInputs, reserveFor, type IdleCtx } from "./juniorDeploy.js";
import { sendCall } from "./send.js";

const erc20 = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);
const erc4626 = parseAbi([
  "function deposit(uint256 assets, address receiver) returns (uint256)",
  "function withdraw(uint256 assets, address receiver, address owner) returns (uint256)",
]);
const aavePool = parseAbi([
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
  "function withdraw(address asset, uint256 amount, address to) returns (uint256)",
  "function getReserveData(address asset) view returns ((uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))",
]);

export interface HyperlendVenue {
  pool: Address;
  aToken: Address;
  maxFraction: number; // slice cap of junior's deployable book
}

export interface JuniorRotateCtx extends IdleCtx {
  felixRate: number; // Felix net APY, read from the vault by the senior loop this tick
  gasCostUsdPerAction: number;
  hyperlend?: HyperlendVenue;
  minMoveUsdc?: number;
  marginFactor?: number;
}

export interface JuniorRotateResult {
  checked: boolean;
  action: "hold" | "move" | "skipped";
  plan?: JuniorPlan;
  inputs?: { idleUsdc: number; reserveUsdc: number; felixUsdc: number; hyperlendUsdc: number; felixRate: number; hlRate: number };
  txHashes?: Hex[];
  note: string;
}

async function readHyperlend(ctx: JuniorRotateCtx, junior: Address): Promise<{ hlAssets: bigint; hlWithdrawable: bigint; hlRate: number; hlAllowance: bigint }> {
  const hl = ctx.hyperlend;
  if (!hl) return { hlAssets: 0n, hlWithdrawable: 0n, hlRate: 0, hlAllowance: 0n };
  const c = ctx.client!;
  const usdc = ctx.cfg.usdc as Address;
  const [bal, poolCash, rd, allowance] = await Promise.all([
    c.readContract({ address: hl.aToken, abi: erc20, functionName: "balanceOf", args: [junior] }),
    c.readContract({ address: usdc, abi: erc20, functionName: "balanceOf", args: [hl.aToken] }), // reserve cash sits on the aToken
    c.readContract({ address: hl.pool, abi: aavePool, functionName: "getReserveData", args: [usdc] }),
    c.readContract({ address: usdc, abi: erc20, functionName: "allowance", args: [junior, hl.pool] }),
  ]);
  const rate = Number(rd.currentLiquidityRate) / 1e27; // ray APR; close enough to APY at these levels, compounded per second onchain
  return { hlAssets: bal, hlWithdrawable: bal < poolCash ? bal : poolCash, hlRate: Math.expm1(rate) , hlAllowance: allowance };
}

export async function readJuniorInputs(ctx: JuniorRotateCtx): Promise<JuniorAllocInputs> {
  const junior = ctx.cfg.junior as Address;
  const [idle, hl] = await Promise.all([readIdleInputs(ctx), readHyperlend(ctx, junior)]);
  return {
    idle: idle.idle,
    reserve: reserveFor(idle),
    felixAssets: idle.felixAssets,
    felixWithdrawable: idle.felixWithdrawable,
    felixRate: ctx.felixRate,
    felixAllowance: idle.allowance,
    ...hl,
  };
}

function encode(ctx: JuniorRotateCtx, junior: Address, a: JuniorAction): { target: Address; data: Hex; label: string } {
  const usdc = ctx.cfg.usdc as Address;
  const felix = ctx.cfg.felix.address as Address;
  const hl = ctx.hyperlend;
  const amt = (Number(a.amount) / 1e6).toFixed(2);
  if (a.kind === "approve") {
    const spender = a.venue === "felix" ? felix : hl!.pool;
    return { target: usdc, data: encodeFunctionData({ abi: erc20, functionName: "approve", args: [spender, a.amount] }), label: `approve ${amt} USDC to ${a.venue}` };
  }
  if (a.venue === "felix") {
    return a.kind === "deposit"
      ? { target: felix, data: encodeFunctionData({ abi: erc4626, functionName: "deposit", args: [a.amount, junior] }), label: `deposit ${amt} USDC to Felix` }
      : { target: felix, data: encodeFunctionData({ abi: erc4626, functionName: "withdraw", args: [a.amount, junior, junior] }), label: `withdraw ${amt} USDC from Felix` };
  }
  return a.kind === "deposit"
    ? { target: hl!.pool, data: encodeFunctionData({ abi: aavePool, functionName: "supply", args: [usdc, a.amount, junior, 0] }), label: `supply ${amt} USDC to HyperLend` }
    : { target: hl!.pool, data: encodeFunctionData({ abi: aavePool, functionName: "withdraw", args: [usdc, a.amount, junior] }), label: `withdraw ${amt} USDC from HyperLend` };
}

/** Hourly: rotate junior's book between Felix and HyperLend, keep the reserve idle. */
export async function rotateJunior(ctx: JuniorRotateCtx): Promise<JuniorRotateResult> {
  const log = ctx.log ?? (() => undefined);
  if (isPlaceholder(ctx.cfg.junior) || isPlaceholder(ctx.cfg.vault)) return { checked: false, action: "skipped", note: "junior or senior is a placeholder; rotation skipped" };
  if (!ctx.client) return { checked: false, action: "skipped", note: "no RPC client; rotation skipped" };
  const junior = ctx.cfg.junior as Address;
  const i = await readJuniorInputs(ctx);
  const plan = planJunior(i, {
    hlMaxFraction: ctx.hyperlend?.maxFraction ?? 0,
    minMove: BigInt(Math.round((ctx.minMoveUsdc ?? 20) * 1e6)),
    marginFactor: ctx.marginFactor ?? 3,
    gasCostUsdPerAction: ctx.gasCostUsdPerAction,
  });
  const inputs = { idleUsdc: Number(i.idle) / 1e6, reserveUsdc: Number(i.reserve) / 1e6, felixUsdc: Number(i.felixAssets) / 1e6, hyperlendUsdc: Number(i.hlAssets) / 1e6, felixRate: i.felixRate, hlRate: i.hlRate };
  if (plan.actions.length === 0) {
    log(`junior: hold (${plan.reason})`);
    return { checked: true, action: "hold", plan, inputs, note: plan.reason };
  }
  const steps = plan.actions.map((a) => encode(ctx, junior, a));
  const verb = `${plan.reason}: ${steps.map((s) => s.label).join("; ")}`;
  if (ctx.dryRun) {
    log(`junior: would ${verb} (dry-run)`);
    return { checked: true, action: "move", plan, inputs, note: `dry-run: would ${verb}` };
  }
  const hashes: Hex[] = [];
  for (const s of steps) {
    const calldata = encodeFunctionData({ abi: juniorAbi, functionName: "execute", args: [s.target, s.data] });
    hashes.push(await sendCall(ctx, junior, calldata, `junior.execute: ${s.label}`));
  }
  log(`junior: ${verb}; sent ${hashes.join(", ")}`);
  return { checked: true, action: "move", plan, inputs, txHashes: hashes, note: verb };
}

/** Settle day: bring everything back from both venues so cover and matured exits are paid from idle. */
export async function recallAll(ctx: JuniorRotateCtx): Promise<{ txHashes: Hex[]; note: string }> {
  const log = ctx.log ?? (() => undefined);
  if (!ctx.client) return { txHashes: [], note: "no RPC client; recall skipped" };
  const junior = ctx.cfg.junior as Address;
  const c = ctx.client;
  const felix = ctx.cfg.felix.address as Address;
  const erc4626View = parseAbi(["function balanceOf(address) view returns (uint256)", "function maxWithdraw(address owner) view returns (uint256)", "function convertToAssets(uint256 shares) view returns (uint256)"]);
  const [shares, withdrawable] = await Promise.all([
    c.readContract({ address: felix, abi: erc4626View, functionName: "balanceOf", args: [junior] }),
    c.readContract({ address: felix, abi: erc4626View, functionName: "maxWithdraw", args: [junior] }),
  ]);
  const felixAssets = shares > 0n ? await c.readContract({ address: felix, abi: erc4626View, functionName: "convertToAssets", args: [shares] }) : 0n;
  const actions: JuniorAction[] = [];
  const fx = felixAssets < withdrawable ? felixAssets : withdrawable;
  if (fx > 0n) actions.push({ kind: "withdraw", venue: "felix", amount: fx });
  if (ctx.hyperlend) {
    const hl = await readHyperlend(ctx, junior);
    if (hl.hlWithdrawable > 0n) actions.push({ kind: "withdraw", venue: "hyperlend", amount: hl.hlWithdrawable });
  }
  if (actions.length === 0) return { txHashes: [], note: "nothing deployed to recall" };
  const steps = actions.map((a) => encode(ctx, junior, a));
  const verb = `recall before settle: ${steps.map((s) => s.label).join("; ")}`;
  if (ctx.dryRun) {
    log(`junior recall: would ${verb} (dry-run)`);
    return { txHashes: [], note: `dry-run: would ${verb}` };
  }
  const hashes: Hex[] = [];
  for (const s of steps) {
    const calldata = encodeFunctionData({ abi: juniorAbi, functionName: "execute", args: [s.target, s.data] });
    hashes.push(await sendCall(ctx, junior, calldata, `junior.execute: ${s.label}`));
  }
  log(`junior recall: ${verb}; sent ${hashes.join(", ")}`);
  return { txHashes: hashes, note: verb };
}
