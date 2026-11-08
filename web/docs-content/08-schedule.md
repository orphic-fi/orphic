---
title: Schedule
order: 8
---

# Schedule

Everything on a clock, in UTC.

## Hourly: keeper tick

The Rotator runs once an hour from a GitHub Action. Ticks queue rather than overlap. Each tick:

- reads markets and senior's allocation, proposes, and moves only if it pays (see Agents);
- calls `JuniorVault.syncSenior()`, so senior shares deposited in the last hour become covered;
- reads `coverInProgress()` and senior's `maxRate` for the status page;
- samples the HYPE/ORPH pool price for the stake-rate record;
- writes a report; the latest one feeds the status page.

If the keeper is down, `syncSenior()` and `settle()` are permissionless and anyone can call them. The uncovered window for new senior deposits grows with the outage.

## Weekly: settle, Sundays 00:00 UTC window

`settle()` on junior may be called by anyone once `7 days minus 1 hour` have passed since the last one. The keeper's weekly run does it in the hour starting Sunday 00:00 UTC. Because the interval is an hour short of a week, settle time can drift up to an hour earlier each week if called at the first allowed moment; the keeper calls at the same hour every week.

Order of operations in the weekly run:

1. Maturity check: junior's idle USDC is compared with the value of exits maturing that day. A shortfall is a warning and the Rotator brings funds back to idle. Ranger is counted as illiquid.
2. `senior.accrueInterest()` inside `settle()`, so junior's fee shares exist before valuation.
3. Cover: if senior's real price is below its fee-adjusted baseline, junior pays the shortfall into senior.
4. Price: junior's new `pricePerShare` is frozen from net assets.
5. Exits whose notice ended by that midnight are priced and their USDC reserved.
6. Weekly close on senior: `accrueInterest()`, and any emission positions sold to USDC (none at launch).
7. The stake-rate proposal line is printed for the owner.
8. The numbers are posted on the agents page: `Settled` event, `Cover` event if any, `pricePerShare`, `reservedAssets`, `pricedExitShares`.

An exit is priced at the first settle at or after the first UTC midnight at least 7 days after the request. With Sunday settles, a request made early in the week is priced on the Sunday after next; one made late in the week can catch the following Sunday only if its midnight falls before that settle. Plan on 8 to 14 days.

## Weekly: stake rate

- Sunday, after settle: the keeper prints `proposeStakePerAsset(x)` from the 7-day pool TWAP. If the implied gate is outside 15% to 25% of deposit value, the owner sends it. Otherwise the week is skipped.
- Wednesday: `applyStakePerAsset()` becomes callable 3 days after the proposal; the keeper calls it, anyone may. The app shows `pendingStakePerAsset()` and `stakeEta()` from the moment of the proposal.
- New rate applies to new deposits only.

## Launch week (from Monday 9 November 2026)

| When | What |
|---|---|
| Sunday 8 Nov | Senior, junior and router deployed on HyperEVM; senior wired with fee, `maxRate`, liquidity adapter and 3-day timelocks; keeper in dry run |
| Monday 9 Nov | ORPH deployed, pool seeded, stake gate set; Cashout makes the first senior and junior deposits from treasury as the live test, with read-backs published; junior deposits unpaused; keeper set live; site published with banners |
| Week one | Permissionless `cover()` (hourly cover, shorter recognition window); fee-router oracle staleness check; Ranger review and, if it passes, RangerVault funded at 20% cap |
| Sunday 15 Nov | First real settle, including the one-share test exit Cashout requested on day one |
| Monday 16 Nov | Junior per-wallet cap of $10,000 planned off (`setWalletCap(0)`) |
| Week two | Agent key moved behind Zodiac Roles |
| About four weeks after Elysium mainnet | CoreWriter arrives on Elysium; the Basis review can start then at the earliest |
| December | Contracts move to Elysium; Ranger can then add Elysium pools |

Dates after launch week are plans and move if a review does not pass.

## What the status page shows

- Block number of the last read, so a stale page is visible as stale.
- Senior: total assets, idle, per-venue allocation against targets and caps, share price, management fee, `maxRate`, liquidity adapter, curator and timelock values.
- Junior: total assets, idle, `pricePerShare`, deposit cap and wallet cap, pending and priced exit shares, reserved assets, stake token and rate, pending rate and its date, last settle and the next allowed settle time.
- Cover: "Cover in progress: n% recognised, whole in about h hours" whenever `coverInProgress()` is non-zero, with a plain statement that withdrawing before then realises the gap.
- Agents: each agent's status, cap, last tick, last plan or hold reason, and every `AgentCall` event. Weekly returns per agent from the first settle; blank before that.
- ORPH: pool price samples, 7-day TWAP, and the proposed stake rate.
- Addresses and the read-back for each.
- Banners: "Unaudited, capped, owner-pausable" and "Basis agent not active".
