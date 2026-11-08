# Orphic FACTS.md

Verified Saturday 7 November 2026, about 17:30 ET, by reading state directly from the chains with `cast` (Foundry 1.5.1) and from the Morpho and HyperLend APIs. Every address below was read back on-chain unless marked **unverified**. HyperEVM RPC used: `https://rpc.hyperliquid.xyz/evm` (chain id 999, latest block 50,663,139 at time of reading). Where a bytecode hash is quoted, it is `keccak256` of the runtime code and was compared against the same contract on Ethereum (publicnode) or Base.

## 0. Live deployment (HyperEVM, 8 Nov 2026, read back on-chain)

All signed by Cashout from 0x2DBE through the signer page, 23 transactions in total, about 0.001 HYPE of gas.

| Contract | Address | Block |
|---|---|---|
| Senior, Morpho Vault V2 "Orphic Senior USDC" (osUSDC) | 0x3F7382bd8BFC6C548CAa2D7B4dfCe628B12A9759 | 50747831 |
| MorphoMarketV1AdapterV2 (senior to Morpho markets) | 0x7b00b45e77afe7e07a2C9910FF9c5CE538386fb1 | 50747953 |
| MorphoVaultV1Adapter (senior to Felix USDC v1.1, liquidity adapter) | 0x0cdfdbC51744Ba1ed88bB8752098105fb43f37AC | 50748014 |
| Junior, JuniorVault (ojUSDC) | 0x20D5F4f78858D257eA047EB5F47773E361697F2E | 50748319 |
| FeeRouter | 0xC2d2C5e56798Bfd0EEc67EEC12ddC2b521b1aA37 | 50748502 (approx) |

Roles: senior owner and curator 0x9EDfDc92A46adbfa7b6189295376bEF4599c5F29 (MetaMask account, Safe later); allocators 0x2DBE and the Rotator key 0xC772F0ea992236dA71Fa30b8899D71B680866956; junior and router owner 0x2DBE1Ba83084dAF698Acea79CBAfe0493f42FecC; junior agent and router keeper 0xC772; treasury 0xba08A51bb1BB49E9840Eb55511E8880F95306A40.

Senior state: management fee 158548959/s (0.5% a year) to junior, maxRate 63419583967/s, liquidity adapter Felix, absolute caps 425k on both adapters, relative caps 100%, 12 curator functions at timelock 259200 (3 days), setIsAllocator at 0.
Junior state: seeded (1 USDC dead shares), depositCap 75k, walletCap 10k, 4 markets, 2 vaults (Felix, senior), deposits open since the live test.
Live test (same day): 316 USDC into senior (all in Felix), 80 USDC into junior, 0.000001 ojUSDC exit queued for 16 Nov 00:00 UTC. seniorSupplyBase synced at 316 shares, cover 0.
Hyperliquid L1: 0x2DBE has an approved API agent "orphic-deploy" 0x23354F1bcd8dD322778628696C3E9912588b6203 (valid 180 days) used to toggle big blocks; to be removed by Cashout. Big blocks are off.
Gas: our transactions paid 0.1 gwei; at 22:00 UTC the base fee was 56 gwei, so the Rotator's gas-aware HOLD is working as intended.

## 1. HyperEVM (chain 999): Morpho

| Contract | Address | How verified |
|---|---|---|
| Morpho Blue | `0x68e37dE8d93d3496ae143F2E900490f6280C57cD` | `MORPHO()` on Felix USDC, Felix USDT0, Gauntlet USDC and on both factories |
| MetaMorpho **v1.1** factory | `0xec051b19d654C48c357dC974376DeB6272f24e53` | `isMetaMorpho(FelixUSDC) = true`; Felix USDC exposes `lostAssets()` (v1.1 only); every v1 vault on the chain lists this factory |
| **Vault V2 factory** | `0xD7217E5687FF1071356C780b5fe4803D9D967da7` | `isVaultV2(FelixUSDCV2) = true`; runtime bytecode hash `0xba55eb73…5503` **identical** to Ethereum `0xA1D94F74…0405` and Base `0x45011255…5857` |
| MorphoMarketV1AdapterFactory (V2 adapter for Morpho Blue markets) | `0xaEff6Ef4B7bbfbAadB18b634A8F11392CBeB72Be` | `factory()` on Felix USDC V2's adapter |
| MorphoVaultV1AdapterFactory (V2 adapter for v1/v1.1 vaults) | `0xdf5202e29654e02011611A086f15477880580CAc` | `factory()` on two V2 adapters wrapping v1.1 vaults |
| Adaptive Curve IRM | `0xD4a426F010986dCad727e8dd6eed44cA4A9b7483` | `irmAddress` on every sizeable USDC/USDT0 market |
| Morpho Blue owner | `0x34EdAe4f1Fd1b5947f6bE560ca371a56042daCbA` | `owner()` |

**Conclusion that changes the plan: Vault V2 exists on HyperEVM, byte-identical to mainnet. Senior goes on Vault V2, not v1.1.** Felix itself has already migrated: Felix USDC V2 holds $8.41M (that is the "$7.9M" in the flow file); the v1.1 Felix USDC holds $3.21M.

Adapter types that exist on HyperEVM: Morpho Blue markets (MorphoMarketV1) and Morpho v1/v1.1 vaults (MorphoVaultV1). **There is no HyperLend adapter and no generic ERC-4626 adapter on this chain, and HyperLend's aTokens are not 4626 anyway. HyperLend allocation for senior = 0 on Monday**, exactly as the brief's fallback says.

**Second constraint: a USDC Vault V2 can only allocate to markets whose loan asset is USDC.** The adapters enforce `loanToken == vault.asset()`. The "25% USDT0 markets" sleeve is not reachable from a USDC vault without a swap, which Morpho vaults do not do. Decision needed (section 9).

### Reference vaults (live state read on-chain)

| Vault | Address | Asset | totalAssets | Fee | Notes |
|---|---|---|---|---|---|
| Felix USDC V2 | `0x51254785367d73A10a2Ea7d44B8e97b749BfbE8b` | USDC | $8.41M | perf 10%, mgmt 0 | one MorphoMarketV1 adapter `0xCB91635E00B15022869780753C55a61a29eaf6a0`, `maxRate` 63,419,583,967 per s (about 200% APR ceiling), virtualShares 1e12 |
| Felix USDT0 V2 | `0x6fF35ae1BAD0Edc0Cf354E0cd64f10e4D1726f57` | USDT0 | $4.78M | | |
| Felix USDC (v1.1) | `0x8A862fD6c12f9ad34C9c2ff45AB2b6712e8CEa27` | USDC | $3.21M | 10% to `0x4A8274…0B3A` | timelock 3 days, 10 markets in withdraw queue, APY 5.59% gross / 5.01% net (API) |
| Felix USDT0 (v1.1) | `0xFc5126377F0efc0041C0969Ef9BA903Ce67d151e` | USDT0 | $2.15M | 10% | APY 6.35% / 5.70% net |
| Gauntlet USDC (v1.1) | `0x08C00F8279dFF5B0CB5a04d349E7d79708Ceadf3` | USDC | $1.45M | 10% | APY 5.75% / 5.16% net |
| K3 USDC (V2, listed) | `0x589a57196c16d0CfAB3Ed229Fcfa959f65cA00bf` | USDC | $1.18M | | |

### USDC markets on Morpho Blue, HyperEVM (candidates for senior caps; API state 7 Nov)

All use the Adaptive Curve IRM above. Utilisation is 88 to 90% everywhere, so instant liquidity is thin: about $3M across all USDC markets.

| Market id | Collateral | LLTV | Supply | Liquidity | Util | Supply APY | Used by |
|---|---|---|---|---|---|---|---|
| `0x96c47d3797394dd25e33f814216793a89d2e6edcc54d1dac3ab4c2b2d82a73b9` | kHYPE | 77.0% | $9.27M | $1.14M | 88% | 5.55% | feUSDC |
| `0xd7d38220652d19c87099c3b23de9a70a1893620a050c635d1a94bd947c9c59a8` | WHYPE | 77.0% | $8.75M | $0.99M | 89% | 5.64% | feUSDC, K3 |
| `0xe7aa046832007a975d4619260d221229e99cc27da2e6ef162881202b4cd2349b` | kHYPE | 62.5% | $7.80M | $0.78M | 90% | 5.74% | gtUSDC, feUSDC |
| `0x45af9c72aa97978e143a646498c8922058b7c6f18b6f7b05d7316c8cf7ab942f` | UBTC | 77.0% | $0.66M | $0.07M | 90% | 5.79% | gtUSDC, feUSDC |
| `0xd13b1bad542045a8dc729fa0ffcc4f538b9771592c2666e1f09667dcf85804fc` | WHYPE | 62.5% | $0.52M | $0.05M | 90% | 6.13% | gtUSDC, feUSDC |
| `0xcac72237bf1391fd999e993cb8824dc38d4ef941856fc9c2680b96b8961b133b` | wstHYPE | 77.0% | $0.21M | $0.02M | 89% | 5.64% | feUSDC |

USDT0 markets for reference (not reachable from a USDC vault): kHYPE 62.5% $5.65M 6.46%, WHYPE 62.5% $4.84M 6.44%, UBTC 77% $1.29M 6.46%. **Exclude** the AVLT/USDT0 market `0x8eecdd03…0ba5` ($17M, 100% utilised, nonsense APY): it is a trap market.

## 2. HyperEVM: tokens and infrastructure

| Item | Address | Verified |
|---|---|---|
| USDC (HyperEVM, 6 decimals, symbol `USDC`) | `0xb88339CB7199b77E23DB6E890353E22632Ba630f` | `asset()` on Felix USDC and Gauntlet USDC, `decimals()`, `symbol()` |
| USDT0 | `0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb` | `asset()` on Felix USDT0 |
| WHYPE | `0x5555555555555555555555555555555555555555` | code present; asset of Felix HYPE vaults (API) |
| kHYPE | collateral of the two largest USDC markets | address not read; take from market params when needed |
| CoreWriter precompile | `0x3333333333333333333333333333333333333333` | code present (1,091 bytes) |
| Read precompiles | `0x0000000000000000000000000000000000000800` and up | code present |
| Safe singleton 1.4.1 | `0x41675C099F32341bf84BFc5382aF534df5C7461a` | bytecode **matches Ethereum** |
| SafeL2 1.4.1 | `0x29fcB43b46531BcA003ddC8FCB67FFE91900C762` | code present |
| SafeProxyFactory 1.4.1 | `0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67` | bytecode **matches Ethereum** |
| Zodiac Roles v2 mastercopy | `0x9646fDAD06d3e24444381f44362a3B0eB343D337` | bytecode **matches Ethereum** |
| Zodiac ModuleProxyFactory | `0x000000000000aDdB49795b0f9bA5BC298cDda236` | bytecode **matches Ethereum** |
| CreateX | `0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed` | code present |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` | code present |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` | code present |

Safe 1.4.1 and Zodiac Roles v2 are both on HyperEVM at canonical addresses with mainnet bytecode. The audited path for the agent key is available. My recommendation (in-contract allowlist for Monday, Zodiac in week two) stands on schedule grounds only; the dependency objection is gone.

## 3. HyperLend

- Rates API live: `https://api.hyperlend.finance/data/markets/rates?chain=hyperEvm`. Returns a map keyed by underlying token address with `supplyAPR, supplyAPY, borrowAPR, borrowAPY` **already in percent**. USDC supply APY 6.91%, USDT0 6.49% at time of reading (both higher than the 5.8% in the brief).
- No Morpho V2 adapter exists for it, so it is a Rotator data source and a junior-sleeve candidate, not a senior venue, on Monday.

## 4. Elysium (Kinetiq's Hyperliquid L2)

| Item | Status |
|---|---|
| Mainnet launch | 9 November 2026, confirmed by Kinetiq's blog. No time of day published. |
| Mainnet chain id | **99901 unverified.** Kinetiq's docs say chain id and explorer are "published at launch". 99901 appears in third-party chain-registry PRs (dRPC, ShapeShift). |
| Mainnet RPC | Not public yet. Conduit already serves `https://rpc-elysium-mainnet.t.conduit.xyz` but it answers "unauthorized rpc key" (so the infrastructure exists). Docs list Alchemy `https://elysium-mainnet.g.alchemy.com/v2/{API_KEY}`. **You will need an Alchemy or Conduit key on Monday morning; that is a login only you have.** |
| Testnet | chain id `99801`, public RPC `https://testnet-rpc.elysium.kinetiq.xyz` (answers), explorer `https://elysium.kinetiq.xyz/testnet-explorer`, settles to HyperEVM testnet 998 |
| Stack | Arbitrum Orbit (Nitro/ArbOS) run with Conduit, AnyTrust DA, native HYPE gas (`msg.value`, 1:1 bridged), 100 ms blocks, single sequencer at launch |
| Canonical token bridge | Standard Orbit gateways. Deposit HyperEVM to Elysium "within a minute". Withdrawal is optimistic; **challenge period length is not published anywhere I could find.** L2 token address: `L2GatewayRouter.calculateL2TokenAddress(hyperEvmToken)`, deterministic before first deposit. |
| USDC on Elysium | Bridged representation of HyperEVM USDC `0xb88339…630f` through the canonical gateway. Mainnet address derivable only once the mainnet router address is published. Docs warn about look-alike tokens. |
| Testnet addresses (shape only, mainnet "coming soon") | Elysium router `0x89659883a9d980925733B0A698F117AAb65ac718`, Elysium ERC-20 gateway `0x30545d8b24185DdFe83E75aB6939f867b664e2E1`, testnet USDC `0x7D29d8047B905000459c0E80c34a26CeedcB47b2`, testnet WHYPE `0xCD57F65c2B0e5881CFC2E609F7CD53b746E1F234`, HyperEVM-testnet router `0x1aAE2caD8B0249905492087EF230FcCEa3707C45`, inbox `0x11178Df40CBf87a4343f4B3F8B09B366ceFA8Ec0`, rollup `0xEbf08e34941fd93a0Fc1cD89dbBF7447267039Df`. Multicall3 at the canonical address. |
| CoreWriter / HyperCore reads on Elysium | Not at launch. "ElysiumCoreWriter" predeploy and market-data precompile arrive in an ArbOS upgrade about four weeks after mainnet. |
| Builders allocation | 25% of sequencer revenue to applications that drive blockspace usage (Kinetiq blog). Mechanism unpublished. |
| Wormhole / Mayan | Announced partnership (Crypto Briefing, early Nov). Live status at launch **unverified**; the page would not load from here. |
| Uniswap v4 PoolManager on Elysium | **Unverified.** Uniswap announced an Elysium deployment (26 Oct). o1.exchange's launcher is not findable from here. Monday-morning checklist item, with o1 tax mode as the fallback exactly as the brief says. |
| Nest, Aero, Elyra | Not verifiable before mainnet RPC is public. Monday-morning checklist. |

## 5. Circuit

Not re-verified today (no on-chain surface to read). Treated as the brief states: strategy authoring and backtesting only, never custody.

## 6. What this changes versus the brief and the design note

1. **Senior is a Morpho Vault V2**, created from factory `0xD7217E…7da7`, with a MorphoMarketV1 adapter from `0xaEff6E…72Be`. V2 gives us: a **management fee paid to a recipient** (the 0.5-point give-up to junior, set `managementFee` with `managementFeeRecipient = JuniorVault`, no custom code), a performance fee switch we leave at 0, absolute and relative caps per market, a liquidity adapter for instant withdrawals, `forceDeallocate` for depositors, and gates we leave open. The flow file's structure is correct; the note's "Morpho V2" was right and the brief's hedge is resolved.
2. **Timelock sequencing is easier than the brief assumed.** In Vault V2 every curator function starts with timelock 0 at creation. We can set adapters, caps and fees in the deploy transaction batch, then raise the timelock as the last step. So caps do not have to go in today; they go in Sunday's deploy batch, and nothing can be sent today anyway because only you sign.
3. **HyperLend 25% becomes 0** (no adapter). **USDT0 25% cannot be done from a USDC vault.** Both fold into USDC markets or idle; see decision below.
4. **Felix's own fee is 10% of yield on top of the markets' rates**, so holding feUSDC naked nets about 5.0%, not 5.2%. Our own vault on the same markets with 0 performance fee and 0.5% management fee gives senior about 5.1 to 5.2% net at today's rates. That is the honest comparison for the "how it works" page; still no APY promises in public copy.
5. Elysium specifics (chain id, RPC, canonical USDC, PoolManager, Wormhole) are **Monday-morning items by construction**; the runbook will have a slot for each with the exact read-back command.

## 7. Senior allocation as the facts allow (proposal, estimates)

| Sleeve | Brief | Now possible | Proposed cap |
|---|---|---|---|
| Blue-chip USDC markets | 40% | kHYPE 77%, WHYPE 77%, kHYPE 62.5% | 30% / 30% / 20% absolute caps, relative cap 50% each |
| USDT0 markets | 25% | not from a USDC vault | 0 |
| HyperLend | 25% (if adapter) | no adapter | 0 |
| UBTC 77% USDC market | | thin ($0.66M) | 10%, relative 20% |
| Idle / liquidity | 10% | vault idle balance | 10% minimum, enforced by Rotator, plus V2 `forceDeallocate` for depositors |

Blended gross at today's rates about 5.6% on the deployed 90%, about 5.1% on the whole, minus 0.5% management fee to junior. Estimates, not promises.

## 8. Tooling state in my sandbox

Foundry 1.5.1 (forge, cast, anvil, chisel) installed; HyperEVM RPC, Ethereum and Base public RPCs, Morpho API, HyperLend API all reachable. Elysium testnet RPC reachable; mainnet RPC does not exist publicly yet. GitHub reachable for cloning; the Orphic org push waits for your authorisation.

## 9. Decision needed from you (one)

Senior's USDC sleeve mix given constraints 3 and 4. My recommendation: Vault V2, caps as in section 7 (kHYPE 77% 30%, WHYPE 77% 30%, kHYPE 62.5% 20%, UBTC 77% 10%, 10% idle), 0.5% management fee to junior, 0 performance fee, 3-day timelock after setup. The alternative is to add the MorphoVaultV1 adapter and park a slice in Felix USDC v1.1 for diversification across curators, at the cost of paying Felix's 10% fee on that slice.
