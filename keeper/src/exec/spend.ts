/**
 * Spend ledger: one line per paid move (senior or junior), so the daily cost cap can be enforced across hourly
 * runs on a fresh runner. Lives in ops/spend.jsonl and is restored/saved by the workflow cache like price samples.
 */
import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface SpendLine {
  ts: number; // unix seconds
  what: "senior" | "junior";
  costUsd: number;
  note?: string;
}

export function spendPath(opsDir: string): string {
  return resolve(opsDir, "spend.jsonl");
}

export function readSpend(opsDir: string): SpendLine[] {
  const p = spendPath(opsDir);
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split("\n")
    .filter((l) => l.trim().length)
    .map((l) => JSON.parse(l) as SpendLine);
}

export function spentSince(lines: SpendLine[], sinceTs: number): number {
  return lines.filter((l) => l.ts >= sinceTs).reduce((s, l) => s + l.costUsd, 0);
}

export function recordSpend(opsDir: string, line: SpendLine): void {
  mkdirSync(opsDir, { recursive: true });
  appendFileSync(spendPath(opsDir), JSON.stringify(line) + "\n");
}
