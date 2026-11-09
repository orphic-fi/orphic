/**
 * Writes the public Rotator summary the agents page reads (web/public/data/rotator.json) from the latest keeper
 * report. Numbers only, no keys, no addresses beyond what is already public onchain.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { keeperRoot } from "./config.js";
import type { RunReport } from "./report.js";

const src = process.argv[2] ?? resolve(keeperRoot, "ops/reports/latest.json");
const out = process.argv[3] ?? resolve(keeperRoot, "../web/public/data/rotator.json");
const r = JSON.parse(readFileSync(src, "utf8")) as RunReport;
const total = r.proposal?.totalAssets ?? null;
const publicSummary = {
  runAt: r.runAt,
  mode: r.mode,
  vaultUsd: total,
  bookApy: r.bookApy?.current ?? null,
  decision: { move: r.decision.move, reason: r.decision.reason, actions: r.decision.actions, movedAmount: r.decision.movedAmount },
  juniorIdle: r.juniorIdle ? { action: r.juniorIdle.action, note: r.juniorIdle.note, idleUsdc: r.juniorIdle.idleUsdc, felixUsdc: r.juniorIdle.felixUsdc } : undefined,
  juniorAccrue: r.juniorAccrue ? { called: r.juniorAccrue.called, note: r.juniorAccrue.note } : undefined,
  juniorSync: r.juniorSync ? { called: r.juniorSync.called, note: r.juniorSync.note } : undefined,
  alerts: r.alerts,
  allocation: (r.proposal?.lines ?? [])
    .filter((l) => l.currentAmount > 0)
    .map((l) => ({ label: l.label, share: total ? l.currentAmount / total : 0, rate: l.currentRate })),
};
mkdirSync(resolve(out, ".."), { recursive: true });
writeFileSync(out, JSON.stringify(publicSummary, null, 2) + "\n");
console.log(`rotator summary written to ${out}`);
