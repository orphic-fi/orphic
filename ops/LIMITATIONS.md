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

## L7. Portfolio principal lags up to an hour
Principal comes from the hourly index; a deposit made in the last hour shows under value but not yet under principal, so earned briefly reads negative by that amount. The page says so.

## L8. Senior APY shows n/a until Morpho indexes the vault
The Morpho API does not list the new Vault V2 yet; ask Morpho to index 0x3F7382bd8BFC6C548CAa2D7B4dfCe628B12A9759. Until then the senior card shows n/a with a note pointing at the Felix rate. The junior projected APY stays n/a until that input exists.

## L9. Junior cover is paid from idle only
`_coverSenior` pays from junior's idle USDC; it does not pull from venues. The keeper's settle-day recall exists for this reason. If Felix were illiquid on settle day, cover would be capped at idle (the 1% buffer plus whatever is idle) and the rest recognised at the next settle. Minted ERC-4626 positions in junior should stay small relative to the buffer until a permissionless cover path exists (v1).

## L14. FeeRouter sweeps: the band bounds the drift, not the price; a snipe needs the keeper's flush (3/8)
Owner order for a swap token: `setRouter`, `setFloor`, then `seedPrice(token, price)` from a source the owner checked (seeding before `setFloor` fails closed: a new oracle clears the seed). Until seeded, `sweep` reverts `PriceNotSeeded`. `sweep` refuses when the oracle is more than `maxPriceMoveBps` (10%) from the last accepted price and more than `maxCumulativeMoveBps` (30%) from the owner's last seed, either way. The drift compounds: accepted steps can add up to the cumulative bound, and a manipulation inside the band is not refused (measured: two ~9% sandwiched sweeps paid recipients 8,984.73 and 8,190.01 USDC for 10,000 T; an outsider ratcheting 9% under the reference stopped at the cumulative bound after 3 sweeps, 5,308.81 USDC lost against the seed price on 30,000 T). A sweep moves the reference only when its oracle value is at least `maxSweepUsdc / 100`, so dust cannot walk it. A real move beyond the bound stalls sweeps until the owner calls `seedPrice`. The floor oracle must not be movable by the keeper or by the swap venue (never the spot of the swap pool); ORPH's only market is the seeded v4 pool, so it needs an oracle that does not read that pool. `setFloor` assumes an immutable oracle (re-seed after a proxy or feed change behind the same address). `maxSweepUsdc` bounds the USDC that comes out of one sweep (oracle value of `amountIn` and the measured USDC), not the value of the tokens sold; positive slippage at the cap is refused, so the keeper sizes sweeps below the cap. The keeper key still takes at most `maxSlippageBps` of `min(balance, maxSweepUsdc)` per sweep through an aggregator-style router (audit F3(a), unchanged). A positive rebase on a parked token makes the excess unparked (sellable); a negative one can leave the balance under `totalParked` (unparked 0, audit F5(e)).

`distribute()` is permissionless. Alone that does not stop a fee snipe on junior: an attacker can deposit into junior and flush the router's USDC in one transaction, minting shares before the fees are in NAV. The bound is the keeper calling `distribute()` every tick (fixes 5/8): the gain is at most one tick's fees x junior's share (25%) x the attacker's pool share. Without that flush the window is unbounded in time.

## L16. Launch scripts: what the launcher does not stop (6/8)
`SeedLauncher` removes the pool-init block (O1): a pre-initialised key can no longer stop the seed, only make it dearer for the attacker. Residuals, all pre-launch and all on the pool's own value:
1. **Public pre-signal.** The deploy of the launcher and the `ORPH.approve(launcher, 600M)` are public transactions before the seed. An attacker who sees them can pre-initialise the key and park liquidity in the way; the seed is atomic, so it cannot be blocked for free. With the default cap 0 the first run reverts and the seeder re-runs with a cap. Blocking costs the attacker gas and locked capital only: a blocked seed reverts and the attacker's position stays withdrawable; its HYPE is spent only when the seed succeeds. The approval stays: it is to the launcher, which only moves the ORPH inside `seed`.
2. **The team sells some ORPH before the sale opens, at about the launch price.** Up to the cap. Measured: liquidity straddling the opening tick took 18.57M ORPH at an average FDV of $4,961 (the launch price minus the 1% fee, which accrues to the attacker's own position); a badly placed position took 25.52M at $5,893. So the attacker does not pay a premium in general; the buyer of that ORPH gets it at the launch price and the pool opens with correspondingly less ORPH of liquidity (the position holds the remainder).
3. **The cap is the seeder's call, and the gap's tick count is a cost.** A cap far above what the team accepts lets a gap position take more ORPH early; a cap too low blocks the seed until re-run. There is no on-chain judgement of a fair amount and no price floor (a floor would reopen the free block). The re-price crosses every initialised tick: about 31k gas each (462k with none, 830k with 10 dust ranges, 1.29M with 25, 2.05M with 50, 3.58M with 100). An attacker that spreads dust positions can push the seed past a small block (2M) with roughly 50 ranges (2,054,300 gas measured at 50); seed in a big block whenever the gap holds more than about 45 initialised ranges, and if it would exceed 30M, pre-cross with ordinary capped swaps first (not atomic).
4. **Initialised above the plan with ORPH liquidity in the gap** (it needs ORPH, which only the four recipients hold before launch) reverts `PriceBlockedAbove`; an empty gap passes.
5. **Not an anti-sniper.** The launcher does nothing about buyers after the mint; the pool is open from the moment the position exists.
6. The refund goes to the caller: 1 wei of HYPE sent to the launcher makes a contract caller without a `receive` revert (`RefundFailed`); the planned caller is an EOA (the deployer). The NFT owner contract and `HYPE_USD_REF_E8` are the operator's inputs: the script checks that the owner has code (and is not an EIP-7702 delegation), not that it is a Safe, and that the two prices agree, not that either is right.

## L17. Open junior Lows (audit fixes 2/8), not applied to JuniorVault v1.2 (merge of audit fixes with main, 25 Nov 2026)
`src/JuniorVault.sol` is byte-identical to the live v1.2 (and v1.1 logic): the source still matches the deployed bytecode. It is 24,393 B, 183 B under EIP-170 (24,576 B, enforced on HyperEVM, measured 12 Nov). The audit's own junior rewrite fitted only by moving venue and rule admin into an external library (`VenueAdmin`, about 1.3 KB freed), which means a new junior deploy. These Lows are therefore open until the next junior redeploy; each needs the library (or equal savings elsewhere) and its tests re-created against that build.
- **A4. Revoking an approval.** `execute` should always allow `approve(spender, 0)`, and removing a vault should zero junior's USDC allowance to it (removing the last market zeroes Morpho's). Today a removed venue keeps its allowance, so only `execute`'s listed-venue check protects it. Fix: allow the zero-amount approve for USDC/listed vaults in `execute`; clear the allowance in `removeVault`/`forceRemoveVault` and `removeMarket` (last market).
- **A7. `forceRemoveMarket` / `forceRemoveVault` do not pause deposits.** After a force-remove the valuation silently drops that position, so a deposit prices shares against a NAV missing it. Fix: set `depositsPaused` and emit `DepositsPaused(true)` in both; the owner unpauses after re-listing.
- **E6(a). A deposit before the settle gains none of the week's fee.** `vaultAssets` does not add senior's pending management-fee shares for the senior entry, so a depositor just before the settle takes part of the fee that accrued before them. Fix: add `accrueInterestView`'s pending fee shares to the senior entry of the valuation, and price cap, solvency and shares from one valuation.
- **O6. Stake-rate proposal has no bounds.** `proposeStakePerAsset` accepts any value. Fix: require the proposal in [0.5x, 2x] of a non-zero current rate (`StakeRateOutOfBounds`), and never accept 0 from a non-zero rate.
- **O7(e). `setStakeToken` does not zero the new stake token's allowances.** Fix: zero its allowance to Morpho and every listed vault (and lender) at the call.
- **O7(f). `addVault` accepts the stake token as a vault.** Fix: refuse `vault == stakeToken` in `addVault` (and `addLender`).

## L18. Keeper: junior's senior fee shares are not recalled
The fix branch's keeper redeemed junior's own senior fee shares (`senior.redeem(shares, junior, junior)` through `execute`) when idle fell below the reserve. main's keeper (`juniorRotate.ts` `recallAll`) recalls Felix and HyperLend only. Fee shares are small today (about 0.03 USDC after the first settle) but are part of junior's NAV and are not idle, so a large exit claim could meet `InsufficientLiquidity` until someone redeems them. Fix when fee shares grow: add a senior-redeem step to `recallAll` (the `senior.redeem` rule is already set by 02/06/07).

## L19. FeeRouter F1/F2 are in the source but the live router is the old one
`FeeRouter.sol` (parked netting, seeded two-anchor price band, measured USDC cap, permissionless `distribute`) is the fixed version; the live router `0xC2d2…aA37` is the old build. Using the fix needs a new router deployed and wired (recipients, `setRouter`, `setFloor`, `seedPrice`, junior/treasury recipients). There is no deploy plan for it yet (the audit's plan 06a-06d was removed in this merge because it targeted a full migration that main executed differently).
