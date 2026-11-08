---
title: Risks
order: 6
---

# Risks

Read this before depositing on either side. Each item says who it affects and what, if anything, is planned.

## Known limitations at launch

These are measured on a HyperEVM fork against the real Vault V2 bytecode and are documented in `ops/LIMITATIONS.md`.

**Senior cover is recognised over days, not at once.** Affects senior. Vault V2 limits how fast its share price may rise, and Orphic uses the protocol maximum of 200% a year, which is 0.548% of total assets per day. After a loss, senior's price drops immediately, stays down until junior's next weekly settle (up to 7 days), then recovers over up to 3.7 days as the cover is recognised. A 2% cover is 29% recognised after 1 day, 58% after 2, 87% after 3, whole after 4. Anyone who withdraws inside that window takes the unrecognised part of the loss and leaves it to those who stay. The app shows "Cover in progress" with the percentage and the hours left. Planned: a permissionless `cover()` the Rotator calls hourly ships in week one, cutting the window to about 1 hour plus up to 3.7 days. The 3.7 days are Vault V2 accounting and stay.

**The senior total cap is soft.** Affects senior. Vault V2 has per-venue caps and no single total cap. Deposits enter the Felix liquidity adapter, whose cap is the stated $425,000, so the bound holds only while the Rotator has not moved funds out of Felix. Worst case about 2.2 times the stated cap. Planned: a gate contract or the Rotator shrinking the Felix cap as it deploys.

**The stake is quoted at an owner-set rate.** Affects junior. There is no ORPH price source on launch day. The owner sets `stakePerAsset`, and changes go through a 3-day timelock. Existing stakes are never re-quoted, so a depositor who entered at one rate is not asked for more and gets no refund if the rate moves.

**Senior shares deposited since the last sync are uncovered until the next one.** Affects senior. Cover is billed only for shares that existed at the last `syncSenior()`, because otherwise anyone could buy senior after a loss and have junior pay them. The keeper syncs hourly and every junior deposit syncs, so the uncovered window is about an hour. A senior deposit that is followed within the hour by a loss is not covered for that loss.

**Junior exits need idle USDC.** Affects junior. `claimExit` pays only from the contract's USDC balance. The agent cannot take idle below what priced exits are owed, but it must also bring reserved assets back to idle before maturities. If it does not, claims revert until it does. Funds are not at risk; timing is.

**The agent allowlist is unaudited custom code.** Affects junior. About 40 lines, covered by tests for the Morpho and ERC-4626 shapes used at launch. Zodiac Roles, which is audited, is the planned replacement in week two.

## Smart contract risk

Senior is Morpho Vault V2, created from Morpho's factory on HyperEVM with bytecode identical to Ethereum and Base, and the adapters are Morpho's. Orphic wrote none of it.

Junior, the fee router and the agent allowlist are custom and unaudited: about 570 lines in `JuniorVault`, about 210 in `FeeRouter`. ORPH is OpenZeppelin code with a constructor.

Before launch the custom contracts had two independent review passes by a reviewer who had not seen the code, with each finding reproduced on a fork. Across the two passes every finding above Low was fixed and the Lows were fixed or accepted with a reason, including one critical (junior could be drained by someone buying senior after a loss) and three high (the same loss covered twice under the recognition lag; an approval rule on USDC that was a raw drain path; the agent able to supply junior's USDC to any Morpho market, including one with a rigged oracle). Every fix is now a regression test; the suite is 39 tests, all passing. The full text is `contracts/REVIEW.md`.

Three residuals were accepted and are stated here:

1. A 1 ppm tolerance on senior's price per sync, so losses below 0.0001% are never covered. It is a rounding guard, and no one can slice a real loss into pieces that small.
2. The curator trust problem described below: the senior curator can route senior funds to a venue that loses and junior pays. Mitigated by procedure, not code.
3. The fee router's keeper can lose up to the slippage allowance of a sweep, more if the oracle is stale, up to the $25,000 per-call cap. An oracle staleness check in the contract ships in week one; until then the keeper sweeps only when the oracle has updated within the hour.

"Unaudited" here means exactly this: reviewed twice and fork-tested, never audited by a firm, with a $500,000 launch cap and a $10,000 per-wallet junior cap in week one as the main defence. It does not mean "safe enough". A bug that neither pass found can lose everything in junior. Senior's principal is held only by Morpho's code; a junior bug would at worst leave senior without its buffer.

## Venue risk

**Morpho Blue markets.** Senior and junior both lend into markets on HyperEVM collateralised by kHYPE, WHYPE and UBTC. A sharp move in those assets that liquidations cannot keep up with produces bad debt, which Vault V2 marks at once. Undercollateralised positions that have not yet been liquidated, or a market with a dead oracle, are carried at par until they are realised. Market utilisation is 88 to 90%, so pulling out in a hurry is slow. Market selection is a curator decision behind a timelock.

**Felix.** 15% of senior's target and the whole liquidity leg sits in Felix's USDC v1.1 vault, run by a different curator with its own 10 markets and a 10% fee on yield. A Felix loss is a senior loss. Felix has already migrated most of its own TVL to Vault V2; the v1.1 vault senior uses holds about $3.2M at the time of writing.

**Oracles.** Morpho markets price collateral through their own oracles; a wrong price means wrong liquidations. Ranger values its HYPE leg at the Morpho WHYPE/USDC oracle and flattens if that oracle is stale over an hour. The fee router's sweep floor depends on an oracle and has no staleness check until week one.

**Stablecoin.** Everything is denominated in HyperEVM USDC (`0xb88339CB7199b77E23DB6E890353E22632Ba630f`), a bridged representation. A USDC failure hits every USDC lender the same way and junior is no buffer against it. A USDC blocklist of a vault address would stop every path.

**Elysium bridge.** Elysium's mainnet (Kinetiq's Hyperliquid L2) launches the same day as Orphic; the vaults and ORPH live on HyperEVM at launch and move to Elysium in December. The canonical bridge is a standard Orbit gateway: deposits within about a minute, withdrawals optimistic, with a challenge period that Kinetiq had not published at the time of writing. The chain id, RPC and canonical USDC address on Elysium are confirmed on launch morning, not before. Anything on Elysium at launch is a single-sequencer chain. Treat Elysium-side details on the site as confirmed only when they are shown with a read-back.

**Ranger, once funded.** A concentrated LP range is short volatility and long HYPE. Up to 20%, later 30%, of junior can be in it. Its kill switches flatten on a 15% HYPE move, a stale oracle, a thin pool or a 3% weekly drawdown, but a gap move between keeper ticks is not caught.

## Owner powers

Junior and the fee router are owned by Orphic's hardware wallet; senior is owned and curated by an Orphic Safe after the deploy. What the owner can do, and what it cannot:

Can, instantly, on junior: pause deposits; set the agent to any address; add or remove venues (removal only when the position is zero, or `forceRemove` for a venue whose view reverts); set the deposit cap and the wallet cap; set rules and approval rules within the hard limits in the contract.

Can, behind a 3-day timelock: change the stake rate; on senior, add adapters, raise caps, change fees, the fee recipient, allocators, gates and `maxRate`.

Can, instantly, on senior: lower an absolute cap (the kill switch).

Cannot: withdraw from junior or senior, stop exits, claims or settles, move ORPH stakes, re-quote an existing stake, make the agent send USDC anywhere but a registered venue, mint ORPH, or change the ORPH contract.

A note on `addVault`: the owner could register an ERC-4626 vault that over-reports its value, which would inflate junior's NAV and overpay early exiters at later holders' expense. The protection is that `addVault` is an owner call that is visible on-chain and listed on the status page, and that Ranger's own review is a condition before it is added. There is no timelock on it at launch.

## The curator trust note

The senior curator decides which venues senior lends into. If a venue loses, junior pays. A dishonest curator who also controlled junior could route senior into a venue it owns, make it lose, and collect junior's cover through senior shares it holds. Nothing in `JuniorVault` can detect this. The mitigations are procedural: the senior curator is kept on a Safe distinct from the junior owner before caps are raised beyond launch, every adapter and cap change waits 3 days in public, and the venue list is the four Morpho markets and Felix. A junior depositor is trusting Cashout not to do this, and has 3 days' notice of any change to the venue list in which to leave.

## What is published and when

Every number on the site is a live chain read or a labelled estimate. Agent results are published weekly from the first settle and never estimated before that. Launch banners stay up until this page says otherwise: "Unaudited, capped, owner-pausable" and "Basis agent not active".
