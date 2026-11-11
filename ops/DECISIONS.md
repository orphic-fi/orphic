# Orphic decision log

Saturday 7 November 2026. Each entry: what was decided, by whom, why, and what it changes. Later entries override earlier ones.

## D1. Senior is a Morpho Vault V2 (Claude, from verified facts; brief allowed either)
V2 factory `0xD7217E5687FF1071356C780b5fe4803D9D967da7` exists on HyperEVM, byte-identical to Ethereum and Base, and compiles from tag `2026-10-12` of morpho-org/vault-v2. Felix already runs V2. V2 gives the management fee (the give-up), per-id caps, a liquidity adapter, `forceDeallocate` and gates with no code of ours.

## D2. Agent key: in-contract allowlist for Monday (Claude recommended, Cashout did not object)
Safe 1.4.1 and Zodiac Roles v2 are on HyperEVM with mainnet bytecode, so the audited path is available. The allowlist is about 40 lines, fully covered by tests, and has no configuration we cannot fork-test by Sunday night. Zodiac is the week-two upgrade. Unaudited lines: `JuniorVault.execute`, `setRule`, `setApprovalRule`.

## D3. Senior venue mix (Cashout, 17:33)
Targets: kHYPE/62.5% 34, kHYPE/77% 10, WHYPE/77% 20, UBTC/77% 19, Felix v1.1 15 (liquidity adapter), idle 2. HyperLend 0 (no V2 adapter). USDT0 markets 0 (a USDC vault cannot supply them). Still subject to the market data pull.

## D3a. Pending: UBTC cut (Claude proposed 18:20, awaiting Cashout)
The Rotator's IRM model projects 19% of senior into the $0.66M UBTC market drops that market from 5.3% to under 3%. Proposal: UBTC 5, kHYPE/62.5% 44. Deploy script caps already assume this shape (UBTC cap 10% of total); change `01_DeploySenior.s.sol` if rejected.

## D4. Caps are ceilings, targets live in the Rotator (Claude)
V2 deposits allocate straight into the liquidity adapter, so Felix carries the full absolute cap and 100% relative cap, otherwise deposits revert. All relative caps are 100% at launch because `relativeCap` is checked against the vault's total assets at the start of the transaction and would block the first deposits. Risk limits are the absolute caps plus the Rotator's 50%-of-pool rule. Revisit relative caps once the vault is above about $1M.

## D5. Senior is paid by USDC transfer, not `supply onBehalf` (Claude, correcting the brief)
V2 counts `asset.balanceOf(vault)` plus adapter `realAssets()`. A Morpho Blue position held directly by the vault is invisible to it. Both the FeeRouter and junior's cover transfer USDC into the senior vault; the share price rises as `accrueInterest` recognises it, bounded by `maxRate`.

## D6. maxRate = 200% APR (Claude, same as Felix)
A fresh V2 vault has `maxRate = 0` and recognises nothing. 200% a year means a 2% jump (a cover payment, say) is fully recognised in about 3.7 days; normal yield is recognised instantly.

## D7. Cover is price-based with a fee-adjusted baseline (Claude, forced by V2 accounting)
V2 marks losses on every `accrueInterest`, so there is no "recorded vs real" gap to read. Junior stores senior's share price at each settle, expects it to drift down only by the management fee, and covers any further drop from idle USDC net of assets reserved for priced exits. The new baseline includes what was paid, so a loss is covered once. Residual: if `maxRate` has not fully recognised a cover by the next settle, junior may pay a small second instalment. Acceptable at the launch cap; documented.

## D8. Exit maturity is day-aligned (Claude, found by tests)
`readyAt` is rounded up to the next UTC midnight at least 7 days out. Buckets by day, settle folds every bucket whose midnight has passed, claims price at the first settle at or after `readyAt`. Reserved assets and claim price always agree.

## D9. Seed is explicit (Claude)
`seed()` by owner funds 1 USDC of dead shares; deposits revert until seeded. Removes any first-depositor price game at the first settle.

## D10. Launch caps (brief): $500k total, junior at least 15%
Senior absolute cap $425k on each adapter id (sum of market caps above that is bounded by the collateral-group caps). Junior `depositCap` $75k. Note: V2 has no single total-deposit cap; the hard bound is the Felix cap since deposits enter there. If the Rotator has moved funds out of Felix, total can exceed $425k by what the market caps still allow (worst case about $935k). Front end shows the $425k figure; the runbook has the Rotator rule that keeps Felix cap headroom honest. A gate contract would make it exact; not Monday.

## D11. Stake quote is an owner-set rate, not an oracle (Claude, no ORPH price exists on Monday)
`stakePerAsset` = ORPH wei per 1 USDC, set when `setStakeToken` turns the gate on, adjustable by owner afterwards. Stakes are released pro rata to principal leaving, in full on full exit, at the amount staked (not re-quoted).

## D12. Big blocks (Claude, found by tests)
HyperEVM small blocks carry about 3M gas. Vault V2 creation needs more; the whole deploy sequence used 27.4M across three transactions on the fork. The deployer address must send the HyperCore `evmUserModify {usingBigBlocks: true}` action before Sunday's step 1. Runbook item 0.

## D13. Flow page needs an Orphic version (Claude)
`hl_usdc_tranche_vault_250k.html` names other projects and uses design-note numbers. Public "how it works" page is rewritten with Orphic's numbers before publish. Not shipped as is.

## D14. Fork RPC (Claude)
`rpc.hyperliquid.xyz` caps archive reads per day; `rpc.hypurrscan.io` is not archive (storage from latest, header from the pinned block, breaks Morpho math). Tests and scripts use `https://hyperliquid.drpc.org` with the fork pinned at block 50,666,000.

## D15. Independent review, fixes applied (Claude, 19:40, from `contracts/REVIEW.md`)
An agent that had not seen the code reviewed JuniorVault and FeeRouter and reproduced 8 findings on the fork. All Critical to Low items are fixed; the 8 proof-of-concept tests are now regression tests asserting the fixed behaviour (`contracts/test/review/Review.t.sol`), 26/26 green.
- C-1 cover billed on current senior supply (late depositors sniped junior): bill only shares present at the last sync; `syncSenior()` is permissionless and refuses to run while a loss is outstanding; junior `deposit()` also syncs. Junior's bill is now bounded by the real loss (fork: 1,851 paid instead of 20,001).
- H-1 same loss paid twice under maxRate lag: measure senior by real assets per share, not the rate-capped price (fork: second settle pays 0 after a 10% loss).
- H-2 approval rule on USDC was a drain path: rule targets and approval spenders must be Morpho or a registered vault.
- M-1 stake stranded after a loss: release by staked shares, full exit returns all.
- M-2 pre-settle deposit took the epoch's yield: deposits mint at the worse of frozen and live price.
- M-3 agent could deploy reserved USDC: `execute` refuses to take idle below `reservedAssets`.
- M-4 one broken venue bricked the vault: venue views are try/catch (count as zero), `removeMarket`/`removeVault` when position is zero, self cannot be added.
- M-5 owner-as-curator can manufacture a loss: procedural, see RUNBOOK (curator on a Safe distinct from junior owner before caps grow) and the banner.
- L-1 router parked totals across recipient changes; L-2 zero-supply guard; L-5 stake token can never be a venue or Morpho and the agent cannot target it; dust in reservedAssets cleared when no priced exits remain.
- L-3 notice wording: "7 days' notice, then priced at the first weekly settle after it ends" (8 to 14 days in practice). Copy updated.
Residual: the 1 ppm tolerance in the loss test means losses under 0.0001% are never covered (rounding guard). The permissionless `cover()` for v1 (LIMITATIONS L1) remains proposed, not built.

## D16. Cover v0/v1 (Cashout, 18:33)
v0 ships as reviewed. Permissionless `cover()` with hourly Rotator calls ships as v1 in week one. The recognition window is documented on the how-it-works page and shown in the app as "cover in progress".

## D17. ORPH distribution (Cashout, 18:33)
1,000,000,000 fixed supply, no owner, no mint (plain OpenZeppelin ERC-20 + permit). 60% pool seed through the launch pool; 15% treasury behind an OpenZeppelin TimelockController (3-day delay); 15% team in an OpenZeppelin VestingWalletCliff, 2-year linear vest, 6-month cliff; 10% agent and school incentives behind a second TimelockController. Script `04_DeployORPH.s.sol`, tests `ORPH.t.sol`. Only constructor wiring is ours.

## D18. ORPH lives on HyperEVM (Claude, from verified facts; Cashout's rule)
Uniswap v4 PoolManager `0x12D4Fd9C5DeDd00ab8a0bCe2CF0167bbf94b6B1F` and PositionManager `0x0d7Ab5B3db668128Aff6F70C4eBC71D7d4DA9bf9` have code on HyperEVM and are listed on Uniswap's deployments page; PositionManager points at that PoolManager; protocol fee controller unset. Stake gate, pool and vaults share one chain; Elysium gets the canonical bridged ORPH. Hook-or-no-hook for Monday awaiting Cashout (Claude recommends no hook: standard 1% pool, sole LP, fees collected weekly to the router; hook arrives with agent tokens).

## D19. Second review pass, fixes applied (Claude, 19:10)
S-1 (High) the agent could supply junior's USDC to any Morpho USDC market, including a rigged one: `execute` now decodes `MarketParams` on every Morpho call and requires a registered market. S-2 the senior baseline ignored fee shares not yet minted and would have paid junior's own fee as cover: pending fee shares are in the denominator. S-3 removed venues stayed callable: venue membership is checked at call time, approvals included. S-4 a reverting venue would have frozen a wrong price: `settle` and `deposit` refuse on an incomplete valuation and the owner can `forceRemove*` a venue without calling it; `totalAssets()` for display never freezes. S-6 raw `transfer`/`transferFrom`/`approve` selectors can never be rules, including on share tokens. All reproduced on the fork and flipped to regression tests (`test/review/Review2.t.sol`). 35/35 green.

## D20. Launch parameters (Cashout, 18:46)
Stake gate on from day one at 20%. Junior per-wallet cap $10,000 for week one only (`walletCap`, owner-settable, 0 = off). No hook, no HYPE seed: one Uniswap v4 pool on HyperEVM, HYPE/ORPH at the 1% tier, single-sided ORPH position minted through Uniswap's PositionManager at about $5k FDV, position NFT held by the Safe. Cashout makes the first deposits from treasury as the live test (about $1,000 senior, the rest junior with its ORPH stake); runbook section 6 step 10 has the read-backs.

## D21. Roles, stake rate, sweep cap (Cashout, 8 Nov 01:34)
Junior and router owner = hardware wallet `0x2DBE…FecC`; senior owner and curator = Safe `0x9EDf…5F29` after step 3, 3-day timelock on caps. Both baked into `script/Addresses.sol`; scripts broadcast as DEPLOYER explicitly and step 3 refuses until the Safe has code on HyperEVM (it does not yet). `stakePerAsset` changes go through `proposeStakePerAsset` + 3-day `applyStakePerAsset`; weekly procedure from the keeper's 7-day pool TWAP (Uniswap v4 has no on-chain TWAP, so the keeper samples hourly). Router `sweep` takes an explicit `amountIn` and is capped at `maxSweepUsdc` (25k) of oracle value per call; oracle staleness check is week one. 37/37 tests.

## D22. Ranger (Cashout, 8 Nov 01:55)
HyperEVM Uniswap v4 USDC/HYPE, ERC-4626 strategy vault funded through junior's allowlist, week one. Conditions: two-pass review before funds; single position type, no leverage or borrowing; cap 20% of junior, 30% after two clean settles; junior exits never depend on Ranger liquidity. Design: `ops/RANGER.md`.

## D23. Allocator blast radius (Claude, 8 Nov 02:55, raised by the docs pass)
Vault V2 lets any allocator call `setMaxRate` and `setLiquidityAdapterAndData` instantly; the Rotator key is an allocator. Step 3 no longer timelocks `setIsAllocator`, so the Safe can revoke a leaked key at once; everything else that adds risk stays behind 3 days. The keeper reads `maxRate` and `liquidityAdapter` every tick and alerts on change. Worst case from a leaked Rotator key is a paused yield recognition or broken deposits until the Safe revokes, never a loss of funds. Documented in RUNBOOK section 8 and the public docs.

## D24. Batched setup through multicall (Claude, 8 Nov 15:40)
VaultV2 has multicall; JuniorVault inherits OpenZeppelin Multicall (verbatim, v5) so the owner setup is 7 signatures instead of 23. The plan generator recomputes CREATE addresses after batching because the deployer nonce sequence changes; every plan is replayed on a fork before it is published.

## D25. Big blocks via a wallet-approved agent key (Claude, 8 Nov 16:15)
MetaMask refuses EIP-712 payloads whose domain chainId (1337 for Hyperliquid L1 actions) differs from the active chain. The signer page therefore has the wallet approve a throwaway API agent (user-signed action, chainId 999 accepted by the exchange API) and the agent signs evmUserModify. Same mechanism as the Hyperliquid app. The agent lives in the tab's sessionStorage and is removed by Cashout after use.

## D26. Live test split (Cashout, 8 Nov 16:47)
Own-capital test follows the tranche shape: 316 USDC senior, 80 USDC junior, not junior-heavy.

## D27. Site rebuilt in the chosen design (Cashout, 8 Nov evening)
Homepage "Descent" (always dark, serif display, orbit mark, headline "Agentic USDC. Strategies on autopilot."), app in the "Statement" direction (paper default, dark mode toggle), vault cards in the swap-style deposit/receive shape with Deposit as the single primary action. Elysium is the header network label; HyperEVM appears only in the footer read-back. No status language for agents on the homepage; Steady/Boosted naming with Senior/Junior as the sub-label. Write "onchain".

## D28. Junior cap instead of allowlist (Cashout, 8 Nov 20:20)
No redeploy. Junior depositCap goes to 5,000 USDC (plan5, fork-tested, awaiting signature); raise later with one owner call. UI shows the cap, not an allowlist.

## D29. Agent marketplace (Cashout, 8 Nov 21:25)
Eight strategy agents, each with its own token; subscribing and launching route through $ORPH under the hood while the UI says "Subscribe". Anyone can launch an agent (rules compiled to a fixed onchain policy, token seeded and paired with $ORPH, creator earns a fee share). Pages ship as a preview: strategies final, ROI and subscribers show nothing until live fills, buttons disabled until the $ORPH launch. Contracts for this are not designed yet.

## D30. Portfolio tab (Claude, 8 Nov 22:50)
Principal and earned need deposit history, and public HyperEVM RPCs cap eth_getLogs at 1000 blocks, so the Rotator workflow indexes vault events hourly into web/public/data/positions.json (state committed in keeper/ops/positions-state.json). Earned = live value of shares minus (deposits minus withdrawals and claimed exits).

## D31. Junior idle management (Claude, 9 Nov 05:00)
Hourly, the Rotator keeps a reserve idle in junior (max of exits owed, 1% of senior assets as a cover buffer, 5 USDC) and deploys the excess to Felix USDC through junior.execute; when idle falls under the reserve it pulls back. On the weekly tick it recalls everything from Felix before settle, so the cover bill and matured exits are always paid from idle. Rules used: USDC approve to Felix, Felix deposit (receiver pinned), Felix withdraw (receiver pinned). Fork-tested 9 Nov: all three pass the allowlist, NAV unchanged.

## D32. Junior shows live value next to the settled price (9 Nov 2026)
Junior's `pricePerShare` only moves at the weekly settle, so between settles the card read "earned nothing" while Felix yield and senior fee shares were accruing. The UI now computes live NAV per share = (totalAssets + senior fee shares pending to junior) / (totalSupply - pricedExitShares) and labels the difference "unsettled". Exits are still priced at settle; the live figure is display only. The keeper also calls senior.accrueInterest() once a day (permissionless, skipped when nothing is pending) so the minted fee shares exist onchain between settles instead of only at settle.

## D33. No Elysium entry contract until the exit path is settled (9 Nov 2026)
Elysium mainnet's canonical withdrawal to HyperEVM is about 5.5 days. An entry contract that pulls user USDC from Elysium to the vaults would strand deposits in the bridge for most of a week. Decision: deposits happen on HyperEVM; the site says so and links the canonical bridge with both durations; Kinetiq asked whether a fast bridge is planned. Revisit when they answer.

## D34. The Rotator moves to Circuit; GitHub becomes the watchdog (9 Nov 2026)
Tested on a HyperEVM fork with Circuit's local engine: identical decisions to the GitHub keeper, privileged sends go through
junior.execute and senior allocate as before, and a wallet without the roles is refused at simulation. The agent key moves from
a GitHub Actions secret to Circuit's passkey-guarded wallet; the blast radius is unchanged because the contracts, not the runner,
bound what the key can do. GitHub keeps the hourly clock as a watchdog with permissionless fallbacks and alerts, so Circuit being
down degrades to "the vaults still settle and accrue, and we are told", never to "nothing happens". The session's starting asset
is HYPE on Elysium so the agent is an Elysium agent in Circuit's catalogue; its transactions target HyperEVM where the vaults are.
Shadow week first (dryRun=true), then the two role transactions.

## D35. $ORPH, junior staking and the agent marketplace launch on Elysium (9 Nov 2026)
Decided with Cashout. Vault settlement stays on HyperEVM until a lending venue exists on Elysium.

## D36. Felix bad debt reaches the cover through a baseline snapshot; junior pays for it (12 Nov 2026)
MetaMorpho v1.1 books a Morpho Blue bad debt as `lostAssets` inside its `totalAssets`, so Felix's share price and the Felix adapter's `realAssets` do not move and Vault V2 never marks it. Rejected in review, in order: (1) subtract `realAssets * lost / totalAssets` from senior's price (junior's view net while V2 values Felix gross: the same deficit billable on every senior turnover, outsider grief by deposits, try/catch not surviving a codeless or malformed probe); (2) baseline of the ratio `lost / lastTotalAssets` (moves with Felix flows: deposit big, `syncSenior()`, withdraw, settle bills a swing); (3) baseline of absolute `lostAssets` divided by the LIVE `lastTotalAssets` and the live adapter assets (a free flash loan deposited into Felix or senior right before the settle shrinks the bill to `delta * s * T / (T + X)`, then the baseline re-snaps and the rest is gone). Chosen: `_seniorRealPrice` stays gross; every baseline reset rebuilds an array of snapshot entries (Felix vault, `lostBase`, `assetsBase`, `totalBase`) for the adapters listed at that moment whose probe succeeds, plus `felixSnapSupply`; the settle owes `assetsBase * (lost - lostBase) / totalBase * exposed / felixSnapSupply` per entry, read from a single live probe of `lostAssets`, so nothing live can move the term; `syncSenior()` only observes while any entry is above the 1 ppm guard. Probes are low-level, gas-capped, one 32-byte word. Policy: junior pays for a booked deficit Felix may later recover; guarantees and residuals (snapshot age, allocator, new adapters) in LIMITATIONS L11. The `Cover` event field is now `owed` (same ABI) and no `Cover(0, 0)` is emitted. Gas (cold fork, origin/main to now): deposit 776,739 to 844,412; `syncSenior` 582,291 to 606,786; `settle` 794,859 to 828,062.

Superseded by v4 (below), kept for the record. v3 (rejected): the snapshot (vault, lostBase, assetsBase, totalBase, supply) was rebuilt at every baseline reset, so it ran inside permissionless `syncSenior()`, `deposit()` and the end of `settle()`. A flash deposit X into Felix, a `syncSenior()` (the gross price is unmoved, so the sync succeeds) and a redeem left `totalBase = T + X`, and every later Felix loss was billed `A * dL / (T + X)`; backrunning each keeper sync kept it poisoned, and a flash through senior skewed assets and supply the same way. The v3 tests played their flows only after the snapshot and could not see it.

**v4 (chosen, 12 Nov 2026, made by the orchestrator).** Split the snapshot. `lostBase` per Felix vault (a scalar flows cannot move) is re-taken at every baseline reset. The EXPOSURE (senior's Felix shares over the vault's supply, the adapter's assets, senior's supply) is re-taken only by `snapFelixExposure()`, callable by the agent or the owner; the permissionless `syncSenior`, `deposit`, `settle`, `observeSenior` never touch it. `snapFelixExposure()` keeps each existing vault's `lostBase`, so it forgives nothing while the vault stays listed and probes (an adapter that is removed or fails a probe drops out with its base: LIMITATIONS L11 item 8). The bill is the sum over vaults of `(lost now - lostBase) * fraction`, scaled to exposed over the snapshot supply. The 1 ppm dust guard on sync is kept (made by agent (worker), accepted by the orchestrator). Break-it: with the permissionless sync made to re-take the exposure (v3 behaviour), the flash-around-sync, flash-around-junior-deposit and flash-into-senior tests go red (bills 10,195 and 15,723 USDC against independent figures of 34,346 and 34,350), and green again on the real code. Residuals in LIMITATIONS L11 (age, allocator both ways, trusted-key timing, unbooked loss at the NAV, flash round trip changing Felix's real loss). Gas (cold fork, origin/main to now): deposit 776,739 to 809,014; `syncSenior` 582,291 to 594,030; `settle` 794,859 to 809,732; `snapFelixExposure` 471,430 (agent or owner, hourly). JuniorVault runtime 24,569 B of 24,576 (default profile: optimizer 200, via_ir false). An optional guard that makes `snapFelixExposure` a no-op while a booked Felix loss is unbilled was tried and does not fit (24,586 B); recorded as skipped, with a keeper rule instead (L11 item 3).

D36 addendum (12 Nov 2026, made by the orchestrator): the Felix term is `felixOwed * min(exposed, felixExpSupply) / felixExpSupply`. `exposed` comes from the live baseline supply, which a loss-free flash `syncSenior()` resets to the flash-inflated supply, while `felixExpSupply` is the gated snapshot; uncapped, a flash deposit into senior, a sync before the bad debt is crystallised, the liquidation, a Felix touch and the settle in one transaction multiplied the Felix bill by the inflation (the audit measured 8,373.27 against an independent 1,770.60; the new test, a real Morpho flash loan, measured 240,465 against 80,212 with the cap removed, 80,225 with it). Size trim to fit: `MAX_MARKETS` is now `internal` (ABI change: the `MAX_MARKETS()` getter is gone; no use of it in keeper/, agents/, web/, contracts/script, contracts/test or ops, checked by grep). Runtime 24,567 B with the default profile.

## D37. A partial cover is an explicit carried debt, and junior's NAV is net of it (12 Nov 2026)
First carry design (bump the senior baseline price by `unpaid / exposed`): measured residuals in the audit harness, (a) the next week's senior yield nets the carry (a senior holder ended -75 USDC vs the honest control on 80k), (b) a junior exit priced at the partial-cover settle used a NAV that still held the unpaid debt, so the exiter escaped its share (exiter +213, stayer -138 vs control). Chosen: `carryPerShare` (PRICE_UNIT units per exposed senior share). The baseline is the plain post-payment price; each settle owes `shortfall + carryPerShare * exposed`, pays up to idle, carries the rest (`Cover(owed, paid)` keeps its signature with `owed` now the total, plus `CoverShortfallCarried(unpaid)`); exposed is `min(supply, base, min)`, so senior exits shrink the debt and buyers cannot enlarge it; while a debt is outstanding `syncSenior` only observes. `_navComplete` deducts `carryOwed()` (clamped at 0 like `reservedAssets`), so `totalAssets()`, the cap check, `_toShares` and the settle's frozen price are all debt-net, and `_coverSenior` runs before NAV in `settle`. Never reverts: idle 0 carries, again and again, and bills once on return. Tests: `CoverFixes.t.sol` `test_C6_*` (senior and junior within 2 USDC of an honest control that paid in full; exiter and stayer priced at the NAV before the cover less the whole bill, exact to the wei on the fork).

## D38. Owner venue/rule admin lives in an external library; HyperEVM enforces EIP-170 (12 Nov 2026)
Measured 12 Nov with read-only `eth_call` creates on HyperEVM mainnet: runtime 24,576 B is accepted, 24,577 B is refused (`CreateContractSizeLimit`), initcode over 49,152 B is refused; Hyperliquid's big blocks raise gas, not code size. After fixes 1/8 JuniorVault was 24,567 B and the 2/8 fixes need about 1.3 KB more. Chosen (by the orchestrator): `VenueAdmin`, an external library with public functions, for `addMarket`, `removeMarket`, `forceRemoveMarket`, `addVault`, `removeVault`, `forceRemoveVault`, `setRule`, `setApprovalRule` and `revokeAllowances`. The `onlyOwner` check stays in JuniorVault's wrappers, ABI, events and custom errors are unchanged (`forge inspect` diff against 1582afe empty except the new items of 2/8), owner calls cost about 3.4-3.9k gas more, deposit/settle/claimExit/syncSenior are not on that path. Rejected: a lens contract (frees only 371 B and breaks keeper, web, rotator, audit tests for `coverInProgress`), `optimizer_runs` 1/50 (frees 217/115 B). `contracts/test/Size.t.sol` fails the suite if any deployable contract passes 24,576 B runtime or 49,152 B initcode. Deploy: see RUNBOOK step 2 (extra CREATE2 transaction, fixed library address).

## D39. Priced exits are paid pro rata at claim time, and deposits refuse insolvency (12 Nov 2026)
Audit E2(e). A ratio recorded at settle cannot work: the settle prices from NAV, so what a bucket is owed never exceeds NAV there and the ratio would always be 1; the shortfall appears after pricing. `claimExit` therefore reads the ratio at claim time, `min(1, max(0, holdings - carryOwed) / reservedAssets)`, pays `shares * price * ratio` and debits the reserve by the full claim, which leaves the ratio unchanged for the next claimant. Idle that covers `reservedAssets + carryOwed()` skips the valuation (gas: claimExit 92k -> 95k; the valuation path about 220k with 2 markets and 2 vaults). A reverting venue view counts as 0: if the readable holdings still cover the reserve the claim is paid in full, otherwise `VenueBroken` (cannot prove solvency; `forceRemove*` unblocks). `deposit` reverts `Insolvent()` when holdings net of the carry are below the reserve. No change to `Settle` or `settles(i)`. See L12.

## D40. Smaller 2/8 fixes (12 Nov 2026)
E6(a): `vaultAssets` adds senior's pending fee shares for the senior entry; a deposit before settle gains none of the week's fee. The extra view call raised deposit gas, so `deposit` now syncs first and prices cap, solvency and shares from ONE valuation (mean 699k -> 757k, max 1.14M -> 1.10M against 1582afe on the same tests). A4: `execute` always allows `approve(spender, 0)`; removing a vault zeroes junior's USDC allowance to it; removing a market zeroes Morpho's only when the last market is gone (Morpho serves every market, so zeroing it with others listed would break them until the agent re-approves). A7: `forceRemoveMarket`/`forceRemoveVault` pause deposits (event `DepositsPaused(true)`); the owner unpauses after re-listing. O6: a stake-rate proposal must lie in [0.5x, 2x] of the current non-zero `stakePerAsset` (`StakeRateOutOfBounds`); from a zero rate anything is accepted, and the rate cannot be proposed to 0. O7(e): `setStakeToken` zeroes the new stake token's allowance to Morpho and every listed vault. O7(f): `addVault` refuses the stake token as the vault; its `asset()` being the stake token is already impossible (`asset()` must be USDC and `setStakeToken` refuses USDC); a vault without `asset()` reverts and is not listed.
