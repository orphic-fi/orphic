// Hand-written surface of rotator-core.mjs (bundled from ../../keeper/src/agentEntry.ts).
export type Address = `0x${string}`;
export type Hex = `0x${string}`;
export interface TxRequest { to: Address; data: Hex }
export interface TxSigner {
  address: Address;
  send(tx: TxRequest, label: string): Promise<Hex>;
}
export interface RunReport {
  runAt: string;
  mode: string;
  weekly: boolean;
  decision: { move: boolean; reason: string; movedAmount: number };
  execution: Array<{ status: "sent" | "failed" | "skipped" | "simulated"; txHash?: Hex; error?: string }>;
  juniorIdle?: { action: string; note: string };
  juniorAccrue?: { called: boolean; note: string };
  juniorSync?: { called: boolean; note: string };
  juniorWeekly?: { note: string; settleTx?: Hex };
  alerts: string[];
  error?: string;
  summary: string[];
}
export interface AgentTickInput {
  signer: TxSigner;
  rpcUrl: string;
  dryRun: boolean;
  now?: Date;
  log?: (line: string) => void;
}
export function tick(input: AgentTickInput): Promise<RunReport>;
