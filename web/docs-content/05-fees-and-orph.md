---
title: Fees and ORPH
order: 5
---

# Fees and ORPH

## The fee router

Every fee Orphic earns lands in one contract, `FeeRouter` (custom, unaudited, about 210 lines, reviewed twice), and leaves in one of two shapes.

Swap path, for any token: the keeper calls `sweep(token, router, swapData, amountIn)`. The token is swapped to USDC on an allowlisted router. The result is measured, never trusted from the router, and must clear a floor computed from a Morpho-style oracle: `value * (1 - maxSlippageBps)`, with `maxSlippageBps` set between 100 and 300 for liquid tokens and never above 1,000. One sweep may not exceed `maxSweepUsdc` of oracle value, $25,000 at launch. USDC that arrives directly is split with `distribute()`.

Split: 50% senior, 25% junior, 25% treasury. Senior's share is transferred as USDC into the senior vault, where it raises the share price as Vault V2 recognises it (see Senior). Junior's share goes to the junior contract as idle USDC and shows in the next settle's price. Treasury's share goes to the treasury address.

Burn path, for tokens the owner marks as burn-split (planned for ORPH creation fees and school tuition): `sweepBurn(token)` sends a fixed share to the burn address and the rest to treasury. The planned split is 50% burned, 50% treasury.

A failed send never reverts a sweep. The amount is parked in `owed` for the recorded recipient and anyone can trigger `pullOwed` later; it only ever goes to that recipient.

## Fee streams

At launch there is one: the swap fees of the HYPE/ORPH pool, collected from the Safe-owned position weekly and sent to the router.

Later, as each is built: agent token fees, weekly fee streams from agents, creation fees and school tuition (the last two on the burn path). None of these exist on launch day and none is counted in any figure on the site.

## ORPH

ORPH is a plain OpenZeppelin ERC-20 with permit. Name "Orphic", symbol `ORPH`, 18 decimals. Fixed supply of 1,000,000,000 minted once at deploy. No owner, no mint, no pause, no fee logic, no upgrade. Nothing in the contract is custom beyond the constructor.

ORPH lives on HyperEVM, the same chain as the vaults and the stake gate. Elysium gets the canonical bridged representation when the contracts move there.

Uses at launch: the junior stake gate (20% of each deposit, returned on exit). The token has no governance rights and no claim on fees.

### Allocation

| Share | Amount | Where it sits | Lock |
|---|---|---|---|
| 60% | 600,000,000 | the HYPE/ORPH pool, as the single-sided launch position | sold only as buyers walk the price up; position NFT owned by the Orphic Safe |
| 15% | 150,000,000 | treasury, in an OpenZeppelin `TimelockController` | every movement needs a proposal and a 3-day delay |
| 15% | 150,000,000 | team, in an OpenZeppelin `VestingWalletCliff` | 2-year linear vest; nothing releasable before a 6-month cliff |
| 10% | 100,000,000 | agent and school incentives, in a second `TimelockController` | 3-day delay |

The deployer holds 0 after deploy. The read-backs for every balance are in Contracts.

### The pool

One Uniswap v4 pool on HyperEVM: native HYPE (currency0) against ORPH (currency1), 1% fee tier, tick spacing 200, no hook. Uniswap's PoolManager (`0x12D4Fd9C5DeDd00ab8a0bCe2CF0167bbf94b6B1F`) and PositionManager (`0x0d7Ab5B3db668128Aff6F70C4eBC71D7d4DA9bf9`) on HyperEVM are the ones listed on Uniswap's deployments page.

The pool is initialised at the price that values the full 1,000,000,000 supply at about $5,000 using the live HYPE price at the moment of deploy. All 600,000,000 pool-allocated ORPH are placed in one single-sided position from the minimum tick up to just under the opening price. There is no HYPE seed. Buyers walk into the position; every HYPE paid in stays in the pool as the other side of the position and accrues as swap fees to the position owner. The position NFT is owned by the Orphic Safe.

Measured on a fork at $38 HYPE: 1 HYPE bought about 7.40 million ORPH against a 7.6 million ideal, the gap being the 1% fee plus price impact.

### Why no hook at launch

A hook is custom code in the swap path. Orphic has no reason to add one yet: a standard 1% pool with a single LP that is the Safe already routes all trading fees to Orphic, which collects them weekly to the router. A hook arrives when agent tokens are launched and there is something for it to do. Fewer custom lines at launch is the point.

If Uniswap v4 had not been available on HyperEVM, the fallback was a launch-pad pool with a 1% tax; it was not needed.

### Price record

Uniswap v4 has no on-chain TWAP. The Rotator reads the pool's `slot0` every hour and stores the sample. The 7-day time-weighted average of those samples is the input to the weekly stake-rate proposal (see Junior). The samples are published in the keeper reports.
