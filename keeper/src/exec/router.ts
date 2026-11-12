import { encodeFunctionData, type Address, type Hex } from "viem";
import { isPlaceholder } from "../config.js";
import { erc20Abi } from "../abi/erc20.js";
import { feeRouterAbi } from "../abi/feeRouter.js";
import { sendCall, type SignerCtx } from "./send.js";

export interface DistributeResult {
  called: boolean;
  txHash?: Hex;
  unparkedUsdc?: number;
  note: string;
}

/**
 * K4, every tick: FeeRouter.distribute() while the router holds USDC that is not parked (permissionless since 3/8).
 * Flushing every tick is what bounds a junior-deposit fee snipe (L14) and keeps each push to senior small: with the
 * senior receive-shares gate wired, a push above its 10 USDC `maxUnrecognised` closes senior deposits until recognised.
 * Nothing to flush, or a flush that races to `NothingToDo`, is a skip, not a failure.
 */
export async function distributeFees(ctx: SignerCtx & { log?: (l: string) => void }): Promise<DistributeResult> {
  const log = ctx.log ?? (() => undefined);
  const router = ctx.cfg.feeRouter;
  if (isPlaceholder(router)) return { called: false, note: "feeRouter is not configured; skipped" };
  if (!ctx.client) return { called: false, note: "no RPC client; distribute skipped" };
  const to = router as Address;
  const [bal, parked] = await Promise.all([
    ctx.client.readContract({ address: ctx.cfg.usdc, abi: erc20Abi, functionName: "balanceOf", args: [to] }),
    ctx.client.readContract({ address: to, abi: feeRouterAbi, functionName: "totalParked", args: [ctx.cfg.usdc] }),
  ]);
  const unparked = bal > parked ? bal - parked : 0n;
  const unparkedUsdc = Number(unparked) / 1e6;
  if (unparked === 0n) {
    log("distribute: router holds no unparked USDC, nothing to do");
    return { called: false, unparkedUsdc, note: "no unparked USDC; nothing to do" };
  }
  if (ctx.dryRun) {
    log(`distribute: would call feeRouter.distribute() for ${unparkedUsdc} USDC (dry-run)`);
    return { called: false, unparkedUsdc, note: `dry-run: would distribute ${unparkedUsdc} USDC` };
  }
  try {
    const hash = await sendCall(ctx, to, encodeFunctionData({ abi: feeRouterAbi, functionName: "distribute" }), "distribute");
    log(`distribute: ${unparkedUsdc} USDC split; sent ${hash}`);
    return { called: true, txHash: hash, unparkedUsdc, note: `distributed ${unparkedUsdc} USDC` };
  } catch (err) {
    if (/NothingToDo/.test((err as Error).message)) return { called: false, unparkedUsdc, note: "NothingToDo (flushed by someone else); skipped" };
    throw err;
  }
}
