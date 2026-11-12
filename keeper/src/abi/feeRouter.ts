// FeeRouter fragments the keeper uses: the permissionless flush and the parked total it must not count.
export const feeRouterAbi = [
  { type: "function", name: "distribute", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "totalParked", stateMutability: "view", inputs: [{ name: "token", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
] as const;
