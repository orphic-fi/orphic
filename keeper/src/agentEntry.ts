/**
 * Entry for the Circuit agent bundle: the same hourly run as the GitHub keeper, with the signer and logger injected
 * and no disk. Bundled by `npm run build:agent` into agents/orphic-rotator/rotator-core.mjs.
 */
import type { Address, Hex } from "viem";
import { createPublicClient, http, type PublicClient } from "viem";
import { isWeeklyCloseWindow, validateConfig, type SeniorConfig } from "./config.js";
import { run, type RunDeps } from "./index.js";
import type { TxSigner } from "./exec/signer.js";
import type { RunReport } from "./report.js";
import { hyperEvm } from "./exec/chain.js";
import seniorConfig from "../config/senior.json" with { type: "json" };

export type { TxSigner, RunReport, SeniorConfig };
export type { Address, Hex };

export interface AgentTickInput {
  signer: TxSigner;
  rpcUrl: string;
  dryRun: boolean;
  now?: Date;
  log?: (line: string) => void;
  config?: SeniorConfig;
}

export function defaultConfig(): SeniorConfig {
  const cfg = structuredClone(seniorConfig) as unknown as SeniorConfig;
  validateConfig(cfg);
  return cfg;
}

/** One Rotator tick. Weekly work (recall, settle, close) runs on its own in the Sunday 00:xx UTC hour. */
export async function tick(input: AgentTickInput): Promise<RunReport> {
  const now = input.now ?? new Date();
  const cfg = input.config ?? defaultConfig();
  cfg.rpcUrl = input.rpcUrl;
  const client = createPublicClient({ chain: hyperEvm, transport: http(input.rpcUrl) }) as PublicClient;
  const deps: RunDeps = { client, signer: input.signer, log: input.log };
  return run(
    {
      dryRun: input.dryRun,
      weekly: isWeeklyCloseWindow(now),
      configPath: "embedded",
      opsDir: undefined,
      rpcUrl: input.rpcUrl,
      agentPrivateKey: undefined,
      now,
    },
    cfg,
    deps,
  );
}
