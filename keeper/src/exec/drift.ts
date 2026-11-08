import type { Address, PublicClient } from "viem";
import { isPlaceholder, type SeniorConfig } from "../config.js";
import { vaultV2Abi } from "../abi/vaultV2.js";

export interface DriftResult {
  checked: boolean;
  maxRate?: string;
  expectedMaxRate?: string;
  liquidityAdapter?: Address;
  expectedLiquidityAdapter?: Address;
  alerts: string[];
  note: string;
}

/** Expected liquidity adapter: explicit felixAdapter when set, otherwise the MorphoVaultV1 adapter. */
export function expectedLiquidityAdapter(cfg: SeniorConfig): Address | undefined {
  if (cfg.felixAdapter && !isPlaceholder(cfg.felixAdapter)) return cfg.felixAdapter as Address;
  if (!isPlaceholder(cfg.adapters.morphoVaultV1)) return cfg.adapters.morphoVaultV1 as Address;
  return undefined;
}

/**
 * Senior config drift check. Runs every tick, dry-run included, whenever the vault
 * address is real. The keeper only reports; it never calls setMaxRate or
 * setLiquidityAdapterAndData, because the keeper's own key is the one that could
 * have been used to cause the drift.
 */
export async function checkSeniorDrift(cfg: SeniorConfig, client: PublicClient | undefined, log: (l: string) => void = console.log): Promise<DriftResult> {
  if (isPlaceholder(cfg.vault)) return { checked: false, alerts: [], note: "vault is a placeholder; drift check skipped" };
  if (!client) return { checked: false, alerts: [], note: "no RPC client; drift check skipped" };
  const vault = cfg.vault as Address;
  const [maxRate, liquidityAdapter] = await Promise.all([
    client.readContract({ address: vault, abi: vaultV2Abi, functionName: "maxRate" }),
    client.readContract({ address: vault, abi: vaultV2Abi, functionName: "liquidityAdapter" }),
  ]);
  const expectedRate = BigInt(cfg.expectedMaxRate);
  const expectedAdapter = expectedLiquidityAdapter(cfg);
  const alerts: string[] = [];
  if (BigInt(maxRate) !== expectedRate) alerts.push(`senior config drift: maxRate ${maxRate.toString()} (expected ${expectedRate.toString()})`);
  if (expectedAdapter && liquidityAdapter.toLowerCase() !== expectedAdapter.toLowerCase()) {
    alerts.push(`senior config drift: liquidityAdapter ${liquidityAdapter} (expected ${expectedAdapter})`);
  }
  for (const a of alerts) log(`WARNING: ${a}`);
  return {
    checked: true,
    maxRate: maxRate.toString(),
    expectedMaxRate: expectedRate.toString(),
    liquidityAdapter,
    expectedLiquidityAdapter: expectedAdapter,
    alerts,
    note: alerts.length ? `${alerts.length} drift alert(s)` : "maxRate and liquidityAdapter match config",
  };
}
