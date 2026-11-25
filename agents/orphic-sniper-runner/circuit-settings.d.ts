export {};
declare module "circuit:sdk" {
  interface AgentSettings {
    readonly "minMcapUsd": number;
    readonly "takeProfitPct": number;
    readonly "stopLossPct": number;
  }
}
