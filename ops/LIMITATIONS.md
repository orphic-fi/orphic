# Known limitations, v0 (launch, 9 Nov 2026)

Measured on a HyperEVM fork against the real Vault V2 bytecode (`contracts/test/Recognition.t.sol`).

## L1. Senior cover is recognised over days, not at once
Measured on the fork with `coverInProgress()` exposed for the front end.
Vault V2 caps how fast its share price may rise: `maxRate`, and the protocol maximum is 200% APR (`MAX_MAX_RATE`), which we use. That is 0.548% of total assets per day. A 2% cover payment therefore closes 29% of the gap after 1 day, 58% after 2, 87% after 3, 100% after 4 (measured). The transfer itself is counted immediately in `realAssets`; only the price moves gradually. Normal yield is far below the cap and is unaffected.

What a senior holder sees after a loss: the price drops at once (V2 marks losses immediately), stays down until junior's next `settle()` (up to 7 days), then recovers over up to 3.7 days. Anyone who withdraws inside that window takes the unrecognised part of the loss; the money they leave behind goes to the holders who stayed. Nobody outside senior and junior gains.

Front end, v0: when junior reports a cover in progress, the senior panel shows "Cover in progress: n% recognised, whole in about h hours" and says plainly that withdrawing before then realises the gap. Read from `JuniorVault.coverInProgress()` (remaining USDC) and senior's `maxRate`.

Smallest fix, v1: the up-to-7-day wait for `settle()` is the larger part of the window and is ours to remove. Make `cover()` a permissionless function callable any time (same baseline logic, its own timestamp for the fee drift), and have the Rotator call it hourly when senior's price is below the fee-adjusted baseline. About 15 lines in JuniorVault, no new accounting. Window becomes about 1 hour plus up to 3.7 days. The 3.7 days cannot be removed without leaving Vault V2's accounting; a periphery that tops up senior withdrawers from junior during the window is possible but moves value between senior holders and is not recommended.

## L2. Total deposit cap on senior is soft
V2 has per-id caps, no single total cap. Deposits enter the Felix (liquidity) adapter, whose absolute cap is the launch cap, so the hard bound holds only while the Rotator has not moved funds out of Felix. Worst case about 2.2x the stated cap. Exact fix: a receive-shares gate contract (custom, small) or the Rotator shrinking the Felix cap as it deploys (sentinel role, instant). v1.

## L3. Stake is quoted at an owner-set rate
No ORPH price source exists on launch day. `stakePerAsset` is set by the owner and can be changed; existing stakes are never re-quoted.

## L4. Senior shares deposited since the last sync are uncovered until the next sync
Cover is billed only for senior shares that existed at the last `syncSenior()` (otherwise anyone could buy senior after a loss and have junior pay them). The keeper syncs hourly and every junior deposit syncs, so the uncovered window is about an hour. Double payment under maxRate lag is fixed (real-asset measurement).

## L5. Junior exits need idle USDC
`claimExit` pays only from the contract's USDC balance. The Rotator must return reserved assets to idle before maturities; if it does not, claims revert until it does. No user funds are at risk, only delayed.

## L6. Agent allowlist is unaudited custom code
About 40 lines. Covered by tests for the Morpho and ERC-4626 shapes used at launch. Zodiac Roles (audited) is the week-two replacement.
