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
After an uncovered loss (a settle that could not pay the whole shortfall, see L9) the window stays open: `syncSenior()` refuses to move the baseline while senior sits below it, so senior shares bought after that loss are not covered until the first loss-free sync, which comes once the carried remainder is paid or senior's price recovers.

## L5. Junior exits need idle USDC
`claimExit` pays only from the contract's USDC balance. The Rotator must return reserved assets to idle before maturities; if it does not, claims revert until it does. No user funds are at risk, only delayed.

## L6. Agent allowlist is unaudited custom code
About 40 lines. Covered by tests for the Morpho and ERC-4626 shapes used at launch. Zodiac Roles (audited) is the week-two replacement.

## L7. Portfolio principal lags up to an hour
Principal comes from the hourly index; a deposit made in the last hour shows under value but not yet under principal, so earned briefly reads negative by that amount. The page says so.

## L8. Senior APY shows n/a until Morpho indexes the vault
The Morpho API does not list the new Vault V2 yet; ask Morpho to index 0x3F7382bd8BFC6C548CAa2D7B4dfCe628B12A9759. Until then the senior card shows n/a with a note pointing at the Felix rate. The junior projected APY stays n/a until that input exists.

## L9. Junior cover is paid from idle only; an unpaid remainder is carried
`_coverSenior` pays from junior's idle USDC (net of assets reserved for priced exits); it does not pull from venues. The keeper's settle-day recall exists for this reason. If idle is short on settle day, cover is capped at idle and the unpaid part is carried: the new senior baseline is raised by `unpaid / exposed`, so the next settle sees it as a loss again and bills it (event `CoverShortfallCarried(unpaid)`), again capped at idle at that settle. The remainder is billed exactly once, and only on the shares that were exposed to the loss (the baseline supply stays at those shares): senior shares bought after an uncovered loss are not covered until the next loss-free sync (see L4). With junior idle at 0 the settle still goes through, paying 0 and carrying all of it, every week, until idle returns (measured: carried twice, then paid in full). The carry shrinks by the Felix yield senior earns meanwhile and by the 1 ppm rounding guard. Minted ERC-4626 positions in junior should stay small relative to the buffer until a permissionless cover path exists (v1).

## L10. An exit and a buy between two observations of senior's supply are still billed as one exposure
Cover is billed on `exposed = min(senior supply now, supply at the baseline, lowest supply observed since the baseline)`. Senior shares that left after a loss and were replaced by a buyer are not billed again only if `observeSenior()` (also run by `syncSenior()`, `deposit()` and the settle's own supply read) saw the lower supply between the exit and the buy. The keeper is expected to call `observeSenior()` hourly (keeper change: a later task); an exit and a buy that both fall inside the same gap stay invisible. Measured on the fork (100k senior, 2k loss, half of senior exits, a buyer enters with the same USDC, junior idle 20k): with an observation between exit and buy the bill is the no-buyer control (0.20 USDC apart); without it junior pays 925.91 USDC more than the control (1,851.44 vs 925.53). Closed by the senior receive-shares gate (a later task); until then the same L4 trust in the hourly keeper applies.

## L11. Junior pays for Felix's booked bad debt, whatever happens to it later
Senior's real price subtracts senior's pro rata share of Felix's `lostAssets` (`assets * lost / totalAssets`), so a Morpho Blue bad debt in a market Felix supplies is covered from junior's idle USDC (capped at idle, remainder carried, see L9). Felix may later recover the deficit or spread it over other depositors; junior's payment is not returned by Felix, but a recovery lifts senior's price above the baseline, so it is not billed twice. `lostAssets` is only updated when Felix is next touched, so the cover sees a bad debt at the first Felix interaction after it. Measured: 990k bad debt in Felix's largest USDC market, 1M senior, bill 48.85k vs pro rata deficit 48.88k.
