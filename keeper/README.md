# Orphic Rotator keeper

Hourly keeper for the Orphic senior USDC vault on HyperEVM (chain id 999). It decides how the senior Morpho Vault V2 should be allocated across Morpho Blue USDC markets plus the Felix USDC v1.1 vault, prices the move, and either executes it as the vault's allocator or explains why it is holding. Junior sleeve rebalancing will be added once that contract exists.

Everything is a dry-run until a repository variable `LIVE=1` is set and the vault, adapter addresses in `config/senior.json` are real.

## What it does on every tick

1. Reads live market data from the Morpho GraphQL API. If that fails it falls back to reading Morpho Blue `market(bytes32)` and `idToMarketParams(bytes32)` through viem for the target markets and derives the supply APY from the IRM's `borrowRateView`.
2. Reads the vault's current allocation from chain: per-market supply through the market adapter's `expectedSupplyAssets(marketId)`, Felix through the vault adapter's `realAssets()`, idle through `USDC.balanceOf(vault)`, caps through `absoluteCap(id)` and `relativeCap(id)`. While the addresses are placeholders it uses a JSON fixture instead (`--fixture` or `STATE_FIXTURE`).
3. Proposes an allocation (rule 3 below).
4. Builds an ordered plan (rule 5) and prices it (rule 4).
5. Executes the plan in dry-run (table plus `ops/last-plan.json`) or live (sequential transactions with post-state checks).
6. Calls `JuniorVault.syncSenior()` (permissionless, refreshes the senior baseline so newly deposited senior shares become covered) and reads `coverInProgress()` on junior plus `maxRate()` on senior for the report. Skipped entirely while `junior` in the config is `0xTODO`; dry-run only logs.
7. Samples the ORPH/HYPE Uniswap v4 pool and appends to `ops/price-samples.jsonl` (see ORPH price record). Skipped while `orph` is `0xTODO`.
8. On Sunday 00:xx UTC, or with `--weekly`, runs the junior maturity check and settle, then the weekly close (rule 7), and prints the stake rate proposal line.
9. Writes `ops/reports/<timestamp>.json` plus `ops/reports/latest.json` and prints a short summary (rule 8).

HyperLend rates are fetched and included in the report for the dashboard. They never enter the allocation decision because there is no HyperLend adapter yet.

## Target mix

Targets, not caps. Weights are re-weighted by rate and then clipped by the constraints below.

| key | label | weight |
| --- | --- | --- |
| `0xe7aa0468...349b` | kHYPE/USDC, LLTV 62.5% | 34% |
| `0x96c47d37...73b9` | kHYPE/USDC, LLTV 77% | 10% |
| `0xd7d38220...59a8` | WHYPE/USDC, LLTV 77% | 20% |
| `0x45af9c72...942f` | UBTC/USDC, LLTV 77% | 19% |
| `felix` | Felix USDC v1.1 `0x8A862fD6...CEa27` through the MorphoVaultV1 adapter (liquidity adapter (note: an allocator CAN repoint the liquidity adapter and set maxRate instantly; the keeper never does, and alerts if either changed since the last tick)) | 15% |
| `idle` | USDC held by the vault | 2% |

Market `0x8eecdd03...0ba5` is excluded, as is any market at 100% utilization or with a supply APY above 100%.

## Rules

### Rule 1: market data

`src/data/morpho.ts`. Primary source is `https://api.morpho.org/graphql` (`markets` filtered by `chainId_in:[999]` and `loanAssetAddress_in:[USDC]`, `vaults` for Felix, `assets` for the WHYPE price). On failure the keeper reads Morpho Blue directly. Amounts are USD from the API; the on-chain path treats USDC as 1 USD.

### Rule 2: current allocation

`src/data/state.ts`. Reconciles `idle + market adapter realAssets + vault adapter realAssets` with `vault.totalAssets()` and aborts the tick if they differ by more than 1%.

### Rule 3: proposal

`src/engine/allocate.ts`, `proposeAllocation`.

1. Start from the target mix. Drop excluded markets and markets without data; their weight is redistributed pro rata across the remaining markets (or to Felix if none are left). An existing position in a dropped market is fully withdrawn.
2. Re-weight the market bucket by projected rate. Each market's rate is projected at its post-move size (rule 4's IRM model), so a market we would crowd gets credit only for its post-move rate. Multiplier is `1 + rateTilt * (rate - avg) / avg`, clamped to `[minTiltMultiplier, maxTiltMultiplier]` (defaults 0.5, 0.5x, 1.5x), then renormalised so the market bucket keeps its total weight. Felix and idle are not tilted.
3. Caps per key, the binding one is recorded in the reasons:
   - never more than 50% of a market's total supply. Implemented as `position <= share / (1 - share) * othersSupply`, which with 50% means our position can be at most equal to everyone else's supply, so we hold at most 50% of the post-move market;
   - never more than 50% of Felix's `totalAssets`, same formula;
   - the vault's `absoluteCap(id)` and `relativeCap(id) * totalAssets` for the market id `keccak256(abi.encode("this/marketParams", adapter, marketParams))` and the adapter id `keccak256(abi.encode("this", adapter))` for Felix. In dry-run these come from `dryRunCaps` in the config.
4. Water-fill: overflow from capped markets goes to the uncapped markets pro rata, then to Felix if it has room, then idle.
5. Floors: Felix at or above 10% (it is the liquidity adapter) and idle at or above 2%. Shortfall is taken from markets pro rata. If Felix's cap binds below the floor the remainder is parked idle and the report carries a warning.

The proposal always sums to `totalAssets`.

### Rule 4: move only when it pays

`decide` in `src/engine/allocate.ts`.

- `weeklyGain = sum(newAmount * projectedRate) - sum(currentAmount * currentRate)` over one week (`7/365`). Lines whose delta is below the dust threshold are treated as unmoved.
- `cost = gas + slippage` where `gas = actions * gasPerAction * gasPrice(HYPE) * HYPE/USDC` and `slippage = 0.02% * movedAmount`. `movedAmount` is the repositioned amount counted once (max of total deallocated and total allocated). The HYPE price comes from the Morpho API asset price with `fallbackHypePriceUsd` as backup; gas price from the chain with `fallbackGasPriceGwei` as backup.
- Move only if `weeklyGain > marginFactor * cost`, `marginFactor` default 3.

Rate projection uses an approximation of Morpho's Adaptive Curve IRM (`src/engine/irm.ts`). The real IRM has a slow adaptive drift of `rateAtTarget` plus an instantaneous curve around the 90% kink; within one tick the drift is negligible so only the curve is modelled:

```
err = (u - 0.9) / 0.1    if u > 0.9        err = (u - 0.9) / 0.9    if u <= 0.9
borrowRate(u) = rateAtTarget * (1 + 3 * err)      above the kink
borrowRate(u) = rateAtTarget * (1 + 0.75 * err)   below the kink
supplyRate(u) = borrowRate(u) * u * (1 - fee)
```

The borrow rate is linear in utilization on each side of the kink, equal to `rateAtTarget` at 90%, a quarter of it at 0% and four times it at 100%, so the slope above the kink is far steeper. `rateAtTarget` is inferred from the observed supply APY and utilization, then the curve is evaluated at the post-move utilization `borrow / (supply + delta)`. Approximations: the drift is ignored, borrow demand is assumed unchanged by our move, APY compounding is applied to the observed rate rather than re-derived from per-second rates, and Felix's rate is taken as its API `netApy` with no impact model.

Consequence worth knowing: with a 2 bp penalty and a 3x margin, a rotation needs roughly a 3% annualised rate pickup on the moved amount to pass. At the live rates seen while building this (Felix about 5.0% net, the four markets 5.2% to 5.7% before crowding), the keeper holds the initial deployment in Felix and records the plan it would have executed. Tune `marginFactor` or `slippagePenalty` in `config/senior.json` if deployment should be forced.

### Rule 5: plan

`src/exec/plan.ts`, `buildPlan` and `validatePlan`.

- Deltas below `minDeltaFraction` of vault assets (default 0.5%) are ignored.
- All deallocations first (largest first), then all allocations (largest first).
- No single transfer above `maxClipFraction` of vault assets (default 25%); bigger deltas are split into clips.
- Idle is tracked through the sequence and an allocation is cut so idle never drops below 2%; a shortfall is reported in `planNotes`.
- `validatePlan` independently re-checks every invariant before execution.

Each step is `{action, adapter, marketId | "felix", label, amount, idleAfter}`.

### Rule 6: execution

`src/exec/send.ts`, `executePlan`.

Dry-run prints the table and writes `ops/last-plan.json`. Live mode:

1. refuses to broadcast if any address in the config is `0xTODO`, if `LIVE` is not `1`, or if `AGENT_PRIVATE_KEY` is missing or malformed;
2. checks `vault.isAllocator(agent)`;
3. for each step: reads the position, `simulateContract` then `writeContract` of `vault.allocate(adapter, data, assets)` or `vault.deallocate(...)`, waits for the receipt, re-reads the position and idle;
4. aborts the rest of the plan if the receipt is not a success, the position did not change by the expected amount (1% tolerance for accrual and share rounding) or idle fell below the floor.

`data` is `abi.encode(MarketParams)` for the MorphoMarketV1 adapter and empty bytes for the MorphoVaultV1 adapter. ABI fragments live in `src/abi/`.

### Rule 7: weekly close

`weeklyClose` in `src/exec/send.ts`. Runs when the tick lands in the Sunday 00:xx UTC hour or with `--weekly`. There are no emission positions yet, so it logs that and calls `vault.accrueInterest()` so fees accrue on a fixed schedule (dry-run only logs).

### Junior sleeve (`src/exec/junior.ts`)

Hourly, after the allocation step:

- `junior.syncSenior()` is called (dry-run logs "would call").
- `coverInProgress()` on junior and `maxRate()` on senior go into the report together with a human line `cover in progress: X USDC, about H hours to full recognition`, where `H = coverInProgress / (totalAssets * maxRate * 3600 / 1e18)` and 0 when there is no cover. While the senior vault is a placeholder, `totalAssets` comes from the fixture and `maxRate` reads as 0, so H shows as unknown.

Weekly, before the senior close logic:

- Maturity check: `owed = pendingExitShares() * pricePerShare() / 1e18 / 1e12` (USDC base units). If `USDC.balanceOf(junior) < owed` the keeper logs a WARNING with the shortfall. Bringing funds back through `junior.execute` is not implemented yet; the warning is the deliverable.
- `junior.settle()` is called when `block.timestamp >= lastSettle() + 7 days - 1 hour` (keeper wall clock in place of block time; the contract enforces the real bound).

Both steps are skipped while `junior` is `0xTODO`.

### ORPH price record (`src/data/orph.ts`, `src/engine/twap.ts`)

Uniswap v4 has no on-chain TWAP, so the keeper is the price record for the ORPH stake rate.

- Every tick reads `getSlot0(poolId)` on the v4 StateView `0x1656326235cb9E34Cb58CaDe53AE30789AB32A1A`. `poolId = keccak256(abi.encode(PoolKey{currency0: native HYPE (zero address), currency1: ORPH, fee 10000, tickSpacing 200, hooks: zero}))`. If `poolId` in the config is a placeholder it is derived from the PoolKey; if it is set and differs from the derived value the config value is used and a warning is recorded.
- `orphPerHype = (sqrtPriceX96 / 2^96)^2` (both 18 decimals, so no decimal shift; `2^96` means exactly 1). `orphUsd = hypeUsd / orphPerHype` with `hypeUsd` from the Morpho API `assets` query for WHYPE `0x5555...5555` (config fallback when unavailable).
- The sample `{timestamp, sqrtPriceX96, tick, orphPerHype, hypeUsd, orphUsd}` is appended to `ops/price-samples.jsonl`; samples older than 30 days are pruned.
- `twap7d` is the time-weighted average of `orphUsd` over the last 7 days: each sample holds its price until the next one, the last holds until now, and a sample taken before the window is clipped to the window start.
- `proposedStakePerAsset = floor(0.20 / twap7d * 1e18)` (ORPH wei per 1 USDC). `twap7d`, `sampleCount` and `proposedStakePerAsset` go into every report.
- On the weekly run the summary prints `stake rate proposal: proposeStakePerAsset(<value>)  (7d TWAP $<orphUsd>, <n> samples)` for the owner to paste. The keeper never sends that transaction; it is owner-only.

Note: in the GitHub Action the runner's filesystem is fresh each run, so `ops/price-samples.jsonl` must be persisted between ticks (restore it from the previous run's artifact or a cache, or run the keeper on a host with a persistent `OPS_DIR`). Without that, each run sees only its own sample and the TWAP collapses to the spot price.

### Rule 8: report

`src/report.ts`. Every run writes `ops/reports/<ISO timestamp>.json` with inputs (markets, Felix, HyperLend, prices, gas, vault state, warnings), the proposal with per-line reasons, the plan, the decision and its reason, execution results, weekly close output and the book APY before and after. `latest.json` is a copy of the most recent report. The GitHub Action also uploads them as workflow artifacts.

## Running

```
cp .env.example .env            # optional for dry-run
npm ci
npm test
npm run tick -- --dry-run --fixture test/fixtures/state.json
npm run tick:dry                # same thing
npm run tick -- --weekly        # force the weekly close step
```

Flags: `--dry-run` (always wins over `LIVE=1`), `--weekly`, `--fixture <path>`, `--config <path>`, `--ops-dir <path>`. Environment: `RPC_URL`, `AGENT_PRIVATE_KEY`, `LIVE`, `OPS_DIR`, `STATE_FIXTURE`. A `.env` file in the keeper directory is read if present and never printed.

Exit code is non-zero if any transaction failed or the run errored, so the Action goes red.

### GitHub Action

`/.github/workflows/rotator.yml` at the repository root runs hourly with `npm ci && npm test && npm run tick`. Concurrency group `orphic-rotator` with `cancel-in-progress: false` so ticks queue instead of overlapping or being cut mid-plan. Secrets: `AGENT_PRIVATE_KEY`, `RPC_URL`. The key is only injected into the step environment when the repository variable `LIVE` equals `1`; otherwise the job runs without it.

### Going live

1. Deploy the vault and both adapters, register the agent EOA as allocator, set caps.
2. Replace every `0xTODO` in `config/senior.json` with the real addresses.
3. Run `npm run tick -- --dry-run` locally against the live vault and read the report.
4. Set repository variable `LIVE=1`. The next scheduled tick broadcasts.

## Rotating the agent key

1. Generate a new EOA and fund it with a little HYPE for gas.
2. Have the curator call `setIsAllocator(newAgent, true)` on the vault.
3. Update the `AGENT_PRIVATE_KEY` secret in GitHub (Settings, Secrets and variables, Actions) and any local `.env`.
4. Wait for one successful live tick from the new key, then have the curator call `setIsAllocator(oldAgent, false)`.
5. Sweep leftover HYPE from the old EOA.

Because the key only ever holds allocator rights, a compromised key can at worst move funds between the vault's own approved adapters within the curator's caps. It cannot withdraw.

## What the keeper can never do

- Move assets anywhere except between the vault's idle balance and its registered adapters through `allocate` and `deallocate`. It never calls `withdraw`, `redeem`, `transfer` or any curator or owner function. On junior it only calls the permissionless `syncSenior()` and `settle()`.
- Change caps, fees, adapters, timelocks or the liquidity adapter. Those are curator actions behind the vault timelock.
- Broadcast while any config address is `0xTODO`, while `LIVE` is not `1`, or without a well-formed `AGENT_PRIVATE_KEY`.
- Take any market above 50% of its supply or Felix above 50% of its assets, drop idle below 2% or Felix below 10% in a proposal, or send a single transfer above the max clip.
- Exceed the vault's own `absoluteCap` and `relativeCap`; the vault enforces these on-chain regardless of what the keeper proposes.
- Continue a plan after a failed post-state check.
- Send `proposeStakePerAsset` or any other owner-only call. It only prints the proposal.
- Print or persist the private key. It is read from the environment only and the dry-run path never touches it.

## Layout

```
config/senior.json      targets, constraints, economics, placeholder addresses (vault, adapters, junior)
src/config.ts           config and CLI parsing, placeholder guard
src/types.ts            shared types
src/abi/                Vault V2, adapter, Morpho Blue, IRM and ERC20 fragments
src/data/morpho.ts      Morpho API with on-chain fallback
src/data/hyperlend.ts   HyperLend rates (data only)
src/data/state.ts       vault state reads, cap ids, MarketParams encoding
src/data/orph.ts        Uniswap v4 pool sampling and the price-samples.jsonl store
src/engine/twap.ts      sqrtPriceX96 conversion, time-weighted average, stake rate math
src/engine/irm.ts       Adaptive Curve IRM approximation
src/engine/allocate.ts  proposal and move decision
src/exec/plan.ts        plan sequencing and validation
src/exec/send.ts        dry-run and live execution, weekly close
src/exec/junior.ts      junior syncSenior, cover status, maturity check and settle
src/report.ts           report writer and summary
src/index.ts            tick entry point
test/                   vitest suites and fixtures
ops/                    last-plan.json, price-samples.jsonl and reports (git-ignored)
```
