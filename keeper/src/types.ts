import type { Address, Hex } from "viem";
import type { AllocKey } from "./config.js";

export interface MarketParams {
  loanToken: Address;
  collateralToken: Address;
  oracle: Address;
  irm: Address;
  lltv: bigint;
}

/** One Morpho Blue USDC market, amounts in USD (USDC assumed 1:1). */
export interface MarketData {
  id: Hex;
  params: MarketParams;
  collateralSymbol: string;
  lltv: number;
  supplyAssets: number;
  borrowAssets: number;
  liquidityAssets: number;
  /** Supply APY as a fraction (0.05 = 5%). */
  supplyApy: number;
  /** Utilization as a fraction (0..1). */
  utilization: number;
  /** Morpho Blue market fee as a fraction (usually 0). */
  fee: number;
  source: "api" | "chain";
}

export interface FelixData {
  address: Address;
  totalAssets: number;
  apy: number;
  netApy: number;
  fee: number;
  source: "api" | "chain" | "fixture";
}

export interface HyperlendRate {
  token: Address;
  symbol?: string;
  /** Fractions, converted from the API's percent values. */
  supplyApr: number;
  supplyApy: number;
  borrowApr: number;
  borrowApy: number;
}

export interface MarketInputs {
  markets: MarketData[];
  felix: FelixData;
  hyperlend: HyperlendRate[];
  hypePriceUsd: number;
  hypePriceSource: "api" | "config";
  gasPriceGwei: number;
  gasPriceSource: "chain" | "config";
}

/** Current vault allocation, amounts in USDC whole units. */
export interface VaultState {
  totalAssets: number;
  idle: number;
  positions: Record<string, number>;
  caps: Record<string, { absoluteCap: number; relativeCap: number }>;
  source: "chain" | "fixture";
}

export interface Weighted {
  key: AllocKey;
  label: string;
  weight: number;
  amount: number;
}

export interface ProposalLine extends Weighted {
  targetWeight: number;
  currentAmount: number;
  delta: number;
  currentRate: number;
  projectedRate: number;
  reasons: string[];
}

export interface Proposal {
  totalAssets: number;
  lines: ProposalLine[];
  excluded: { key: string; reason: string }[];
  notes: string[];
}

export interface Decision {
  move: boolean;
  movedAmount: number;
  weeklyGainUsd: number;
  weeklyCurrentUsd: number;
  weeklyProposedUsd: number;
  gasCostUsd: number;
  slippageCostUsd: number;
  totalCostUsd: number;
  marginFactor: number;
  threshold: number;
  actions: number;
  reason: string;
}

export interface PlanStep {
  action: "deallocate" | "allocate";
  adapter: Address | "0xTODO";
  marketId: Hex | "felix";
  label: string;
  /** USDC whole units. */
  amount: number;
  /** Idle after this step, USDC whole units. */
  idleAfter: number;
}

export interface ExecutionResult {
  step: PlanStep;
  status: "simulated" | "sent" | "skipped" | "failed";
  txHash?: Hex;
  gasUsed?: string;
  postIdle?: number;
  postPosition?: number;
  error?: string;
}
