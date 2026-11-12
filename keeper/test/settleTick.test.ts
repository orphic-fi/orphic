import { decodeFunctionData, parseAbi, type Address, type Hex, type PublicClient } from "viem";
import { describe, expect, it } from "vitest";
import { juniorAbi } from "../src/abi/junior.js";
import { SETTLE_INTERVAL, juniorWeekly, settleTickDue, type JuniorCtx } from "../src/exec/junior.js";
import type { TxSigner } from "../src/exec/signer.js";
import { cfg } from "./helpers.js";
import { callReverted } from "./errs.js";

const U = 1_000_000n;
const JUNIOR = "0x2000000000000000000000000000000000000001" as Address;
const AGENT = "0x3000000000000000000000000000000000000003" as Address;
const LAST = 1_700_000_000n;
const DUE = LAST + SETTLE_INTERVAL;
const erc4626 = parseAbi(["function withdraw(uint256,address,address)"]);
const morphoW = parseAbi(["function withdraw((address,address,address,address,uint256),uint256,uint256,address,address) returns (uint256,uint256)"]);

/** A fake chain: a clock, a Felix position, one Morpho market position. sends are recorded with the clock at send time. */
function world(opts: { chainNow: bigint; failMarketRecall?: boolean; settledOnRead?: number; tooSoonAtSimulate?: boolean }) {
  const w = { clock: opts.chainNow, sends: [] as { what: string; at: bigint }[], lastSettleReads: 0 };
  const c = cfg();
  c.junior = JUNIOR;
  const felix = c.felix.address.toLowerCase();
  const client = {
    getBlock: async () => ({ timestamp: w.clock }),
    call: async (a: { data?: Hex }) => {
      if (opts.tooSoonAtSimulate && a.data && decodeFunctionData({ abi: juniorAbi, data: a.data }).functionName === "settle") throw callReverted("TooSoon()");
      return { data: "0x" };
    },
    readContract: async (a: { address: string; functionName: string; args?: unknown[] }) => {
      switch (a.functionName) {
        case "pendingExitShares": return 0n;
        case "pricePerShare": return 10n ** 18n;
        case "lastSettle": w.lastSettleReads++; return opts.settledOnRead && w.lastSettleReads >= opts.settledOnRead ? DUE + 5n : LAST;
        case "balanceOf": return a.address.toLowerCase() === felix ? 50n * U : 100n * U; // Felix shares / junior idle
        case "maxWithdraw": return 50n * U;
        case "convertToAssets": return 50n * U;
        case "marketsLength": return 1n;
        case "marketAssets": return 30n * U;
        case "markets": return [AGENT, AGENT, AGENT, AGENT, 770000000000000000n];
        case "position": return [30n * U, 0n, 0n];
        case "market": return [1000n * U, 1000n * U, 100n * U, 100n * U, 0n, 0n];
        default: throw new Error(`unexpected ${a.functionName}`);
      }
    },
  } as unknown as PublicClient;
  const signer: TxSigner = {
    address: AGENT,
    async send(tx) {
      const outer = decodeFunctionData({ abi: juniorAbi, data: tx.data });
      let what: string;
      if (outer.functionName === "settle") what = "settle";
      else if (outer.functionName === "execute") {
        const [target, data] = outer.args as [Address, Hex];
        if (target.toLowerCase() === felix) {
          const amount = decodeFunctionData({ abi: erc4626, data }).args![0] as bigint;
          what = amount === 0n ? "touch" : `felix-withdraw ${amount / U}`;
        } else {
          if (opts.failMarketRecall) throw new Error("execution reverted: market");
          decodeFunctionData({ abi: morphoW, data });
          what = "market-withdraw";
        }
      } else what = outer.functionName;
      w.sends.push({ what, at: w.clock });
      return ("0x" + "ab".repeat(32)) as Hex;
    },
  };
  const ctx = (nowTs: bigint, dryRun = false): JuniorCtx => ({
    cfg: c,
    dryRun,
    client,
    signer,
    nowTs,
    log: () => undefined,
    sleep: async (ms) => { w.clock += BigInt(Math.round(ms / 1000)); },
  });
  return { w, ctx };
}

describe("K1 settle tick", () => {
  it("starts the sequence one lead window before due, and keeps going after", () => {
    expect(settleTickDue(DUE - 3601n, LAST)).toBe(false);
    expect(settleTickDue(DUE - 3600n, LAST)).toBe(true);
    expect(settleTickDue(DUE + 5n, LAST)).toBe(true);
  });

  it("due 10 min away: touch, recall everything, then settle at the due second, in that order", async () => {
    const now = DUE - 600n;
    const { w, ctx } = world({ chainNow: now });
    const r = await juniorWeekly(ctx(now));
    expect(w.sends.map((s) => s.what)).toEqual(["touch", "felix-withdraw 50", "market-withdraw", "settle"]);
    for (const s of w.sends.slice(0, 3)) expect(s.at).toBeLessThan(DUE); // recalled BEFORE the due second
    expect(w.sends[3]!.at).toBeGreaterThanOrEqual(DUE); // settle at the due second itself
    expect(w.sends[3]!.at).toBeLessThan(DUE + 10n);
    expect(r.settleTx).toBeDefined();
    expect(r.steps!.map((x) => x[0])).toEqual(["1", "2", "3"]);
  });

  it("due 40 min away: recalls now, does not wait, the next tick settles; no redeploy is signalled in between", async () => {
    const now = DUE - 2400n;
    const { w, ctx } = world({ chainNow: now });
    const r = await juniorWeekly(ctx(now));
    expect(w.sends.map((s) => s.what)).toEqual(["touch", "felix-withdraw 50", "market-withdraw"]);
    expect(r.settleDue).toBe(true); // index.ts skips the idle (redeploy) step while settleDue
    expect(r.settleTx).toBeUndefined();
    // next tick, 30 min later, is inside the wait bound: positions already idle, it waits for due and settles
    const later = DUE - 600n;
    w.clock = later;
    await juniorWeekly(ctx(later));
    expect(w.sends.at(-1)!.what).toBe("settle");
    expect(w.sends.at(-1)!.at).toBeGreaterThanOrEqual(DUE);
  });

  it("a tick after due settles first thing, after the recall", async () => {
    const now = DUE + 90n;
    const { w, ctx } = world({ chainNow: now });
    await juniorWeekly(ctx(now));
    expect(w.sends.map((s) => s.what)).toEqual(["touch", "felix-withdraw 50", "market-withdraw", "settle"]);
  });

  it("S2: lastSettle already moved when the wait ends: someone else settled, success, nothing sent", async () => {
    const now = DUE - 600n;
    const { w, ctx } = world({ chainNow: now, settledOnRead: 2 }); // read 1 = prepare, read 2 = the re-read before sending
    const r = await juniorWeekly(ctx(now));
    expect(r.alreadySettled).toBe(true);
    expect(r.error).toBeUndefined();
    expect(w.sends.map((s) => s.what)).not.toContain("settle");
  });

  it("S2/S4: a TooSoon simulate (decoded from the revert selector) with lastSettle moved is success", async () => {
    const now = DUE - 600n;
    const { ctx } = world({ chainNow: now, tooSoonAtSimulate: true, settledOnRead: 3 });
    const r = await juniorWeekly(ctx(now));
    expect(r.alreadySettled).toBe(true);
    expect(r.error).toBeUndefined();
  });

  it("S4: TooSoon with lastSettle unmoved is a failure, reported, not a pass", async () => {
    const now = DUE - 600n;
    const { ctx } = world({ chainNow: now, tooSoonAtSimulate: true });
    const r = await juniorWeekly(ctx(now));
    expect(r.alreadySettled).toBeUndefined();
    expect(r.error).toMatch(/TooSoon but lastSettle did not move/);
  });

  it("S3: the in-tick wait is at most 15 minutes", async () => {
    const { SETTLE_MAX_WAIT } = await import("../src/exec/junior.js");
    expect(SETTLE_MAX_WAIT).toBe(900n);
    const now = DUE - 901n;
    const { w, ctx } = world({ chainNow: now });
    await juniorWeekly(ctx(now));
    expect(w.sends.map((s) => s.what)).not.toContain("settle"); // 901 s away: the next tick settles
  });

  it("does nothing more than 1h before due", async () => {
    const now = DUE - 7200n;
    const { w, ctx } = world({ chainNow: now });
    const r = await juniorWeekly(ctx(now));
    expect(w.sends).toEqual([]);
    expect(r.settleDue).toBe(false);
  });

  it("never settles when a recall failed", async () => {
    const now = DUE - 600n;
    const { w, ctx } = world({ chainNow: now, failMarketRecall: true });
    const r = await juniorWeekly(ctx(now));
    expect(r.error).toMatch(/recall failed/);
    expect(r.settleDue).toBe(true); // still a settle tick: the caller redeploys nothing
    expect(w.sends.map((s) => s.what)).not.toContain("settle");
  });

  it("dry-run reports touch, recall, settle in order and sends nothing", async () => {
    const now = DUE - 600n;
    const { w, ctx } = world({ chainNow: now });
    const r = await juniorWeekly(ctx(now, true));
    expect(w.sends).toEqual([]);
    expect(r.steps!.map((x) => x.split(":")[0])).toEqual(["1 touch", "2 recall", "3 settle"]);
  });
});
