import type { Address, Hex } from "viem";
import type { SeniorConfig } from "../config.js";
import type { PlanStep, Proposal, VaultState } from "../types.js";

const r6 = (x: number) => Math.round(x * 1e6) / 1e6;

/**
 * Rule 5: turn a proposal into an ordered list of transfers.
 *  - deallocations first, allocations after, each sorted largest first
 *  - idle never drops below minIdle during the sequence
 *  - no single transfer above maxClipFraction of vault assets
 *  - deltas below minDeltaFraction of vault assets are ignored (dust)
 */
export function buildPlan(cfg: SeniorConfig, state: VaultState, proposal: Proposal): { plan: PlanStep[]; notes: string[] } {
  const total = state.totalAssets;
  const c = cfg.constraints;
  const clip = c.maxClipFraction * total;
  const idleFloor = c.minIdle * total;
  const dust = c.minDeltaFraction * total;
  const notes: string[] = [];

  const movable = proposal.lines.filter((l) => l.key !== "idle");
  const deallocs = movable.filter((l) => l.delta < -dust).sort((a, b) => a.delta - b.delta);
  const allocs = movable.filter((l) => l.delta > dust).sort((a, b) => b.delta - a.delta);
  const dropped = movable.filter((l) => l.delta !== 0 && Math.abs(l.delta) <= dust);
  for (const d of dropped) notes.push(`${d.label}: delta ${r6(d.delta)} USDC below dust threshold, left as is`);

  const adapterFor = (key: Hex | "felix"): Address | "0xTODO" =>
    key === "felix" ? (cfg.adapters.morphoVaultV1 as Address | "0xTODO") : (cfg.adapters.morphoMarketV1 as Address | "0xTODO");

  const plan: PlanStep[] = [];
  let idle = state.idle;

  for (const l of deallocs) {
    let remaining = -l.delta;
    while (remaining > 1e-6) {
      const amount = r6(Math.min(remaining, clip));
      idle = r6(idle + amount);
      plan.push({ action: "deallocate", adapter: adapterFor(l.key as Hex | "felix"), marketId: l.key as Hex | "felix", label: l.label, amount, idleAfter: idle });
      remaining -= amount;
    }
  }

  for (const l of allocs) {
    let remaining = l.delta;
    while (remaining > 1e-6) {
      const room = idle - idleFloor;
      const amount = r6(Math.min(remaining, clip, room));
      if (amount <= 1e-6) {
        notes.push(`${l.label}: allocation short by ${r6(remaining)} USDC to keep idle at or above ${(c.minIdle * 100).toFixed(0)}%`);
        break;
      }
      idle = r6(idle - amount);
      plan.push({ action: "allocate", adapter: adapterFor(l.key as Hex | "felix"), marketId: l.key as Hex | "felix", label: l.label, amount, idleAfter: idle });
      remaining -= amount;
    }
  }

  return { plan, notes };
}

/** Independent re-check of the plan invariants. Throws on violation. */
export function validatePlan(cfg: SeniorConfig, state: VaultState, plan: PlanStep[]): void {
  const total = state.totalAssets;
  const clip = cfg.constraints.maxClipFraction * total + 1e-6;
  const idleFloor = cfg.constraints.minIdle * total - 1e-6;
  let idle = state.idle;
  let seenAllocate = false;
  for (const [i, s] of plan.entries()) {
    if (s.amount <= 0) throw new Error(`step ${i}: non-positive amount`);
    if (s.amount > clip) throw new Error(`step ${i}: amount ${s.amount} above max clip ${clip}`);
    if (s.action === "allocate") seenAllocate = true;
    if (s.action === "deallocate" && seenAllocate) throw new Error(`step ${i}: deallocate after allocate`);
    idle += s.action === "deallocate" ? s.amount : -s.amount;
    if (idle < idleFloor) throw new Error(`step ${i}: idle ${idle} below floor ${idleFloor}`);
    if (Math.abs(idle - s.idleAfter) > 1e-3) throw new Error(`step ${i}: idleAfter mismatch`);
  }
}

export function formatPlanTable(plan: PlanStep[], total: number): string {
  if (plan.length === 0) return "(empty plan)";
  const rows = plan.map((s, i) => [
    String(i + 1),
    s.action,
    s.label,
    s.marketId === "felix" ? "felix" : `${s.marketId.slice(0, 10)}..${s.marketId.slice(-4)}`,
    s.adapter === "0xTODO" ? "0xTODO" : `${s.adapter.slice(0, 8)}..`,
    s.amount.toLocaleString("en-US", { maximumFractionDigits: 2 }),
    `${((s.amount / total) * 100).toFixed(2)}%`,
    `${((s.idleAfter / total) * 100).toFixed(2)}%`,
  ]);
  const header = ["#", "action", "target", "market", "adapter", "USDC", "% vault", "idle after"];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)));
  const line = (r: string[]) => r.map((c, i) => (i >= 5 ? c.padStart(widths[i]!) : c.padEnd(widths[i]!))).join("  ");
  return [line(header), widths.map((w) => "-".repeat(w)).join("  "), ...rows.map(line)].join("\n");
}
