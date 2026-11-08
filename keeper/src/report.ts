import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { JuniorStatus, JuniorWeeklyResult, SyncResult } from "./exec/junior.js";
import type { OrphPriceResult } from "./data/orph.js";
import type { DriftResult } from "./exec/drift.js";
import type { Decision, ExecutionResult, MarketInputs, PlanStep, Proposal, VaultState } from "./types.js";

export interface RunReport {
  version: 1;
  runAt: string;
  mode: "dry-run" | "live";
  weekly: boolean;
  inputs: {
    markets: MarketInputs["markets"];
    felix: MarketInputs["felix"];
    hyperlend: MarketInputs["hyperlend"];
    hypePriceUsd: number;
    hypePriceSource: string;
    gasPriceGwei: number;
    gasPriceSource: string;
    state: VaultState;
    warnings: string[];
  };
  proposal: Proposal;
  plan: PlanStep[];
  planNotes: string[];
  decision: Decision;
  execution: ExecutionResult[];
  weeklyClose?: { emissionsSold: number; accrueTx?: string; note: string };
  juniorSync?: SyncResult;
  juniorStatus?: JuniorStatus;
  juniorWeekly?: JuniorWeeklyResult;
  orphPrice?: OrphPriceResult;
  drift?: DriftResult;
  /** Top-level alerts. Non-empty makes the tick exit non-zero. */
  alerts: string[];
  /** Annualised rate of the current book, for the agents page to turn into realised return. */
  bookApy: { current: number; proposed: number };
  summary: string[];
  error?: string;
}

/** bigint-safe serialiser (MarketParams.lltv is a bigint). */
export function toJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2);
}

export function writeReport(opsDir: string, report: RunReport): string {
  const dir = resolve(opsDir, "reports");
  mkdirSync(dir, { recursive: true });
  const stamp = report.runAt.replace(/[:.]/g, "-");
  const path = resolve(dir, `${stamp}.json`);
  writeFileSync(path, toJson(report));
  writeFileSync(resolve(dir, "latest.json"), toJson(report));
  return path;
}

export function bookApy(proposal: Proposal): { current: number; proposed: number } {
  const total = proposal.totalAssets || 1;
  const current = proposal.lines.reduce((s, l) => s + l.currentAmount * l.currentRate, 0) / total;
  const proposed = proposal.lines.reduce((s, l) => s + l.amount * l.projectedRate, 0) / total;
  return { current, proposed };
}

export function humanSummary(report: Omit<RunReport, "summary">): string[] {
  const pct = (x: number) => `${(x * 100).toFixed(2)}%`;
  const usd = (x: number) => `$${x.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  const out: string[] = [];
  for (const a of report.alerts) out.push(`WARNING: ${a}`);
  out.push(`[${report.mode}] vault ${usd(report.inputs.state.totalAssets)} (${report.inputs.state.source}), idle ${pct(report.inputs.state.idle / (report.inputs.state.totalAssets || 1))}`);
  out.push(`book APY now ${pct(report.bookApy.current)}, proposed ${pct(report.bookApy.proposed)}`);
  for (const l of report.proposal.lines) {
    const arrow = Math.abs(l.delta) < 1 ? "=" : l.delta > 0 ? "+" : "-";
    out.push(`  ${arrow} ${l.label.padEnd(20)} ${pct(l.currentAmount / (report.proposal.totalAssets || 1)).padStart(7)} -> ${pct(l.weight).padStart(7)}  rate ${pct(l.currentRate)} -> ${pct(l.projectedRate)}`);
  }
  for (const e of report.proposal.excluded) out.push(`  x excluded ${e.key.slice(0, 12)}.. : ${e.reason}`);
  out.push(`decision: ${report.decision.move ? "MOVE" : "HOLD"}; ${report.decision.reason}`);
  if (report.plan.length) out.push(`plan: ${report.plan.length} steps moving ${usd(report.decision.movedAmount)}`);
  const sent = report.execution.filter((r) => r.status === "sent").length;
  const failed = report.execution.filter((r) => r.status === "failed").length;
  if (report.mode === "live") out.push(`execution: ${sent} sent, ${failed} failed, ${report.execution.length - sent - failed} skipped`);
  if (report.juniorStatus?.enabled && report.juniorStatus.coverInProgressUsdc !== undefined) out.push(report.juniorStatus.note);
  else if (report.juniorStatus) out.push(`junior: ${report.juniorStatus.note}`);
  if (report.juniorSync) out.push(`syncSenior: ${report.juniorSync.note}`);
  if (report.juniorWeekly?.warning) out.push(report.juniorWeekly.warning);
  if (report.juniorWeekly) out.push(`junior weekly: ${report.juniorWeekly.note}`);
  if (report.weeklyClose) out.push(`weekly close: ${report.weeklyClose.note}`);
  if (report.orphPrice) {
    out.push(`orph price: ${report.orphPrice.note}`);
    if (report.weekly && report.orphPrice.proposalLine) out.push(report.orphPrice.proposalLine);
    else if (report.weekly && report.orphPrice.enabled) out.push("stake rate proposal: no ORPH samples in the 7 day window");
  }
  for (const w of report.inputs.warnings) out.push(`warning: ${w}`);
  return out;
}
