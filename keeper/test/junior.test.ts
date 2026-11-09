import { describe, expect, it } from "vitest";
import type { PublicClient } from "viem";
import {
  SETTLE_GRACE,
  SETTLE_PERIOD,
  coverLine,
  exitShortfall,
  hoursToRecognition,
  juniorWeekly,
  owedToExits,
  readJuniorStatus,
  settleDue,
  syncSenior,
} from "../src/exec/junior.js";
import { parseArgs } from "../src/config.js";
import { run } from "../src/index.js";
import { cfg, fakeFetch, placeholderCfg } from "./helpers.js";

const WAD = 10n ** 18n;
const USDC = 10n ** 6n;
const JUNIOR = "0x2000000000000000000000000000000000000001";

describe("junior: recognition hours math", () => {
  it("H = coverInProgress / (totalAssets * maxRate * 3600 / 1e18)", () => {
    // 10% per year as a per-second WAD rate on a 2M USDC senior vault
    const maxRate = (WAD / 10n) / (365n * 24n * 3600n);
    const total = 2_000_000n * USDC;
    const perHour = Number((total * maxRate * 3600n) / WAD); // about 22.83 USDC per hour
    const cover = 1_000n * USDC;
    expect(hoursToRecognition(cover, total, maxRate)).toBeCloseTo(Number(cover) / perHour, 6);
    expect(hoursToRecognition(cover, total, maxRate)).toBeCloseTo(43.8, 0);
  });

  it("is 0 with no cover and Infinity with a zero rate", () => {
    expect(hoursToRecognition(0n, 1n, 1n)).toBe(0);
    expect(hoursToRecognition(5n, 1_000n, 0n)).toBe(Infinity);
    expect(coverLine(0, 0)).toBe("cover in progress: 0 USDC, about 0 hours to full recognition");
    expect(coverLine(1000, 43.8)).toContain("about 43.8 hours");
  });
});

describe("junior: maturity check math", () => {
  it("owed = pendingExitShares * pricePerShare / 1e18 / 1e12 in USDC base units", () => {
    const shares = 1_500n * WAD; // 1500 shares, 18 decimals
    const pps = (105n * WAD) / 100n; // 1.05 USDC per share
    expect(owedToExits(shares, pps)).toBe(1_575n * USDC);
    expect(owedToExits(0n, pps)).toBe(0n);
    expect(owedToExits(shares, 0n)).toBe(0n);
  });

  it("flags a shortfall only when idle is below what matures", () => {
    const owed = 1_575n * USDC;
    expect(exitShortfall(2_000n * USDC, owed)).toBe(0n);
    expect(exitShortfall(owed, owed)).toBe(0n);
    expect(exitShortfall(1_000n * USDC, owed)).toBe(575n * USDC);
  });

  it("settle is due at lastSettle + 7 days - 1 hour", () => {
    const last = 1_700_000_000n;
    expect(settleDue(last + SETTLE_PERIOD - SETTLE_GRACE - 1n, last)).toBe(false);
    expect(settleDue(last + SETTLE_PERIOD - SETTLE_GRACE, last)).toBe(true);
    expect(settleDue(last + SETTLE_PERIOD + 10n, last)).toBe(true);
  });
});

function fakeClient(values: { cover?: bigint; pending?: bigint; pps?: bigint; idle?: bigint; lastSettle?: bigint; maxRate?: bigint; total?: bigint }) {
  const calls: string[] = [];
  const client = {
    readContract: async (args: { functionName: string }) => {
      calls.push(args.functionName);
      switch (args.functionName) {
        case "coverInProgress": return values.cover ?? 0n;
        case "pendingExitShares": return values.pending ?? 0n;
        case "pricePerShare": return values.pps ?? WAD;
        case "balanceOf": return values.idle ?? 0n;
        case "lastSettle": return values.lastSettle ?? 0n;
        case "maxRate": return values.maxRate ?? 0n;
        case "totalAssets": return values.total ?? 0n;
        // Felix position reads used by the settle-day recall: nothing parked in these tests
        case "maxWithdraw": return 0n;
        case "convertToAssets": return 0n;
        default: throw new Error(`unexpected ${args.functionName}`);
      }
    },
    simulateContract: async () => { throw new Error("must not simulate in dry-run"); },
  } as unknown as PublicClient;
  return { client, calls };
}

describe("junior: dry-run behaviour", () => {
  it("skips everything while junior is a placeholder", async () => {
    const log: string[] = [];
    const c = placeholderCfg();
    const sync = await syncSenior({ cfg: c, dryRun: true, log: (l) => log.push(l) });
    const status = await readJuniorStatus({ cfg: c, dryRun: true });
    const weekly = await juniorWeekly({ cfg: c, dryRun: true });
    expect(sync.called).toBe(false);
    expect(status.enabled).toBe(false);
    expect(weekly.checked).toBe(false);
    expect(log[0]).toMatch(/placeholder/);
  });

  it("reads cover status and logs that syncSenior would be called", async () => {
    const c = placeholderCfg();
    c.junior = JUNIOR;
    const maxRate = (WAD / 10n) / (365n * 24n * 3600n);
    const { client, calls } = fakeClient({ cover: 1_000n * USDC, maxRate, total: 2_000_000n * USDC });
    const log: string[] = [];
    const sync = await syncSenior({ cfg: c, dryRun: true, client, log: (l) => log.push(l) });
    expect(sync.called).toBe(false);
    expect(log[0]).toMatch(/would call junior.syncSenior/);
    // senior vault is still a placeholder so totalAssets comes from the fallback and maxRate reads as 0
    const status = await readJuniorStatus({ cfg: c, dryRun: true, client, seniorTotalAssetsFallback: 2_000_000 });
    expect(status.coverInProgressUsdc).toBe(1000);
    expect(status.hoursToRecognition).toBe(Infinity);
    expect(calls).toContain("coverInProgress");
    expect(calls).not.toContain("maxRate");
  });

  it("weekly: warns on a shortfall and reports settle as due without sending in dry-run", async () => {
    const c = cfg();
    c.junior = JUNIOR;
    const last = 1_700_000_000n;
    const { client } = fakeClient({ pending: 1_500n * WAD, pps: (105n * WAD) / 100n, idle: 1_000n * USDC, lastSettle: last });
    const log: string[] = [];
    const res = await juniorWeekly({ cfg: c, dryRun: true, client, nowTs: last + SETTLE_PERIOD, log: (l) => log.push(l) });
    expect(res.owedUsdc).toBe(1575);
    expect(res.shortfallUsdc).toBe(575);
    expect(res.warning).toMatch(/WARNING.*575/);
    expect(res.settleDue).toBe(true);
    expect(res.settleTx).toBeUndefined();
    expect(res.note).toMatch(/dry-run/);
  });

  it("weekly: no warning when covered and settle not due before the window", async () => {
    const c = cfg();
    c.junior = JUNIOR;
    const last = 1_700_000_000n;
    const { client } = fakeClient({ pending: 100n * WAD, pps: WAD, idle: 500n * USDC, lastSettle: last });
    const res = await juniorWeekly({ cfg: c, dryRun: true, client, nowTs: last + 3n * 24n * 3600n });
    expect(res.warning).toBeUndefined();
    expect(res.settleDue).toBe(false);
  });

  it("a full tick carries junior fields in the report", async () => {
    const opts = parseArgs(["--dry-run", "--fixture", "test/fixtures/state.json", "--weekly"], {}, new Date("2026-11-07T12:00:00Z"));
    opts.opsDir = `${process.env.TMPDIR ?? "/tmp"}/orphic-junior-${Date.now()}`;
    const report = await run(opts, placeholderCfg(), { fetchFn: fakeFetch(), client: null });
    expect(report.juniorSync?.called).toBe(false);
    expect(report.juniorStatus?.enabled).toBe(false);
    expect(report.juniorWeekly?.checked).toBe(false);
    expect(report.summary.some((l) => l.startsWith("syncSenior:"))).toBe(true);
  });
});
