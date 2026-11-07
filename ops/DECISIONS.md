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
