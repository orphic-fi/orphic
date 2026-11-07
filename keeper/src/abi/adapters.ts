// ABI fragments shared by MorphoMarketV1AdapterV2 and MorphoVaultV1Adapter.
export const adapterAbi = [
  {
    type: "function",
    name: "realAssets",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "assets", type: "uint256" }],
  },
  {
    type: "function",
    name: "adapterId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
] as const;

// Only on MorphoMarketV1AdapterV2: supply assets held in one Morpho Blue market.
export const marketAdapterAbi = [
  ...adapterAbi,
  {
    type: "function",
    name: "expectedSupplyAssets",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// MarketParams tuple as used by Morpho Blue and the market adapter's `data` argument.
export const marketParamsAbi = {
  type: "tuple",
  components: [
    { name: "loanToken", type: "address" },
    { name: "collateralToken", type: "address" },
    { name: "oracle", type: "address" },
    { name: "irm", type: "address" },
    { name: "lltv", type: "uint256" },
  ],
} as const;
