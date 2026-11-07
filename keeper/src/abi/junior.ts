// JuniorVault read and write fragments used by the keeper.
export const juniorAbi = [
  { type: "function", name: "syncSenior", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "settle", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "coverInProgress", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "pendingExitShares", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "pricePerShare", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "lastSettle", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
] as const;
