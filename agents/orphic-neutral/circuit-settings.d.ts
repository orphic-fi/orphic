export {};
declare module "circuit:sdk" {
  interface AgentSettings {
    readonly "minFundingApy": number;
    readonly "spotShare": number;
    readonly "liqBufferPct": number;
  }
}
