import type { Hex, PublicClient } from "viem";
import { hasPlaceholders, isWeeklyCloseWindow, loadConfig, loadDotEnv, parseArgs, type RunOptions, type SeniorConfig } from "./config.js";
import { loadMorphoData, makePublicClient, type FetchLike } from "./data/morpho.js";
import { fetchHyperlend } from "./data/hyperlend.js";
import { loadStateFixture, readVaultState } from "./data/state.js";
import { decide, proposeAllocation } from "./engine/allocate.js";
import { buildPlan, validatePlan } from "./exec/plan.js";
import { executePlan, weeklyClose, type ExecContext } from "./exec/send.js";
import { accrueSenior, juniorWeekly, readJuniorStatus, syncSenior, type JuniorCtx } from "./exec/junior.js";
import { manageJuniorIdle } from "./exec/juniorDeploy.js";
import { sampleOrphPrice } from "./data/orph.js";
import { checkSeniorDrift } from "./exec/drift.js";
import { bookApy, humanSummary, writeReport, type RunReport } from "./report.js";
import type { ExecutionResult, HyperlendRate, VaultState } from "./types.js";

export interface RunDeps {
  fetchFn?: FetchLike;
  client?: PublicClient | null;
}

export async function run(opts: RunOptions, cfg: SeniorConfig = loadConfig(opts.configPath), deps: RunDeps = {}): Promise<RunReport> {
  const log = (l: string) => console.log(l);
  const runAt = opts.now.toISOString();
  const mode = opts.dryRun ? "dry-run" : "live";
  const warnings: string[] = [];
  const placeholders = hasPlaceholders(cfg);

  log(`orphic keeper tick ${runAt} [${mode}]`);
  if (placeholders.length) log(`config has placeholder addresses (${placeholders.join(", ")}): on-chain vault reads disabled`);

  // RPC client is optional in dry-run (fixture state) but used for the market fallback when reachable.
  let client: PublicClient | undefined;
  if (deps.client === null) {
    warnings.push("RPC disabled for this run");
  } else if (deps.client) {
    client = deps.client;
  } else {
    try {
      client = makePublicClient(opts.rpcUrl);
    } catch (err) {
      warnings.push(`no RPC client: ${(err as Error).message}`);
    }
  }
  const fetchFn = deps.fetchFn ?? fetch;

  // Rule 1: live market data with on-chain fallback.
  const targetMarketIds = cfg.targets.filter((t) => t.key !== "felix" && t.key !== "idle").map((t) => t.key as Hex);
  const morpho = await loadMorphoData(cfg, { client, fetchFn, marketIds: targetMarketIds });
  warnings.push(...morpho.warnings);

  // HyperLend: data only, for the dashboard.
  let hyperlend: HyperlendRate[] = [];
  try {
    hyperlend = await fetchHyperlend(cfg.hyperlendApi, fetchFn);
  } catch (err) {
    warnings.push(`HyperLend fetch failed: ${(err as Error).message}`);
  }

  // Gas price: chain when reachable, config otherwise.
  let gasPriceGwei = cfg.economics.fallbackGasPriceGwei;
  let gasPriceSource: "chain" | "config" = "config";
  if (client) {
    try {
      gasPriceGwei = Number(await client.getGasPrice()) / 1e9;
      gasPriceSource = "chain";
    } catch (err) {
      warnings.push(`gas price read failed: ${(err as Error).message}`);
    }
  }

  // Rule 2: current allocation.
  let state: VaultState;
  if (placeholders.length === 0 && client) {
    state = await readVaultState(cfg, client, morpho.markets.filter((m) => targetMarketIds.includes(m.id)));
  } else if (opts.fixturePath) {
    state = loadStateFixture(opts.fixturePath, cfg);
  } else {
    throw new Error("vault not deployed (placeholder addresses) and no --fixture given; cannot compute current allocation");
  }

  // Senior config drift: report only, never fix.
  let drift: RunReport["drift"];
  try {
    drift = await checkSeniorDrift(cfg, client, log);
  } catch (err) {
    drift = { checked: false, alerts: [], note: `drift check failed: ${(err as Error).message}` };
    warnings.push(drift.note);
  }

  // Rules 3 to 5.
  const proposal = proposeAllocation({ cfg, markets: morpho.markets, felix: morpho.felix, state });
  const { plan, notes: planNotes } = buildPlan(cfg, state, proposal);
  validatePlan(cfg, state, plan);
  const decision = decide({ cfg, proposal, plan, hypePriceUsd: morpho.hypePriceUsd, gasPriceGwei });

  const ctx: ExecContext = { cfg, dryRun: opts.dryRun, opsDir: opts.opsDir, state, markets: morpho.markets, client, agentPrivateKey: opts.agentPrivateKey, log };

  // Rule 6.
  let execution: ExecutionResult[] = [];
  let error: string | undefined;
  try {
    if (decision.move) execution = await executePlan(ctx, plan);
    else {
      log(`HOLD: ${decision.reason}`);
      if (plan.length) await executePlan({ ...ctx, dryRun: true }, plan).then(() => undefined);
    }
  } catch (err) {
    error = (err as Error).message;
    log(`execution error: ${error}`);
  }

  // Junior: hourly syncSenior after the allocation step, plus cover status for the report.
  const jctx: JuniorCtx = {
    cfg,
    dryRun: opts.dryRun,
    client,
    agentPrivateKey: opts.agentPrivateKey,
    seniorTotalAssetsFallback: state.totalAssets,
    nowTs: BigInt(Math.floor(opts.now.getTime() / 1000)),
    log,
  };
  let juniorSync: RunReport["juniorSync"];
  let juniorAccrue: RunReport["juniorAccrue"];
  let juniorStatus: RunReport["juniorStatus"];
  // Daily nudge first, so a sync in the same tick sees the freshly minted fee shares.
  try {
    juniorAccrue = await accrueSenior(jctx);
  } catch (err) {
    juniorAccrue = { called: false, note: `accrue failed: ${(err as Error).message}` };
    log(juniorAccrue.note);
  }
  try {
    juniorSync = await syncSenior(jctx);
  } catch (err) {
    juniorSync = { called: false, note: `syncSenior failed: ${(err as Error).message}` };
    log(juniorSync.note);
  }
  try {
    juniorStatus = await readJuniorStatus(jctx);
  } catch (err) {
    juniorStatus = { enabled: true, note: `junior status read failed: ${(err as Error).message}` };
    warnings.push(juniorStatus.note);
  }
  // Junior idle: deploy excess to Felix or pull back to the reserve. Skipped on weekly ticks, where the recall
  // before settle takes precedence.
  let juniorIdle: RunReport["juniorIdle"];
  if (opts.weekly) {
    juniorIdle = { checked: false, action: "skipped", note: "weekly tick: idle management deferred to the settle recall" };
  } else {
    try {
      juniorIdle = await manageJuniorIdle({ ...jctx, log });
    } catch (err) {
      juniorIdle = { checked: false, action: "skipped", note: `junior idle management failed: ${(err as Error).message}` };
      warnings.push(juniorIdle.note);
    }
  }

  // ORPH price record (Uniswap v4 has no on-chain TWAP). Never sends anything.
  let orphPrice: RunReport["orphPrice"];
  try {
    const res = await sampleOrphPrice({ cfg, opsDir: opts.opsDir, client, hypeUsd: morpho.hypePriceUsd, nowTs: Math.floor(opts.now.getTime() / 1000), log });
    orphPrice = res.result;
    warnings.push(...res.warnings);
  } catch (err) {
    orphPrice = { enabled: true, sampleCount: 0, note: `ORPH price sample failed: ${(err as Error).message}` };
    warnings.push(orphPrice.note);
  }

  // Rule 7.
  let weekly: RunReport["weeklyClose"];
  let juniorWeeklyResult: RunReport["juniorWeekly"];
  const weeklyDue = opts.weekly || isWeeklyCloseWindow(opts.now);
  if (weeklyDue) {
    // Junior maturity check and settle run before the senior close logic.
    try {
      juniorWeeklyResult = await juniorWeekly(jctx);
    } catch (err) {
      juniorWeeklyResult = { checked: false, note: `junior weekly failed: ${(err as Error).message}` };
      log(juniorWeeklyResult.note);
    }
    try {
      weekly = await weeklyClose(ctx);
    } catch (err) {
      weekly = { emissionsSold: 0, note: `weekly close failed: ${(err as Error).message}` };
    }
  }

  // Rule 8.
  const partial: Omit<RunReport, "summary"> = {
    version: 1,
    runAt,
    mode,
    weekly: weeklyDue,
    inputs: {
      markets: morpho.markets,
      felix: morpho.felix,
      hyperlend,
      hypePriceUsd: morpho.hypePriceUsd,
      hypePriceSource: morpho.hypePriceSource,
      gasPriceGwei,
      gasPriceSource,
      state,
      warnings,
    },
    proposal,
    plan,
    planNotes,
    decision,
    execution,
    weeklyClose: weekly,
    juniorSync,
    juniorAccrue,
    juniorStatus,
    juniorIdle,
    juniorWeekly: juniorWeeklyResult,
    orphPrice,
    drift,
    alerts: drift?.alerts ?? [],
    bookApy: bookApy(proposal),
    error,
  };
  const report: RunReport = { ...partial, summary: humanSummary(partial) };
  const path = writeReport(opts.opsDir, report);

  log("");
  for (const line of report.summary) log(line);
  log(`report written to ${path}`);
  return report;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (isMain) {
  loadDotEnv();
  const opts = parseArgs(process.argv.slice(2));
  run(opts)
    .then((r) => {
      // Exit 2 on config drift so the Action shows red even when everything else succeeded.
      if (r.alerts.length) process.exit(2);
      process.exit(r.error || r.execution.some((e) => e.status === "failed") ? 1 : 0);
    })
    .catch((err) => {
      console.error(`keeper failed: ${(err as Error).message}`);
      process.exit(1);
    });
}
