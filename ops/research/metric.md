# Metric (app.metric.xyz) as an LP venue for a USDC/WHYPE vault position

Analyst memo, 2026-11-23. All claims below come from verified contract source (Metricxyz GitHub audit tags, rebuilt locally with Foundry and compared byte for byte against the deployed runtime), official docs (docs.metric.xyz), the Known_issues repo and audit PDFs, the Metric public API, DefiLlama, and read-only onchain calls on HyperEVM (chain 999) and Elysium (chain 99901). Where something could not be verified, it says so.

## 1. Verdict

### Verified

- The core protocol (factory, deployer, pool, LiquidityLib) deployed at the same addresses on HyperEVM and Elysium is byte-identical to the public, audited `audit-d4d0e2a` tag of `Metricxyz/pool-contracts` (immutables and the linked library address are the only differences). Metric is open source under BUSL-1.1 for the core files and MIT for interfaces. Five audits (Zellic x2, Sherlock x3) are published with the audited commit hashes.
- Fee economics are fully onchain and readable. Spread fee shares on the three pools that matter: protocol 15% / curator 20% / LP 65% on the HyperEVM pool; protocol 15% / curator 5% / LP 80% and protocol 15% / curator 0% / LP 85% on the two sizeable Elysium pools. No notional fee anywhere. The "Metric takes 7.5%" claim is refuted: the protocol's default and actual share is 15% of the spread (`spreadProtocolFeeE6 = 150000`) on every chain, confirmed by the factory, by the docs, and by Metric's own `factory-settings` API. Fee shares can be changed with no timelock by the curator (its own share, up to the cap) and by Metric (protocol share, up to the cap), and the docs say so explicitly.
- The curator ("pool admin" in the contracts) cannot withdraw LP funds, cannot rebalance LP inventory, and cannot block LP withdrawals on these pools (no withdrawal extensions, pause only blocks `swap`). The price provider address is immutable on every USDC/WHYPE pool checked.
- The per-bin OracleValueStopLoss extension is attached, initialised and frozen (timelock 2^40-1 seconds) on all three pools: 10% drawdown, about 10%/day decay on HyperEVM; 15% drawdown, about 5%/day decay on both large Elysium pools.

### Not verified, and these are the real risks

- Pricing is not anchored to an independent oracle on any of these pools. Each pool's immutable price provider is a small, unverified, curator-deployed contract that reads from a curator-controlled quote source. On HyperEVM the source is a 19 KB unverified contract (`0xFdAd...`) whose quotes are signed offchain and delivered inside swap transactions with a 10 second validity window. On Elysium the source reads Metric's `CompressedOracleV1` feed created by `0x8dfdc825...`, and the curator's provider factory owner (an EOA) can swap the source address at will. The docs' own tier rules would classify these as "Any Price Provider" pools; whether the curators are Metric-verified could not be checked (the API refuses chains 999 and 99901 without a partner key).
- Every curator and fee-destination address on these pools is an EOA, not a multisig. On Elysium the Metric factory owner and protocol fee receiver is also an EOA (`0x8C53...`), with fee caps still at the hard ceilings (50% / 50% / 1% / 1%), and no `authority` set. On HyperEVM the factory owner is a 3-of-5 Safe.
- The price provider and quote-source contracts are not verified on hyperevmscan or Sourcify, and the Elysium explorer is behind a bot checkpoint, so their logic was inferred from selectors and state reads only.
- No official or third-party realised-return data exists for these pools that an outsider can read. Metric's markout and Trading PnL APR fields are served only for publicly supported chains (Ethereum, BSC, Robinhood). DefiLlama has TVL and volume for "Metric V1" by chain but no yield pool entries and no fee adapter.
- HyperEVM and Elysium are not "publicly supported" chains per Metric's API and docs (partner key only). The pool and provider contracts the curators deploy there are the current generation, but the venue is effectively semi-private.

### What would have to be true for the vault to LP there

1. The vault must be comfortable that the curator's offchain pricing engine (not an oracle) sets every executable price, bounded only by: a frozen StopLoss (10% or 15% per bin from a decaying peak, first trade per bin unprotected), the bid/ask/reference asymmetry bound (`bidAskRefAsymmetryX8 = 512`, M = 3), and on HyperEVM a PriceVelocityGuard (2% per block, admin-changeable at any time with no timelock).
2. The vault must accept that a curator EOA key compromise is the dominant tail risk: a compromised pricer can sell the pool's inventory up to the StopLoss limit per bin, per peak, repeatedly as the peak decays.
3. The vault needs a monitoring job that re-reads `poolFeeConfig`, `poolAdmin`, `priceVelocityState.maxChangePerBlockE18`, and (on Elysium) the provider's `source()` at least daily, because all of these can change without a timelock.
4. A written agreement with the curator is needed to fix the curator fee share, since the contract allows it to move to the cap at any time (15% on HyperEVM, 50% on Elysium).
5. Inventory drift must be acceptable: all three pools currently hold 87% to 99% of value in USDC, so LPs have been net sellers of WHYPE. A reference-price update moves quoted ranges but does not rebalance holdings (docs, risks page).
6. Given no public return data, the vault would need to run its own markout accounting from pool `Swap` events before sizing anything beyond a pilot.

## 2. Fee economics

Source of truth: `MetricOmmPoolFactory` and `MetricOmmPool` (pool-contracts, `docs/POOL_CONFIGURATION_AND_MANAGEMENT.md` and `docs/SwapMath.md`, section "Fee allocation"), plus docs.metric.xyz/use-metric/fees.

How the fee works. Traders pay no explicit fee; the cost is the half spread between the provider's `reference` price and its `bid` or `ask`, plus any per-bin additional fee set by the curator, plus an optional notional fee (off by default, only Metric can enable, max 1%). The spread fee shares are shares of that half spread, not markups: "Spread components are shares of the oracle spread plus the per-bin additional fee, not extra fees added to the trader's price. The pool retains the remaining spread fee in the bin for LPs. Notional fees are added to the trader's fee and allocated entirely to protocol/admin." (POOL_CONFIGURATION_AND_MANAGEMENT.md section 2.4; SwapMath.md "Fee allocation"). LP earnings stay in the bins and compound; there is nothing to claim (docs/fees).

Who sets what.

| Parameter | Setter | Bound | Timelock |
|---|---|---|---|
| Half spread (bid/ask/reference) | Price provider, chosen by curator at pool creation | `bidAskRefAsymmetryX8` bound on where reference sits; APP providers also clamp to oracle band, custom providers do not | None (quotes update continuously) |
| `adminSpreadFeeE6` (curator share) | Pool admin via `setPoolAdminFees` | `maxAdminSpreadFeeE6` | None |
| `protocolSpreadFeeE6` (Metric share) | Factory owner or authority via `setPoolProtocolFee` | `maxProtocolSpreadFeeE6` | None |
| Per-bin additional fee | Pool admin via `setPoolBinAdditionalFees` | uint16 E6 per side | None |
| Notional fee | Factory owner only | 1% hard ceiling; admin notional capped at 0 on HyperEVM | None |
| Fee caps and defaults | Factory owner | Hard ceilings 50% spread, 1% notional | None |

Docs confirm: "The curator and Metric can each change their share of the spread at any time and with no timelock, even when the Price Provider is immutable. Check the pool's current rates before and after depositing." (docs.metric.xyz/use-metric/fees).

Onchain readings (2026-11-23).

| Chain | Factory state | Value |
|---|---|---|
| HyperEVM 999 | `spreadProtocolFeeE6` default | 150000 (15%) |
| HyperEVM 999 | `getFeeCaps()` | maxProtocolSpread 15%, maxAdminSpread 15%, maxProtocolNotional 1%, maxAdminNotional 0 |
| HyperEVM 999 | `owner()` | 0xa082C768B1C40f5e980b75959D85cF245AFF0FAE, Safe v1.5.0, 3 of 5 |
| HyperEVM 999 | `authority()` | 0x032a22958EE9277eCce675E04e8302B85224a1B0, RolesAuthority (verified on hyperevmscan), owned by the same Safe |
| HyperEVM 999 | `feeReceiver()` | 0x5478De6849E31Db7138685c7E96412dd94A97657, Safe 3 of 5 |
| Elysium 99901 | `spreadProtocolFeeE6` default | 150000 (15%) |
| Elysium 99901 | `getFeeCaps()` | 50% / 50% / 1% / 1% (hard ceilings, never lowered) |
| Elysium 99901 | `owner()` and `feeReceiver()` | 0x8C53D8c86a01A6a713d59d027e33361F83d6C3a8, an EOA (no code); `authority()` is zero |

| Pool | `poolFeeConfig` (protocol spread, admin spread, protocol notional, admin notional) | Pool slot0 total `spreadFeeE6` | LP keeps |
|---|---|---|---|
| HyperEVM 0x76AbC66E0812736B22e1a96c1d3497ED307c3E7f | 150000, 200000, 0, 0 | 350000 (35%) | 65% of spread |
| Elysium 0xCD82337e7d2d1AB66699457a8E25b4d8e78ca259 | 150000, 50000, 0, 0 | 200000 (20%) | 80% |
| Elysium 0xef3AC7034EAc6Bf3B37d3A78B6A510C7C8Ac53C0 | 150000, 0, 0, 0 | 150000 (15%) | 85% |

Note on the HyperEVM pool: the curator share (20%) is above the current admin cap (15%). The cap was lowered after creation; the factory only clamps admin components when `setPoolProtocolFee` is next called (POOL_CONFIGURATION_AND_MANAGEMENT.md section 6.2). The curator cannot raise it further but it stays at 20% until then.

The 7.5% claim. Refuted for these pools and for the protocol default. The factory default on every chain is 15% of the spread (`spreadProtocolFeeE6 = 150000`), the docs say "Metric's default share is 15% of the half spread and bin fees traders pay", and Metric's API `GET https://api.metric.xyz/public/v1/evm/factory-settings` returns `spreadProtocolFeeE6: 150000` for Ethereum, BSC and Robinhood. 7.5% would correspond to a protocol share of 15% applied to a full spread rather than a half spread, or to a different product; no primary source supports it.

Collection. `collectPoolFees(pool)` on the factory is permissionless; the admin share goes to `poolAdminFeeDestination(pool)` and the protocol share to `feeReceiver()`. Accrued pending balances live in pool storage slot 7 (`PoolStateLibrary.SLOT7_PENDING_FEES`).

## 3. Curator model

Definition. "A curator is whoever runs a Metric pool: it chooses the pricing strategy and the pool's settings." In the contracts the role is `poolAdmin[pool]` on the factory. Metric shows an admin as "curated by" only after KYB verification; otherwise "operated by". "Verified doesn't mean endorsed." (docs.metric.xyz/use-metric/provide-and-manage-liquidity/public-pools-and-curation; docs/pool-tiers).

Powers of the pool admin (factory-gated, `IMetricOmmPoolFactoryPoolAdmin`): `setPoolAdminFees`, `setPoolAdminFeeDestination`, `setPoolBinAdditionalFees`, `pausePool`/`unpausePool` (level 1, blocks `swap` only; `addLiquidity` and `removeLiquidity` keep working at every pause level), `proposePoolPriceProvider`/`executePoolPriceProviderUpdate` (reverts `PriceProviderImmutable` when `priceProviderTimelock == type(uint256).max`), and two-step admin transfer. The pool only accepts privileged calls from the factory (`onlyFactory`). There is no function anywhere that lets the admin move LP tokens, change LP shares, or rebalance bins; the only way LP inventory changes is through swaps priced by the provider. (pool-contracts `docs/POOL_CONFIGURATION_AND_MANAGEMENT.md` sections 4 to 7.)

What the curator does control, which is the real lever over LP funds: the pricing. Extensions on these pools and their admin knobs:

- `OracleValueStopLossExtension` 0xE4038fA09f0bB9963068afaF97BE0c045155090D (verified on hyperevmscan, Metric periphery). Parameter changes are timelocked per pool; with `timelock = type(uint40).max` every proposal reverts, which is Metric's own "Immutable StopLoss" baseline check.
- `PriceVelocityGuardExtension` 0xEbc53e61078976118E384f110c262A263decB84B (verified, Metric periphery). "Admin setters take effect immediately (no timelock) ... The pool admin must be trusted." (contract NatSpec).
- HyperEVM pool only: extension 1 is 0xFdAd4b270404e88a02B07B49860ac46409B7b4EF, unverified, deployed by the curator through the CREATE2 deterministic deployer (0x4e59b448...). It implements `beforeSwap`/`afterSwap`/`initialize` and is also the quote source of the pool's price provider (see section 4).

Curators found.

| Chain | Pool | Pool admin (curator) | Admin fee destination | Price provider (immutable) | Extensions | Inventory (2026-11-23) |
|---|---|---|---|---|---|---|
| HyperEVM 999 | 0x76AbC66E0812736B22e1a96c1d3497ED307c3E7f (factory idx 2) | 0x80f0A7d148729CcEdb6cD07FBaAEfC5A16f33D4f, EOA | 0x53F0ACE6156DAF7F6b50B395F6DD66C9d2f50c8c, EOA | 0x0CcD4914E9E8E9425851E8855d3d48FC7976Ef04 | 0xFdAd... (custom), StopLoss, VelocityGuard | 92.0 WHYPE + 40,649 USDC, about $46.6k at $64.3 |
| HyperEVM 999 | other WHYPE/USDC pools idx 1, 9, 10 | same curator | | | | small or empty |
| Elysium 99901 | 0xCD82337e7d2d1AB66699457a8E25b4d8e78ca259 (idx 15) | 0x80f0A7d1..., EOA, same curator | 0x53F0ACE6..., EOA | 0xAeaCf6Fc02046AaC8B1bA76d41034535fd1D3750 | StopLoss only | 14.8 WHYPE + 106,678 USDC, about $107.6k |
| Elysium 99901 | 0xef3AC7034EAc6Bf3B37d3A78B6A510C7C8Ac53C0 (idx 19) | 0xD704abee0C9d1539941Ab968316b1D48D5714E45, EOA | same as admin | 0xed8B73942b3241BA376B64454E67B190A6116587 ("feed-ladder-1.0.0") | StopLoss only | 18.9 WHYPE + 219,613 USDC, about $220.8k |
| Elysium 99901 | 0xBBb3797D5130e16Ec458F3B8b969B75FcF277a27 (idx 13) | 0x80f0A7d1... | 0x53F0ACE6... | 0xAeaCf6Fc... | StopLoss (drawdown 5%) | 22.3 WHYPE + 1,384 USDC |
| Elysium 99901 | idx 1, 4, 8, 10, 16, 20, 21 (WHYPE/USDC) | various | | | | under $100 each or empty |

Elysium factory: 0x2a53833cc95548cf52c7b159110e22d3a9018f32 (same address as HyperEVM), `nextPoolIdx = 22`. USDC on Elysium is 0xb47c4C8F73F009CC0C0d3f92B388d13E293F0B65 and WHYPE is 0xbA876237B0F021A6c6D852d6c26E107997cC5E81 (read from pool `getImmutables()` and `symbol()`).

Identity of the curators is not verifiable from primary sources: no ENS, no verified-curator flag reachable without a partner API key. 0x80f0... also deployed the HyperEVM pool, its provider and the custom extension, and owns the Elysium provider factory 0xAf7FfE95F78CCc1639C37cFc67609ee750Abe807. 0xD704... owns the feed-ladder provider on 0xef3A, which itself reads 0x80f0...'s provider as its source, so both large Elysium pools ultimately depend on the same party's quote feed.

StopLoss settings read from `oracleStopLossConfig(pool)`:

| Pool | drawdownE6 | decayPerSecondE18 | timelock | initialised | pending |
|---|---|---|---|---|---|
| HyperEVM 0x76Ab | 100000 (10%) | 1157407407407 (about 10%/day) | 1099511627775 = 2^40 - 1 | true | none |
| Elysium 0xCD82 | 150000 (15%) | 578703703703 (about 5%/day) | 2^40 - 1 | true | none |
| Elysium 0xef3A | 150000 (15%) | 578703703703 | 2^40 - 1 | true | none |

VelocityGuard on HyperEVM 0x76Ab: `maxChangePerBlockE18 = 2e16` (2% per block, scaling with sqrt(1 + blocks)); anchor mid 64.32 USDC per WHYPE at block 52,059,130. Not attached on the Elysium pools.

## 4. Inventory and price risk

How price is set. The pool calls `IPriceProvider.getQuote()` once per swap and receives `bid`, `ask`, `reference` (Q64.64). Bins are a ladder anchored to `reference`; the marginal execution price is `ask * (1 + d)` buying and `bid * (1 + d)` selling, with `d` the bin distance (pool-contracts docs section 2.2.1). The pool never validates that the quote is economically correct; it only checks `bid <= reference <= ask` and the asymmetry bound. "A valid signature proves who supplied a price; it does not prove that the price is economically correct or that someone will keep publishing it." (oracle-contracts `docs/oracle-overview.md`).

Who can change the oracle. The provider address is immutable on all three pools (`priceProviderTimelock = type(uint256).max`, `getImmutables().immutablePriceProvider` non-zero). But what the provider reads can change:

- HyperEVM 0x76Ab: provider 0x0CcD4914... (1,528 bytes, unverified, created by the curator through a factory-like contract 0x63fb3776...). Its only functions are `token0()`, `token1()`, `getQuote()`, `source()`. `source()` = 0xFdAd4b27..., the custom extension. 0xFdAd exposes `registrar()` = 0x80f0... (the curator), `maxTimeDelta() = 10` seconds, `futureTolerance() = 0`, `poolCount() = 6`, `previewQuote(pool)`, `isTradingPaused(pool)`, `pauseMany(address[])`, `removePool(address)`, `proposeController(address,address)`/`acceptController`, `poolConfig(pool)` (which stores the full creation parameters), and `MIN/MAX_RETENTION_BPS`. Logs from 0xFdAd appear inside swap transactions from many unrelated senders (94 logs in 1,000 blocks, 11 distinct senders, all routed through router contracts), consistent with the docs' "update with trade" delivery: the curator's pricer signs a quote, the taker submits it with the swap, and it is valid for 10 seconds. The practical consequence: the executable price is whatever the curator's offchain engine signs, bounded by StopLoss, VelocityGuard and the asymmetry check. Whether 0xFdAd verifies a signature, from which key, and whether the controller can be rotated by the registrar alone, could not be verified because the contract is unverified.
- Elysium 0xCD82: provider 0xAeaCf6Fc... (914 bytes, unverified) has `source()` = 0x2C267984631628d5EA9d93Bb3B1cEF1F3f99903f and `setSource(address)` callable through its factory 0xAf7FfE95..., whose `owner()` is 0x80f0.... 0x2C26 reads Metric's `CompressedOracleV1` (0xE844701934D9C6085B292e428F41b911cC0b3872, `version() = 1.1.0`, `kind() = compressed`, the only oracle Metric deploys on Elysium) at `feedId` 0x8dfdc825dd0453e7c80b1c1d32ae910e35d6efe9 0000000000000001863d0002, i.e. a feed created by 0x8dfdc825... (creator, chain id 0x1863d, slot 0, position 2) with `maxTimeDelta() = 10` seconds. So the price is a market-maker push feed, and the curator can repoint the pool to any source contract with one transaction and no timelock, even though the pool-level provider is "immutable". The docs warn about exactly this: "what it reads can change: upgradeable feeds or admin-set parameters can still move its prices." (docs/risks-and-safeguards).
- Elysium 0xef3A: provider 0xed8B7394... ("feed-ladder-1.0.0", 8,730 bytes, unverified), `owner()` = 0xD704..., `source()` = 0xAeaCf6Fc... (the 0x80f0... provider above), with `setSource(address)`, `setPaused(bool)`, `paused() = false`, `law()` returning (3, 10, 0, 24000), `MAX_TAU_SECONDS = 604800`. Same conclusion: the curator can change the source at will, and the upstream feed belongs to another party.

Freshness. Standard Metric providers revert `getQuote()` when stale, which makes `swap` revert; LPs can still `removeLiquidity` because pause and provider failures only affect `swap` (POOL_CONFIGURATION_AND_MANAGEMENT.md section 7). The custom sources here enforce a 10 second `maxTimeDelta`. If the feed stops, trading stops and the pool holds whatever inventory it had; there is no liquidation or forced rebalance. If the feed is wrong (too low ask or too high bid), takers buy the mispriced side until StopLoss blocks that direction in each bin crossed; Metric's own words: "A malicious or compromised pool curator with unrestricted pricing can drain a pool by selling its assets too cheaply or buying them at inflated prices." and "none of them caps how much you can lose." (docs/risks-and-safeguards). The first trade in each bin seeds the watermark and is unprotected; watermarks decay 5% to 10% per day so a slow bleed is possible (periphery `OracleValueStopLossExtension.sol` header; Known_issues README 2026-11 entries).

Known economic issue. Metric's own `contest-known-issues.pdf`: an oracle update rescales bin price bounds while reserves stay unchanged until a trade, so after an oracle shock an attacker's two-leg cycle can extract fair value; loss scales with bin width and shock size, fees reduce it. Status: known, by design. The USDC/WHYPE pools use 40 to 160 bins over the ladder (HyperEVM bins -20..19, Elysium 0xCD82 and 0xef3A bins -80..79).

Current inventory skew. All three pools sit at 87% to 99% USDC by value, i.e. LPs are nearly fully sold out of WHYPE at a reference around 64 USDC. A vault entering now would be adding USDC-heavy inventory into pools whose bins are mostly on one side (HyperEVM pool `curBinIdx = 0`, Elysium pools `curBinIdx = 11` and `13` with positive `curBinDistFromProvidedPriceE6` of 4400 and 6500, meaning the active bin sits 0.44% to 0.65% above the reference).

## 5. Realised LP returns

Official data. Metric reports two LP metrics, both after curator and protocol shares: Markout (value of each swap at the reference price 1, 5 or 30 minutes later) and Trading PnL (versus holding). The API exposes `markoutByWindow.<24h|7d|30d|all>.byHorizon.<1m|5m|30m>.aprBps`, `aprBps7d` and `tradingPnlAprBps7d` per pool (docs/reference/api/metadata). These are "past figures, not a forecast" and "only as reliable as the pool's price source" (docs/understanding-your-returns). None of this is retrievable for the pools in question: `GET /public/v1/chains` lists only Ethereum (1), BSC (56) and Robinhood (4663); `GET /public/v1/evm/999/metadata` and `/evm/99901/metadata` return `{"error": "Unknown chainId"}`; the cross-chain endpoint with `chainIds=999,99901` returns an empty list. The docs' chain table marks HyperEVM and Elysium as partner-tier key only. The app's own bundle (app.metric.xyz/assets/index-BqKp-ksD.js) points at the same `https://api.metric.xyz/public/v1/` base with the same `evm/{chainId}/{pool}/metadata` and `.../analytics` routes, so there is no alternative public source.

Third-party data. DefiLlama "Metric V1" (api.llama.fi/protocol/metric-v1): TVL on Hyperliquid L1 about $50.4k (series starts 2026-10-12), on Elysium Kinetiq about $485k (starts 2026-10-30, down from about $810k on 2026-11-18). DEX volume (api.llama.fi/summary/dexs/metric-v1) last 8 days: Hyperliquid L1 $1.1M to $4.2M per day, Elysium $1.4M to $4.9M per day. That is 20 to 80 times TVL per day on HyperEVM, which is only possible with update-with-trade market making, and says nothing about LP profit. DefiLlama has no yield-pool entries (`yields.llama.fi/pools` has zero rows for project "metric") and no fees adapter. No other third-party return data was found.

What the vault can compute itself. Pool `Swap` events (topics 0xcad09799... and 0x97348197... seen on the HyperEVM pool, 248 logs in 1,000 blocks) carry amount deltas; with a reference series from the provider's `getQuote()` (eth_call works and returns the live bid/ask/reference) a markout series can be rebuilt. LP share value per bin is readable from `extsload`: bin state at `keccak256(abi.encode(int256(binIdx), 4))`, bin total shares at slot base 5, position shares at slot base 6 (`PoolStateLibrary.sol`), or through the deployed `MetricOmmPoolStateView`/`MetricOmmPoolDataProvider` 0x9BB15FE2B214E37d19A6c59eE7B132e787FdfB2a (docs/supported-chains).

Verification and ABI. hyperevmscan.io: factory 0x2a53...8f32 "exactly matches its submitted source code", solc v0.8.35, optimizer 1999 runs; pool 0x76Ab... verified as a similar match to pool 0x5DC75b18... (`MetricOmmPool`); StopLoss, VelocityGuard and RolesAuthority exact matches; provider 0x0CcD... and source 0xFdAd... not verified. purrsec.com API returned 404 for all addresses. Sourcify has no match for the provider or source on any chain. The Elysium explorer (elysium.kinetiq.xyz, the only one listed in chainid.network) answers with a Vercel security checkpoint (HTTP 429) to automated requests, so nothing could be checked there; the local Foundry build is the verification for Elysium.

View functions to read fee parameters, curator, oracle and LP value (ABIs in `Metricxyz/pool-contracts/contracts/interfaces/`):

- Factory (`IMetricOmmPoolFactory`): `poolFeeConfig(pool) -> (protocolSpreadFeeE6, adminSpreadFeeE6, protocolNotionalFeeE8, adminNotionalFeeE8)`, `poolAdmin(pool)`, `pendingPoolAdmin(pool)`, `poolAdminFeeDestination(pool)`, `priceProviderTimelock(pool)`, `pendingPriceProvider(pool)`, `pendingPriceProviderExecuteAfter(pool)`, `spreadProtocolFeeE6()`, `protocolNotionalFeeE8()`, `getFeeCaps()`, `feeReceiver()`, `owner()`, `authority()`, `isPool(pool)`, `idxToPool(i)`, `nextPoolIdx()`.
- Pool (`IMetricOmmPool`): `getImmutables()` (tokens, `immutablePriceProvider`, scale multipliers, `initialScaledToken{0,1}PerShareE18`, `minimalOperationalLiquidity`, bin range, extensions and hook orders), `getSellAndBuyPrices()` (non-view, use eth_call), `extsload(bytes32)`: slot 0 packs `pauseLevel|curBinIdx|curPosInBin|curBinDistE6|spreadFeeE6(bits 152..175)|notionalFeeE8(176..199)|bidAskRefAsymmetryX8(200..215)`; slot 1 total scaled token0/token1 in bins; slot 2 notional accumulators; slot 3 mutable provider (zero when immutable); slot 7 pending fees.
- Provider (`IPriceProvider`): `token0()`, `token1()`, `getQuote() -> (bid, ask, reference)` Q64.64 (non-view). Custom providers here also expose `source()`.
- StopLoss: `oracleStopLossConfig(pool)`, `poolStopLossSchedule(pool)`, `highWatermarks(pool, bin)`, `currentHighWatermarks(pool, bin)`. VelocityGuard: `priceVelocityState(pool) -> (anchorMid, lastMid, anchorBlock, lastBlock, maxChangePerBlockE18)`.

## 6. Contract source and release provenance

Open source. GitHub org `Metricxyz` (not `metric-exchange`, which is an unrelated 2022 0x aggregator): `pool-contracts` (metric-core), `periphery-contracts`, `oracle-contracts`, `Known_issues`, plus `mm-pusher-ts` referenced in the oracle docs. Licenses: BUSL-1.1 with change date 2029-07-02 for `MetricOmmPool.sol`, `MetricOmmPoolFactory.sol`, `MetricOmmPoolDeployer.sol`, `SwapMath.sol`, `FeeMath.sol`, `LiquidityLib.sol`; AGPL-3.0 for `auth/Auth.sol`; MIT for everything else including all interfaces (pool-contracts README). Development happens in private repos; audited commits are published as tags `audit-<commit>` with a `VERIFY.md` proof script (README "Audited code").

Tie to deployed bytecode. Built tag `audit-d4d0e2a` of pool-contracts locally (Foundry 1.9.0, solc 0.8.35, via_ir, optimizer 1999 runs, evm cancun, `bytecode_hash = none`, as in the repo's `foundry.toml`) and compared runtime bytecode with `eth_getCode`:

| Contract | HyperEVM 999 | Elysium 99901 |
|---|---|---|
| `MetricOmmPoolFactory` 0x2a53833cc95548cf52c7b159110e22d3a9018f32 | identical (21,451 bytes) | identical |
| `MetricOmmPoolDeployer` 0x2E0A99A2E352043d1CA489cF45bf7B511BCcC738 | identical except the two immutable `FACTORY` references | same |
| `MetricOmmPool` (0x76Ab, 0x5DC7; 0xCD82, 0xef3A, 0xBBb3) | identical after masking the 60 immutable references; the only other difference is the linked `LiquidityLib` address 0xe0b1576ac63a582e6740a7e1dcfbbef730539cd4 | same |
| `LiquidityLib` 0xe0b1576a...9cd4 | identical except its own embedded address | same |

`audit-d4d0e2a` is the version the README and docs name as "the core dependency of the periphery code Sherlock reviewed in September 2026": it differs from the last fully audited core tag `audit-4410fec` by one logic change (precision fix in the bid/ask/reference asymmetry check) and the optimizer setting. The factory ABI on hyperevmscan was published from `lib/metric-core/...` paths with solc v0.8.35 and 1999 runs, consistent with the periphery repo's build. The oracle layer on Elysium (`CompressedOracleV1` 0xE844...) is Metric's; the docs note it "comes from a different build and differs from the other chains only in its compiler metadata hash". The custom providers and the 0xFdAd source are not from any Metric repo and are unverified.

## 7. Audits

| Firm | Window | Scope and commits | Result | Link |
|---|---|---|---|---|
| Sherlock | 2026-05-22 to 2026-06-19 (collaborative) | metric-core 6aa6c3b, periphery 90039f9, oracle a7644f6 | 1 High, 9 Medium, 31 Low/Info; fixes at 7b9ab56 / d210a84 / 056c204 | github.com/Metricxyz/Known_issues/blob/main/sherlock/2026.07.06 - Final - Metric Collaborative Audit Report 1783346590.pdf |
| Zellic | report dated 2026-06-29 (PDF front page prints June 29, 2025, which looks like a typo) | core 6aa6c3b, periphery 0069084, oracle eda97bb | 5 findings, 0 critical, 3 medium, 1 low, 1 informational | Known_issues/zellic/Metric OMM - Zellic Audit Report.pdf |
| Sherlock | 2026-07-06 to 2026-07-27 (public bug bounty contest 1279) | core 7b9ab56, periphery d210a84, oracle 056c204 | 0 High, 9 Medium (10 Medium listed in the table of contents); fixes at 4410fec / 9b69f75 / 8b72555 | Known_issues/sherlock/2026.09.15 - Final - Metric Public Bug Bounty Audit Contest Report 1789468517.pdf; audits.sherlock.xyz/contests/1279 |
| Sherlock | 2026-09-22 to 2026-09-24 (collaborative) | periphery 378a748 (external swap executor, propAMM adapter 8f127a2) | counts not extractable from the PDF text layer | Known_issues/sherlock/2026.10.10 - Final - Metric Collaborative Audit Report 1791595461.pdf |
| Zellic | report dated 2026-10-06 (re-audit) | core 33d0a34 to 4410fec, periphery cc8fef9 to 9b69f75, oracle edbc5f0 to 8b72555 | 8 findings, 0 critical, 7 low, 1 informational | Known_issues/zellic/OMM Reaudit - Zellic Audit Report.pdf |

Also: Immunefi bug bounty up to $500,000 (immunefi.com/bug-bounty/metric), in scope the three public repos; the `Known_issues` README lists post-audit reports with five items marked "fix pending" as of 2026-11 (liquidity adder, core SwapMath, ScheduledMultiplier, BNB multiplier pricing, frontend bundle), with details withheld until fixes deploy. The custom price providers, quote sources and the 0xFdAd extension used by these pools were audited by nobody that we can find.

## 8. Address sheet

HyperEVM (999), RPC used: https://rpc.hyperliquid.xyz/evm and https://hyperliquid.drpc.org

- Factory 0x2a53833cc95548cf52c7b159110e22d3a9018f32, owner Safe 0xa082C768B1C40f5e980b75959D85cF245AFF0FAE (3/5), authority RolesAuthority 0x032a22958EE9277eCce675E04e8302B85224a1B0, fee receiver Safe 0x5478De6849E31Db7138685c7E96412dd94A97657 (3/5), deployer 0x2E0A99A2E352043d1CA489cF45bf7B511BCcC738, LiquidityLib 0xe0b1576ac63a582e6740a7e1dcfbbef730539cd4
- Pool 0x76AbC66E0812736B22e1a96c1d3497ED307c3E7f: WHYPE 0x5555555555555555555555555555555555555555 / USDC 0xb88339CB7199b77E23DB6E890353E22632Ba630f, admin 0x80f0A7d148729CcEdb6cD07FBaAEfC5A16f33D4f, fee dest 0x53F0ACE6156DAF7F6b50B395F6DD66C9d2f50c8c, provider 0x0CcD4914E9E8E9425851E8855d3d48FC7976Ef04, source/extension 0xFdAd4b270404e88a02B07B49860ac46409B7b4EF, StopLoss 0xE4038fA09f0bB9963068afaF97BE0c045155090D, VelocityGuard 0xEbc53e61078976118E384f110c262A263decB84B
- Other WHYPE/USDC pools: 0x5DC75b184B9c94865e05E260395499508607bd3e, 0x7742558E518fc6e461f5246F3e9B9E97Abc6F973, 0x28ffE01C31a3e48a1d968c087EE81766bB62e17a

Elysium (99901), RPC https://rpc.elysium.kinetiq.xyz

- Factory 0x2a53833cc95548cf52c7b159110e22d3a9018f32, owner and fee receiver EOA 0x8C53D8c86a01A6a713d59d027e33361F83d6C3a8, no authority, deployer 0x2E0A99A2E352043d1CA489cF45bf7B511BCcC738, CompressedOracleV1 0xE844701934D9C6085B292e428F41b911cC0b3872, PriceProviderFactory 0x050502eE4Da0eE2a9D44eE6046310F9f1532aCF2 (AnchoredProviderFactory not deployed)
- Pool 0xCD82337e7d2d1AB66699457a8E25b4d8e78ca259: admin 0x80f0A7d1..., provider 0xAeaCf6Fc02046AaC8B1bA76d41034535fd1D3750 (factory 0xAf7FfE95F78CCc1639C37cFc67609ee750Abe807 owned by 0x80f0..., source 0x2C267984631628d5EA9d93Bb3B1cEF1F3f99903f reading compressed feed 0x8dfdc825dd0453e7c80b1c1d32ae910e35d6efe90000000000000001863d0002)
- Pool 0xef3AC7034EAc6Bf3B37d3A78B6A510C7C8Ac53C0: admin 0xD704abee0C9d1539941Ab968316b1D48D5714E45, provider 0xed8B73942b3241BA376B64454E67B190A6116587 (source 0xAeaCf6Fc...)
- Pool 0xBBb3797D5130e16Ec458F3B8b969B75FcF277a27: admin 0x80f0A7d1..., provider 0xAeaCf6Fc...

Primary sources: github.com/Metricxyz/pool-contracts (README, docs/POOL_CONFIGURATION_AND_MANAGEMENT.md, docs/SwapMath.md, contracts/), github.com/Metricxyz/periphery-contracts (contracts/extensions/), github.com/Metricxyz/oracle-contracts (docs/oracle-overview.md, docs/DEPLOYMENTS.md, contracts/), github.com/Metricxyz/Known_issues, docs.metric.xyz (use-metric/fees, use-metric/pool-tiers, use-metric/risks-and-safeguards, use-metric/provide-and-manage-liquidity/understanding-your-returns and public-pools-and-curation, reference/security-and-audits, reference/supported-chains-and-deployments, reference/api/metadata), api.metric.xyz/public/v1/chains and /evm/factory-settings, immunefi.com/bug-bounty/metric, api.llama.fi/protocol/metric-v1 and /summary/dexs/metric-v1, hyperevmscan.io address pages, onchain reads as listed.
