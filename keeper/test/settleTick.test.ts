import { decodeFunctionData, parseAbi, type Address, type Hex, type PublicClient } from "viem";
import { describe, expect, it } from "vitest";
import { juniorAbi } from "../src/abi/junior.js";
import { SETTLE_INTERVAL, juniorWeekly, settleTickDue, type JuniorCtx } from "../src/exec/junior.js";
import type { TxSigner } from "../src/exec/signer.js";
import { cfg } from "./helpers.js";

const U = 1_000_000n;
const JUNIOR = "0x2000000000000000000000000000000000000001" as Address;
const AGENT = "0x3000000000000000000000000000000000000003" as Address;
const LAST = 1_700_000_000n;
const DUE = LAST + SETTLE_INTERVAL;
const erc4626 = parseAbi(["function withdraw(uint256,address,address)"]);
const morphoW = parseAbi(["function withdraw((address,address,address,address,uint256),uint256,uint256,address,address) returns (uint256,uint256)"]);

/** A fake chain: a clock, a Felix position, one Morpho market position. sends are recorded with the clock at send time. */
function world(opts: { chainNow: bigint; failMarketRecall?: boolean }) {
  const w = { clock: opts.chainNow, sends: [] as { what: string; at: bigint }[] };
  const c = cfg();
  c.junior = JUNIOR;
  const felix = c.felix.address.toLowerCase();
  const client = {
    getBlock: async () => ({ timestamp: w.clock }),
    call: async () => ({ data: "0x" }),
    readContract: async (a: { address: string; functionName: string; args?: unknown[] }) => {
      switch (a.functionName) {
        case "pendingExitShares": return 0n;
        case "pricePerShare": return 10n ** 18n;
        case "lastSettle": return LAST;
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
    await expect(juniorWeekly(ctx(now))).rejects.toThrow(/recall failed/);
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
