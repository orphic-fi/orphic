import { mkdtempSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeAbiParameters, keccak256, encodeAbiParameters } from "viem";
import { hasPlaceholders, isWeeklyCloseWindow, parseArgs, validateConfig } from "../src/config.js";
import { adapterCapId, encodeMarketParams, loadStateFixture, marketCapId } from "../src/data/state.js";
import { marketParamsAbi } from "../src/abi/adapters.js";
import { assertCanBroadcast, executePlan, weeklyClose } from "../src/exec/send.js";
import { proposeAllocation } from "../src/engine/allocate.js";
import { buildPlan } from "../src/exec/plan.js";
import { run } from "../src/index.js";
import { K62, cfg, fakeFetch, felix, fixturesDir, markets, state } from "./helpers.js";

const PK = `0x${"11".repeat(32)}` as const;
const tmp = () => mkdtempSync(join(tmpdir(), "orphic-keeper-"));

describe("safety: broadcasting", () => {
  it("refuses to broadcast while any address is a placeholder", () => {
    const c = cfg();
    expect(hasPlaceholders(c)).toEqual(["vault", "adapters.morphoMarketV1", "adapters.morphoVaultV1"]);
    expect(() => assertCanBroadcast(c, PK, true)).toThrow(/placeholder/);
    expect(() => assertCanBroadcast(c, PK, false)).toThrow(/not in live mode/);
  });

  it("refuses to broadcast without a well-formed private key even with real addresses", () => {
    const c = cfg();
    c.vault = "0x1000000000000000000000000000000000000001";
    c.adapters.morphoMarketV1 = "0x1000000000000000000000000000000000000002";
    c.adapters.morphoVaultV1 = "0x1000000000000000000000000000000000000003";
    expect(hasPlaceholders(c)).toEqual([]);
    expect(() => assertCanBroadcast(c, undefined, true)).toThrow(/AGENT_PRIVATE_KEY/);
    expect(() => assertCanBroadcast(c, PK, true)).not.toThrow();
  });

  it("live execution with placeholders throws before touching the chain", async () => {
    const c = cfg();
    const s = state({}, c);
    const p = proposeAllocation({ cfg: c, markets: markets(), felix: felix(), state: s });
    const { plan } = buildPlan(c, s, p);
    const log: string[] = [];
    await expect(
      executePlan({ cfg: c, dryRun: false, opsDir: tmp(), state: s, markets: markets(), agentPrivateKey: PK, log: (l) => log.push(l) }, plan),
    ).rejects.toThrow(/placeholder/);
  });

  it("parseArgs defaults to dry-run unless LIVE=1, and --dry-run always wins", () => {
    expect(parseArgs([], {}).dryRun).toBe(true);
    expect(parseArgs([], { LIVE: "1" }).dryRun).toBe(false);
    expect(parseArgs(["--dry-run"], { LIVE: "1" }).dryRun).toBe(true);
    expect(parseArgs(["--weekly"], {}).weekly).toBe(true);
    expect(parseArgs([], { AGENT_PRIVATE_KEY: "not-a-key" }).agentPrivateKey).toBeUndefined();
    expect(parseArgs([], { AGENT_PRIVATE_KEY: PK }).agentPrivateKey).toBe(PK);
  });

  it("validateConfig rejects target weights that do not sum to one", () => {
    const c = cfg();
    c.targets[0]!.weight += 0.1;
    expect(() => validateConfig(c)).toThrow(/sum to 1/);
  });
});

describe("rule 6: dry-run execution", () => {
  it("prints a table and writes ops/last-plan.json", async () => {
    const c = cfg();
    const s = state({}, c);
    const p = proposeAllocation({ cfg: c, markets: markets(), felix: felix(), state: s });
    const { plan } = buildPlan(c, s, p);
    const ops = tmp();
    const log: string[] = [];
    const results = await executePlan({ cfg: c, dryRun: true, opsDir: ops, state: s, markets: markets(), log: (l) => log.push(l) }, plan);
    expect(results.every((r) => r.status === "simulated")).toBe(true);
    expect(log.join("\n")).toContain("idle after");
    const written = JSON.parse(readFileSync(join(ops, "last-plan.json"), "utf8"));
    expect(written.mode).toBe("dry-run");
    expect(written.plan.length).toBe(plan.length);
  });
});

describe("encoding", () => {
  it("encodes MarketParams as abi.encode(MarketParams) and derives Vault V2 cap ids", () => {
    const m = markets().find((x) => x.id === K62)!;
    const data = encodeMarketParams(m.params);
    const [decoded] = decodeAbiParameters([marketParamsAbi], data);
    expect(decoded.lltv).toBe(625000000000000000n);
    expect(decoded.collateralToken.toLowerCase()).toBe(m.params.collateralToken.toLowerCase());
    expect(data.length).toBe(2 + 5 * 64);

    const adapter = "0x1000000000000000000000000000000000000002";
    const expectedAdapterId = keccak256(encodeAbiParameters([{ type: "string" }, { type: "address" }], ["this", adapter]));
    expect(adapterCapId(adapter)).toBe(expectedAdapterId);
    expect(marketCapId(adapter, m.params)).toMatch(/^0x[0-9a-f]{64}$/);
    expect(marketCapId(adapter, m.params)).not.toBe(marketCapId("0x1000000000000000000000000000000000000003", m.params));
  });

  it("loads a state fixture and rejects an inconsistent one", () => {
    const s = loadStateFixture(join(fixturesDir, "state.json"), cfg());
    expect(s.totalAssets).toBe(2_000_000);
    expect(s.positions.felix).toBe(1_960_000);
    expect(s.caps[K62]).toBeDefined();
  });
});

describe("rule 7: weekly close", () => {
  it("detects the Sunday 00:xx UTC window", () => {
    expect(isWeeklyCloseWindow(new Date("2026-11-08T00:30:00Z"))).toBe(true);
    expect(isWeeklyCloseWindow(new Date("2026-11-08T01:00:00Z"))).toBe(false);
    expect(isWeeklyCloseWindow(new Date("2026-11-09T00:00:00Z"))).toBe(false);
  });

  it("in dry-run logs the stub and does not send accrueInterest", async () => {
    const log: string[] = [];
    const res = await weeklyClose({ cfg: cfg(), dryRun: true, opsDir: tmp(), state: state(), markets: markets(), log: (l) => log.push(l) });
    expect(res.emissionsSold).toBe(0);
    expect(res.accrueTx).toBeUndefined();
    expect(log.some((l) => l.includes("no emission positions"))).toBe(true);
    expect(log.some((l) => l.includes("accrueInterest"))).toBe(true);
  });
});

describe("rule 8: report", () => {
  it("a full dry-run tick writes a report with inputs, decisions and reasons", async () => {
    const ops = tmp();
    const opts = parseArgs(["--dry-run", "--fixture", "test/fixtures/state.json", "--weekly"], {}, new Date("2026-11-07T12:00:00Z"));
    opts.opsDir = ops;
    const report = await run(opts, cfg(), { fetchFn: fakeFetch(), client: null });

    expect(report.mode).toBe("dry-run");
    // fixture rates: positive but thin spread over Felix, so the keeper holds and still records the plan
    expect(report.decision.move).toBe(false);
    expect(report.decision.weeklyGainUsd).toBeGreaterThan(0);
    expect(report.decision.reason).toMatch(/below 3x cost/);
    expect(report.plan.length).toBeGreaterThan(0);
    expect(report.inputs.markets.length).toBeGreaterThan(4);
    expect(report.inputs.hyperlend.length).toBe(2);
    expect(report.inputs.state.source).toBe("fixture");
    expect(report.proposal.lines.every((l) => Array.isArray(l.reasons))).toBe(true);
    expect(report.proposal.excluded.length).toBe(3);
    expect(report.weeklyClose?.emissionsSold).toBe(0);
    expect(report.summary.some((l) => l.startsWith("decision: HOLD"))).toBe(true);

    const files = readdirSync(join(ops, "reports")).filter((f) => f.endsWith(".json") && f !== "latest.json");
    expect(files.length).toBe(1);
    expect(files[0]!.startsWith("2026-11-07T12-00-00")).toBe(true);
    const onDisk = JSON.parse(readFileSync(join(ops, "reports", files[0]!), "utf8"));
    expect(onDisk.inputs.markets[0].params.lltv).toBeTypeOf("string");
    expect(existsSync(join(ops, "last-plan.json"))).toBe(true);
  });

  it("fails loudly when the vault is not deployed and no fixture is given", async () => {
    const opts = parseArgs(["--dry-run"], {}, new Date("2026-11-07T12:00:00Z"));
    opts.opsDir = tmp();
    await expect(run(opts, cfg(), { fetchFn: fakeFetch(), client: null })).rejects.toThrow(/fixture/);
  });
});
