---
title: Agents
order: 4
---

# Agents

An agent is an off-chain keeper with one hot key. On-chain the key has narrow rights: allocator on senior, agent on junior, keeper on the fee router. It can move money between the registered venues and the contracts. It cannot withdraw to anyone. Every agent call is an on-chain event and is listed on the agents page.

Three agents are defined. One is live at launch.

| Agent | Status | Works on | Cap |
|---|---|---|---|
| Rotator | live from launch | senior allocation, junior housekeeping | within the vault caps |
| Ranger | week one, after review | junior | 20% of junior, 30% after two clean settles |
| Basis | not active | junior | 0 |

## Rotator

Runs hourly from a GitHub Action. Source: `keeper/`. Every run is a dry run until the repository variable `LIVE` is `1`; the private key is only present in the job when it is.

What a tick does:

1. Reads live market data from the Morpho API, falling back to reading Morpho Blue and the IRM directly if the API fails.
2. Reads senior's allocation from chain and aborts if idle plus adapter assets differ from `totalAssets()` by more than 1%.
3. Proposes an allocation from the target mix, re-weighted by each market's projected rate after the move (an approximation of Morpho's Adaptive Curve IRM), then clipped by the rules below.
4. Prices the move and executes it only if it pays.
5. Calls `JuniorVault.syncSenior()` and reports `coverInProgress()`.
6. Samples the HYPE/ORPH pool price for the stake-rate record.
7. On Sunday 00:xx UTC runs the junior maturity check and `settle()`, then `accrueInterest()` on senior and the weekly close.
8. Writes a report. The latest is the source for the status page.

Rules the Rotator holds itself to, in addition to the on-chain caps:

- Never more than 50% of a market's total supply, and never more than 50% of Felix's assets, after the move.
- Felix at or above 10% of senior (it is the liquidity adapter) and idle at or above 2%.
- Move only if the projected weekly gain is more than 3 times the cost, where cost is gas plus a 0.02% slippage charge on the amount moved. In practice a rotation needs roughly a 3% annualised pickup on the moved amount to pass, so the Rotator holds more often than it moves.
- Ignore deltas under 0.5% of vault assets. No single transfer above 25% of vault assets; larger moves are clipped.
- Deallocations first, then allocations, largest first. Each transaction is simulated, sent, and its post-state re-read; the plan stops on the first mismatch.
- Exclude any market at 100% utilisation or with a supply rate above 100%.
- Before each settle, make sure junior's idle USDC covers the exits maturing that day. Ranger is counted as illiquid for this check.

At launch the Rotator's junior module does the sync, the maturity check and the settle. Moving junior's USDC between the registered markets and Felix through `execute` is switched on once that module is live (to be confirmed on the status page) and follows the same rules. The Rotator never calls `withdraw`, `redeem` or `transfer` on senior, never calls a curator or owner function, and only prints the weekly stake-rate proposal; sending it is owner-only.

## Ranger

Week one, not launch day. Design note: `ops/RANGER.md`. Mandate: one concentrated-liquidity range on the USDC/HYPE Uniswap v4 pool on HyperEVM, earning swap fees, for junior. This is not market neutral: an LP position is short volatility and long the pair. The cap and the range rules bound that.

Shape: `RangerVault`, a small custom ERC-4626 vault over USDC with junior as its single depositor. Junior registers it with `addVault` and funds it through the existing allowlisted `deposit` rule; junior values it the way it values Felix, through `convertToAssets`. Inside RangerVault, `totalAssets()` is idle USDC plus each position's USDC and HYPE at the current pool price plus uncollected fees, with HYPE valued at the Morpho WHYPE/USDC oracle (the same oracle the kHYPE and WHYPE markets use), never at the pool's own spot, and a 1% haircut on the HYPE leg for exit slippage.

On-chain rules in RangerVault: HYPE exposure after any call at most 60% of its assets; never more than 50% of the pool's active liquidity in our range; only the whitelisted pool id; the agent's calls are limited to mint, increase, decrease, collect and burn on Uniswap's PositionManager with RangerVault as recipient, and swaps between USDC and HYPE only through the Universal Router with an oracle floor. `maxDeposit` returns the remaining room under the cap, so the agent cannot overshoot.

Keeper rules: range centred on the 24-hour TWAP of the Morpho WHYPE oracle, width from 7-day realised volatility (2 sigma), recentred when price leaves the inner 60% of the range or after 72 hours, never more than once per 6 hours. Weekly close collects fees and sells HYPE above the 50/50 target back to USDC at the oracle floor. Kill switches, all of which flatten both positions to USDC: HYPE moves more than 15% in 24 hours; the oracle is stale over 1 hour; the pool's active liquidity falls below 5 times our position; RangerVault's NAV is down 3% on the week. Owner `pause` blocks new mints and never withdrawals.

The four conditions before Ranger holds a dollar, all binding:

1. The same two-pass independent review as junior and the router.
2. Single position type: one USDC/HYPE range, recentred by rule. No leverage, no borrowing, no second venue.
3. Cap 20% of junior at launch, raised to 30% only after two clean weekly settles. `maxDeposit` enforces the current cap on-chain; the raise is an owner call behind the 3-day timelock.
4. Junior exits never depend on Ranger liquidity: `reservedAssets` are kept in junior idle or in Morpho and Felix, and the Rotator treats Ranger as illiquid for the pre-settle check.

Starting size in practice: about 10% of junior.

## Basis

Not active. The design is hedged perps funding capture on HyperCore through a trade-only API wallet on a contract-owned HyperCore account. It needs a review of the CoreWriter path before it is enabled, and CoreWriter is not available on Elysium until an upgrade about four weeks after that chain's mainnet. The Basis kill switches and limits are to be confirmed in a design note before any review starts. Until then the agents page shows Basis at 0 and the site carries the banner "Basis agent not active".

## The allowlist: what an agent key can do

On junior, the only entry point is `execute(target, data)`. Every call passes these checks, in order:

- Caller is the current `agent`.
- Target is never the stake token (ORPH).
- If the call is an ERC-20 `approve`: the token-spender pair must be in the approval list, and the spender must be Morpho Blue or a registered vault. Approvals are set at deploy for USDC to Morpho and Felix only.
- Otherwise the target-selector pair must be an allowed rule, and the target must be Morpho Blue or a registered vault at call time, so a removed venue is unreachable at once.
- If the target is Morpho Blue, the leading `MarketParams` in the calldata is decoded and must be a registered market. This covers every market-level Morpho function; `setAuthorization` and `flashLoan` fail the decode.
- If the rule names a receiver word, the address at that calldata offset must be the junior contract itself. Set at deploy: Morpho `supply` on behalf of junior, Morpho `withdraw` to junior, Felix `deposit`, `redeem` and `withdraw` to junior, senior `redeem` and `withdraw` to junior.
- After the call, if junior's idle USDC went down and is now below `reservedAssets`, the whole call reverts.

Things that can never become rules, whatever the owner types: raw `transfer`, `transferFrom` and `approve` selectors on any target, including share tokens; any target outside Morpho and the registered vaults; the stake token. Calls carry no value, are plain calls (no delegatecall), and are `nonReentrant`, so the agent cannot re-enter `deposit`, `requestExit`, `claimExit` or `settle`.

On senior, the key is an allocator: `allocate` and `deallocate` between the vault's idle balance and its registered adapters, within the caps the curator set. Vault V2 also lets any allocator call `setMaxRate` (bounded at 200% a year) and `setLiquidityAdapterAndData` instantly. The Rotator never calls either; a leaked key could, which would at worst slow recognition of yield to zero or point withdrawals at a different registered adapter. Neither moves funds out of the vault.

On the fee router, the key is the keeper: `sweep` (bounded by an oracle floor and a $25,000 per-call value cap), `distribute` and `sweepBurn`.

What the key cannot do anywhere: withdraw to any address, change a cap, a fee, a rule, a venue or a timelock, add or remove an adapter, pause or unpause, set the stake rate, or move ORPH stakes.

What the key can do that is unwanted: park junior's USDC in a registered market at 100% utilisation so it earns little and is hard to pull back, redeem junior's senior fee shares at a depressed price during a recognition lag, move funds back and forth to burn gas, or fail to return reserved USDC to idle before a settle so claims are delayed. These are griefing, not theft, and all are visible on the agents page.

## If the key leaks

1. Owner pauses junior deposits: `setDepositsPaused(true)`. Exits, claims and settles continue.
2. Owner removes the agent on junior: `setAgent(0x0)`, instant.
3. On senior, revoking the allocator is behind the 3-day timelock, so instead the curator or sentinel calls `decreaseAbsoluteCap` to 0 on the market ids, instant. Deposits then stop at the Felix cap and the key has nowhere to allocate.
4. The repository variable `LIVE` is cleared so the Action goes back to dry runs, and the GitHub secret is rotated to a fresh key.
5. The deployer wallet, which is also an allocator, reads back `maxRate()` and `liquidityAdapter()` on senior and resets them if the key touched them.

The leaked key could only ever have moved funds between the allowlisted venues and the contracts. It could not have withdrawn.

Rotating the key without an incident: create a new EOA, have the curator add it as allocator and the owner `setAgent` it, update the secret, wait for one clean live tick, then remove the old one.

## Week two: Zodiac Roles

The allowlist in `JuniorVault` is about 40 lines of custom code, fully covered by tests for the Morpho and ERC-4626 shapes used at launch. Safe 1.4.1 and Zodiac Roles v2 are deployed on HyperEVM with mainnet bytecode, and the plan is to move the agent key behind Zodiac Roles (audited) in week two. The in-contract allowlist was chosen for launch on schedule grounds only.
