import { readFileSync } from "node:fs";
import { encodeAbiParameters, keccak256, type Address, type Hex, type PublicClient } from "viem";
import type { SeniorConfig } from "../config.js";
import type { MarketData, MarketParams, VaultState } from "../types.js";
import { vaultV2Abi } from "../abi/vaultV2.js";
import { adapterAbi, marketAdapterAbi, marketParamsAbi } from "../abi/adapters.js";
import { erc20Abi } from "../abi/erc20.js";

const WAD = 1e18;

/** `data` argument for the MorphoMarketV1 adapter: abi.encode(MarketParams). */
export function encodeMarketParams(p: MarketParams): Hex {
  return encodeAbiParameters([marketParamsAbi], [p]);
}

/** Vault V2 id for one market under the market adapter: keccak256(abi.encode("this/marketParams", adapter, params)). */
export function marketCapId(adapter: Address, p: MarketParams): Hex {
  return keccak256(encodeAbiParameters([{ type: "string" }, { type: "address" }, marketParamsAbi], ["this/marketParams", adapter, p]));
}

/** Vault V2 id for a whole adapter: keccak256(abi.encode("this", adapter)). */
export function adapterCapId(adapter: Address): Hex {
  return keccak256(encodeAbiParameters([{ type: "string" }, { type: "address" }], ["this", adapter]));
}

/** Vault V2 id for a collateral token group: keccak256(abi.encode("collateralToken", token)). */
export function collateralCapId(token: Address): Hex {
  return keccak256(encodeAbiParameters([{ type: "string" }, { type: "address" }], ["collateralToken", token]));
}

export interface StateFixture {
  totalAssets: number;
  idle: number;
  positions: Record<string, number>;
  caps?: Record<string, { absoluteCap: number; relativeCap: number }>;
}

export function loadStateFixture(path: string, cfg: SeniorConfig): VaultState {
  const raw = JSON.parse(readFileSync(path, "utf8")) as StateFixture;
  const positions: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw.positions)) positions[k.toLowerCase() === "felix" ? "felix" : k.toLowerCase()] = v;
  const sum = raw.idle + Object.values(positions).reduce((a, b) => a + b, 0);
  const totalAssets = raw.totalAssets ?? sum;
  if (Math.abs(sum - totalAssets) > 1) {
    throw new Error(`fixture inconsistent: idle + positions = ${sum}, totalAssets = ${totalAssets}`);
  }
  return {
    totalAssets,
    idle: raw.idle,
    positions,
    caps: normaliseCaps(raw.caps ?? cfg.dryRunCaps),
    source: "fixture",
  };
}

function normaliseCaps(caps: Record<string, { absoluteCap: number; relativeCap: number }>) {
  const out: Record<string, { absoluteCap: number; relativeCap: number }> = {};
  for (const [k, v] of Object.entries(caps)) out[k === "felix" ? "felix" : k.toLowerCase()] = v;
  return out;
}

/**
 * Current allocation from chain: per-market supply through the market adapter,
 * Felix through the vault adapter's realAssets(), idle via USDC balanceOf(vault),
 * and caps via absoluteCap(id) / relativeCap(id).
 */
export async function readVaultState(cfg: SeniorConfig, client: PublicClient, markets: MarketData[]): Promise<VaultState> {
  const vault = cfg.vault as Address;
  const marketAdapter = cfg.adapters.morphoMarketV1 as Address;
  const vaultAdapter = cfg.adapters.morphoVaultV1 as Address;
  const scale = 10 ** cfg.usdcDecimals;

  const [idleRaw, totalRaw, felixRaw] = await Promise.all([
    client.readContract({ address: cfg.usdc, abi: erc20Abi, functionName: "balanceOf", args: [vault] }),
    client.readContract({ address: vault, abi: vaultV2Abi, functionName: "totalAssets" }),
    client.readContract({ address: vaultAdapter, abi: adapterAbi, functionName: "realAssets" }),
  ]);

  const positions: Record<string, number> = { felix: Number(felixRaw) / scale };
  const caps: VaultState["caps"] = {};

  const felixId = adapterCapId(vaultAdapter);
  const [fAbs, fRel] = await Promise.all([
    client.readContract({ address: vault, abi: vaultV2Abi, functionName: "absoluteCap", args: [felixId] }),
    client.readContract({ address: vault, abi: vaultV2Abi, functionName: "relativeCap", args: [felixId] }),
  ]);
  caps.felix = { absoluteCap: Number(fAbs) / scale, relativeCap: Number(fRel) / WAD };

  for (const m of markets) {
    const [pos, abs, rel] = await Promise.all([
      client.readContract({ address: marketAdapter, abi: marketAdapterAbi, functionName: "expectedSupplyAssets", args: [m.id] }),
      client.readContract({ address: vault, abi: vaultV2Abi, functionName: "absoluteCap", args: [marketCapId(marketAdapter, m.params)] }),
      client.readContract({ address: vault, abi: vaultV2Abi, functionName: "relativeCap", args: [marketCapId(marketAdapter, m.params)] }),
    ]);
    positions[m.id] = Number(pos) / scale;
    caps[m.id] = { absoluteCap: Number(abs) / scale, relativeCap: Number(rel) / WAD };
  }

  // Sanity: the sum of adapter realAssets plus idle should be close to totalAssets.
  const marketTotal = await client.readContract({ address: marketAdapter, abi: adapterAbi, functionName: "realAssets" });
  const recon = Number(idleRaw) / scale + Number(felixRaw) / scale + Number(marketTotal) / scale;
  const total = Number(totalRaw) / scale;
  if (total > 0 && Math.abs(recon - total) / total > 0.01) {
    throw new Error(`state reconciliation failed: idle + adapters = ${recon}, vault.totalAssets = ${total}`);
  }

  return { totalAssets: total, idle: Number(idleRaw) / scale, positions, caps, source: "chain" };
}
