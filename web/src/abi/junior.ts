// Orphic junior vault. Custom contract; surface used by the UI.
export const juniorAbi = [
  { type: 'function', name: 'deposit', stateMutability: 'nonpayable', inputs: [{ name: 'assets', type: 'uint256' }, { name: 'receiver', type: 'address' }], outputs: [{ name: 'shares', type: 'uint256' }] },
  { type: 'function', name: 'requestExit', stateMutability: 'nonpayable', inputs: [{ name: 'shares', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'claimExit', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'settle', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'pricePerShare', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'stakeToken', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'depositCap', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'totalAssets', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'seeded', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'depositsPaused', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'stakedShares', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'lastSettle', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'settlesLength', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'pendingExitShares', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'reservedAssets', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'coverInProgress', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'seniorPriceBase', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  // ORPH wei required per 1 USDC unit (1e6).
  { type: 'function', name: 'stakePerAsset', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'pendingStakePerAsset', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  // Unix seconds when the pending rate can be applied; 0 = nothing pending.
  { type: 'function', name: 'stakeEta', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  // Per-wallet deposit limit in USDC (6 decimals); 0 = none.
  { type: 'function', name: 'walletCap', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'applyStakePerAsset', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  // Open exit request for an account: shares locked and the unix time the 7-day notice ends.
  { type: 'function', name: 'exitOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'shares', type: 'uint128' }, { name: 'readyAt', type: 'uint64' }, { name: 'settleHint', type: 'uint32' }] },
] as const
