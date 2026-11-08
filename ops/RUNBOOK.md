# Orphic ops runbook

Everything you sign, in order, with what each step does and how we read it back. Only Cashout signs. Claude prepares and verifies. Nothing is "live" until its read-back passes.

Roles at launch (baked into the scripts, `script/Addresses.sol`)
- JUNIOR_OWNER `0x2DBE1Ba83084dAF698Acea79CBAfe0493f42FecC` (hardware wallet): owner of JuniorVault and FeeRouter. Broadcasts step 2. Today holds 0 HYPE and 0 USDC: fund it (step 0.2).
- SENIOR_SAFE `0x9EDfDc92A46adbfa7b6189295376bEF4599c5F29`: senior owner and curator after step 3, behind the 3-day timelock on caps, adapters, fees, allocators and gates. **Has no code on HyperEVM as of Sat night**: deploy the Safe on chain 999 at this address (same owners and salt nonce in the Safe app with HyperEVM selected) or give me the HyperEVM Safe address to bake instead. Step 3 refuses to run until it exists.
- Trust note (review M-5): the senior curator can route senior funds to a venue that loses, and junior pays. Keep the curator on a Safe distinct from the junior owner before caps are raised beyond launch, and keep the 3-day timelock on adapters and caps.
- DEPLOYER: your EOA. Owner and curator of senior, owner of junior and router, until handed to a Safe (optional step 3 env `OWNER_FINAL`).
- AGENT: the Rotator key (hot, in GitHub Actions secrets). Allocator on senior, agent on junior, keeper on router. Can move money between allowlisted venues and back. Cannot withdraw to anyone.
- TREASURY: an address you control. Receives 25% of fees.

Chains
- HyperEVM 999, RPC `https://rpc.hyperliquid.xyz/evm` (sends) and `https://hyperliquid.drpc.org` (reads and forks). Explorer `https://hyperevmscan.io`.
- Elysium 99901 (unverified until Kinetiq publishes). RPC via Alchemy `https://elysium-mainnet.g.alchemy.com/v2/{KEY}` or Conduit `https://rpc-elysium-mainnet.t.conduit.xyz` with a key. You need to create one of those keys before Monday morning.

## 0. Saturday night: prerequisites you do (keys involved)

0.1 Put the deployer on big blocks. HyperEVM small blocks are about 3M gas; the deploy needs up to 10M per transaction. This is a HyperCore exchange action, not an EVM transaction. With the official Python SDK (`pip install hyperliquid-python-sdk`):
```
from hyperliquid.exchange import Exchange
from eth_account import Account
ex = Exchange(Account.from_key(PRIVATE_KEY), "https://api.hyperliquid.xyz")
print(ex.use_big_blocks(True))
```
Read-back: `curl -s https://api.hyperliquid.xyz/info -d '{"type":"userDetails","user":"<DEPLOYER>"}'` is not the field; instead send a trivial transaction and confirm its block's gasLimit is 30,000,000: `cast receipt <tx> blockNumber --rpc-url https://rpc.hyperliquid.xyz/evm` then `cast block <n> gasLimit`. Switch back to small blocks after the deploy (cheaper, faster): `ex.use_big_blocks(False)`.

0.2 Fund the hardware wallet (DEPLOYER for all steps) with about 2 HYPE and at least 2 USDC (1 USDC seeds junior), plus the treasury USDC and ORPH you will use for the live test.
0.2a Deploy the Safe on HyperEVM at `0x9EDf…5F29` (see roles above) and confirm `cast code` is non-empty.

0.3 Create the AGENT key (fresh EOA), fund it with 0.5 HYPE, put the private key only in the GitHub Actions secret `AGENT_PRIVATE_KEY`. Give me only the address.

0.4 Create the Elysium RPC key (Alchemy or Conduit). Give me only the URL to put in `VITE_ELYSIUM_RPC` and the keeper config.

0.5 Authorise the GitHub org push (Orphic org, repo `orphic`). I push the monorepo: `contracts/`, `keeper/`, `web/`, `ops/`.
0.6 Hosting. orphic.fi is registered at Hostinger, domain only (no hosting plan; do not buy one). Create a Vercel account linked to the GitHub org, import `orphic`, root directory `web`, framework Vite (`web/vercel.json` is already there), env `VITE_ELYSIUM_RPC`. Then in Hostinger, Domains, orphic.fi, DNS: `A @ 76.76.21.21` and `CNAME www cname.vercel-dns.com`; add `orphic.fi` and `www.orphic.fi` as domains in the Vercel project. Read-back: `dig +short orphic.fi` returns 76.76.21.21 and https://orphic.fi serves the vaults page with a valid certificate. Until then the Vercel preview URL is the test site.

## 1. Sunday: deploy senior (step 1 of 3)

What it does: creates the Vault V2 from Morpho's factory, names it, creates the Morpho-markets adapter and the Felix adapter, makes DEPLOYER and AGENT allocators, sets absolute caps and 100% relative caps on every id. Timelocks are 0 at this point so it all lands in one broadcast.

```
cd contracts
export DEPLOYER=0x... AGENT=0x... HYPEREVM_RPC=https://rpc.hyperliquid.xyz/evm
forge script script/01_DeploySenior.s.sol --rpc-url $HYPEREVM_RPC --broadcast --slow --sender $DEPLOYER --interactive -vvv
```
`--interactive` prompts for the key; it never touches disk. Expected gas about 10M total across the batch.

Read-back (I run these and paste results into the log):
```
cast call $SENIOR "owner()(address)"; cast call $SENIOR "curator()(address)"
cast call $SENIOR "adaptersLength()(uint256)"            # 2
cast call $SENIOR "isAllocator(address)(bool)" $AGENT     # true
cast call $SENIOR "absoluteCap(bytes32)(uint256)" $(cast keccak $(cast abi-encode "f(string,address)" "this" $FELIX_ADAPTER))
cast call 0xD7217E5687FF1071356C780b5fe4803D9D967da7 "isVaultV2(address)(bool)" $SENIOR
```

## 2. Sunday: deploy junior and router (step 2 of 3)

What it does: deploys JuniorVault (owner DEPLOYER, cap $75k, senior = step 1 vault), seeds it with 1 USDC of dead shares, pauses deposits, sets the agent, registers the four Morpho markets plus Felix and the senior vault as its valuation universe and venue list, sets the agent allowlist (Morpho supply/withdraw, Felix deposit/redeem/withdraw, senior redeem/withdraw, USDC approvals to Morpho and Felix only). Deploys FeeRouter with recipients senior / junior / treasury and keeper = AGENT.

```
export SENIOR=0x... TREASURY=0x...
forge script script/02_DeployJuniorRouter.s.sol --rpc-url $HYPEREVM_RPC --broadcast --slow --sender $DEPLOYER --interactive -vvv
```
Read-back: `seeded() true`, `depositsPaused() true`, `agent()`, `marketsLength() 4`, `vaultsLength() 2`, `rules(MORPHO, 0xa99aad89)` allowed with offset 224 (supply), router `senior()`/`junior()`/`treasury()`.

## 3. Sunday: wire senior (step 3 of 3)

What it does: management fee 0.5% a year paid in senior shares to junior; `maxRate` 200% a year; Felix as liquidity adapter; then 3-day timelocks on addAdapter, caps, fees, fee recipients, allocators, gates, adapter registry. Optionally hands owner and curator to a Safe.

```
export JUNIOR=0x... FELIX_ADAPTER=0x...   # OWNER_FINAL=0xSafe optional
forge script script/03_WireSenior.s.sol --rpc-url $HYPEREVM_RPC --broadcast --slow --sender $DEPLOYER --interactive -vvv
```
Read-back: `managementFeeRecipient() == JUNIOR`, `managementFee() == 158548959`, `maxRate() == 63419583967`, `liquidityAdapter() == FELIX_ADAPTER`, `timelock(0x...addAdapter) == 259200`.

After step 3, caps and adapters cannot change for 3 days. That is the point.

## 4. Sunday: dry-run a settle on a fork
I run `forge test --match-contract DeployTest` against the live addresses (env `SENIOR`, `JUNIOR` override) and the junior test suite pointed at the deployed junior: deposit, agent supply, warp 7 days, `settle()`, exit, claim. Results into the log.

## 5. Sunday: keeper and front end
- Keeper: fill `keeper/config/senior.json` with SENIOR, MARKET_ADAPTER, FELIX_ADAPTER; repo variable `LIVE` unset (dry-run) until Monday; secrets `AGENT_PRIVATE_KEY`, `RPC_URL`.
- Front end: `web/src/config/addresses.ts` with the addresses, `DEPLOYED = true`, deploy to the orphic.fi host. Write buttons stay disabled by `OPENS_LABEL` until Monday.

## 5a. Monday: ORPH and the pool (step 4 and 5)

Step 4, `04_DeployORPH.s.sol`: ORPH (1B, no owner), two OZ timelocks (treasury 15%, incentives 10%, 3-day delay, admin = TREASURY_ADMIN), TeamVesting (15%, 2 years, 6-month cliff, beneficiary TEAM), 60% to POOL_SEEDER (the Safe).
```
export DEPLOYER=0x... POOL_SEEDER=0xSafe TREASURY_ADMIN=0xSafe TEAM=0x...
forge script script/04_DeployORPH.s.sol --rpc-url $HYPEREVM_RPC --broadcast --slow --sender $DEPLOYER --interactive -vvv
```
Read-back: `totalSupply() 1e27`, `balanceOf(POOL_SEEDER) 6e26`, `balanceOf(TREASURY) 1.5e26`, `balanceOf(VESTING) 1.5e26`, `balanceOf(INCENTIVES) 1e26`, `balanceOf(DEPLOYER) 0`, vesting `cliff()`, timelock `getMinDelay() 259200`.

Step 5, pool (`05_SeedPool.s.sol`, fork-tested against the live PoolManager): Uniswap v4 on HyperEVM, pool HYPE (native, currency0) / ORPH, 1% fee, tick spacing 200, no hook. Initialised at the price that makes 1B ORPH worth FDV_USD (default $5,000) using the live HYPE price. One single-sided position holding all 600M ORPH from the minimum tick up to just under the opening price; buyers walk into it. Minted from the hardware wallet (which holds the 600M from step 4, so POOL_SEEDER = the hardware wallet), position NFT owned by the Safe. No HYPE seed.
```
export DEPLOYER=0x2DBE... ORPH=0x... HYPE_USD_E8=$(curl -s https://api.morpho.org/graphql -H 'content-type: application/json' -d '{"query":"{ assetByAddress(address:\"0x5555555555555555555555555555555555555555\", chainId:999){ priceUsd } }"}' | python3 -c 'import json,sys; print(int(float(json.load(sys.stdin)["data"]["assetByAddress"]["priceUsd"])*1e8))')
forge script script/05_SeedPool.s.sol --rpc-url $HYPEREVM_RPC --broadcast --slow --sender $DEPLOYER --interactive -vvv
```
The script approves Permit2, approves PositionManager through Permit2 for exactly 600M ORPH with a one-hour expiry, then one `multicall` [initializePool, modifyLiquidities(MINT_POSITION, SETTLE_PAIR)]. Read-back (the script does these and prints `verify: ok`): `StateView.getSlot0(poolId)` sqrtPrice equals the plan and lpFee 10000, `PositionManager.ownerOf(tokenId) == Safe`, `getPositionLiquidity(tokenId)` equals the plan, ORPH `balanceOf(PoolManager)` within 1 ppm of 6e26. Then put `poolId` and `orph` into `keeper/config/senior.json` so the hourly price samples start. On the fork at $38 HYPE: 1 HYPE bought 7.40M ORPH against a 7.6M ideal (1% fee plus impact).
Then on junior: `setStakeToken(ORPH, stakePerAsset)` where stakePerAsset = ORPH wei per 1 USDC at the opening price times 20% (at $0.000005 per ORPH: 20% of 1 USDC = 40,000 ORPH, so `stakePerAsset = 40000e18`). Read back `stakeToken()`, `stakePerAsset()`.

## 6. Monday morning checklist (before anything opens)
1. Elysium mainnet: chain id, public RPC, explorer, from `https://elysium.kinetiq.xyz/docs/connecting-to-elysium`. Read `eth_chainId`.
2. Canonical USDC on Elysium: `cast call $L2_ROUTER "calculateL2TokenAddress(address)(address)" 0xb88339CB7199b77E23DB6E890353E22632Ba630f --rpc-url $ELYSIUM_RPC`. Confirm `symbol()`, `decimals() 6`, and that the L2 gateway router is the one listed on `https://elysium.kinetiq.xyz/docs/contract-addresses` (mainnet section). Reject anything else named USDC.
3. Uniswap v4 PoolManager on Elysium: from Uniswap's deployments page for chain 99901; confirm `cast code` non-empty. If absent or unconfirmed: o1.exchange tax mode at 1% is the launch path for ORPH.
4. Wormhole / Mayan live on Elysium: check their chain lists. If not live, front end shows the canonical path only.
5. Nest pools and APRs: Nest front end on Elysium; record USDC/HYPE pool addresses for the Ranger config.
6. Senior and junior read-backs from sections 1 to 3 repeated against mainnet state.
7. Keeper dry-run against live addresses prints a sane plan; then set `LIVE=1`.
8. ORPH deployed and hook (or o1) pool live; `setStakeToken(ORPH, rate)` on junior with the rate from the launch price; read back `stakeToken()`.
9. `setDepositsPaused(false)` on junior.
10. **Live test, you, from treasury, before anyone else (first step after the deploys):**
    a. Senior: `approve(SENIOR, 1000e6)` then `deposit(1000e6, you)` on the senior vault. Confirm: `senior.balanceOf(you) > 0`, `senior.totalAssets()` about 1,000e6, `USDC.balanceOf(SENIOR)` about 0 (it went to Felix), `IERC4626(FELIX).balanceOf(FELIX_ADAPTER) > 0`, `senior.convertToAssets(senior.balanceOf(you))` about 1,000e6 minus rounding.
    b. Junior: `ORPH.approve(JUNIOR, stake)` and `USDC.approve(JUNIOR, amount)` where stake = amount x stakePerAsset / 1e6 (amount in USDC units, under the $10k wallet cap), then `deposit(amount, you)`. Confirm: `junior.balanceOf(you) == amount x 1e12` (price is 1.0 at launch), `junior.stakeOf(you) == stake`, `junior.stakedShares(you) == amount x 1e12`, `junior.totalAssets() == amount + 1e6` (the seed), `junior.pricePerShare() == 1e18`, `junior.seniorSupplyBase() == senior.totalSupply()` (your deposit synced the baseline), `junior.coverInProgress() == 0`.
    c. Exit path, small: `requestExit(1e18)` (one share). Confirm `exitOf(you)` shows shares 1e18, `readyAt` a UTC midnight at least 7 days out, `pendingExitShares() == 1e18`, `junior.balanceOf(JUNIOR) == 1e18`. Leave it in; it is the first real settle's test next Sunday.
    d. Agent: one Rotator dry-run against live addresses, then `LIVE=1` and one tick: confirm an `AgentCall` event on junior (or "hold" in the report) and `junior.totalAssets()` unchanged within rounding.
    e. Router: send 10 USDC to the router, keeper `distribute()`. Confirm `USDC.balanceOf(SENIOR)` up by 5e6, junior idle up by 2.5e6, treasury up by 2.5e6; after an hour `senior.convertToAssets` up.
11. Publish: merge to `main` (Vercel deploys), confirm https://orphic.fi loads the new build (check the block number in the readout changes). Banners on: "Unaudited, capped, owner-pausable", "Basis agent not active". Junior per-wallet cap $10k is on for week one (`walletCap()`), off with `setWalletCap(0)` next Monday.

## 6b. Weekly: stake rate re-set (owner, Sundays after settle)
The gate is 20% of the deposit in ORPH. `stakePerAsset` is ORPH wei per 1 USDC and changes only through a 3-day timelock: `proposeStakePerAsset(x)` (owner) then `applyStakePerAsset()` (anyone) three days later. Existing stakes are never re-quoted.
1. The keeper samples the pool price hourly and prints on the weekly run: `stake rate proposal: proposeStakePerAsset(<value>) (7d TWAP $<orphUsd>, <n> samples)`. The value is `0.20 / orphUsdTwap * 1e18`. Sanity check: at $0.000005 per ORPH it is `40000e18`.
2. If the 7-day TWAP moved the implied gate outside 15 to 25% of deposit value, you send `cast send $JUNIOR "proposeStakePerAsset(uint256)" <value>` from the hardware wallet. If it is inside the band, skip the week.
3. Wednesday: anyone (the keeper does it) calls `applyStakePerAsset()`. Read back `stakePerAsset()`; the app shows the pending change and date from `pendingStakePerAsset()` and `stakeEta()`.
4. Emergency (price collapse or spike): `proposeStakePerAsset` still waits 3 days by design; use `setDepositsPaused(true)` if the gate becomes meaningless in the meantime.

## 6a. Hourly (keeper)
`junior.syncSenior()` every tick so new senior deposits are covered; report `coverInProgress()`. If the keeper is down, anyone can call it.

## 7. Weekly settle (Sundays, 00:00 UTC window)
Anyone can call `settle()`; the keeper's `--weekly` run does it after `accrueInterest()` on senior. Before it: Rotator ensures junior idle USDC covers `pendingExitShares * pricePerShare` for exits maturing that day. After it: read `pricePerShare()`, `reservedAssets()`, `pricedExitShares()`, `Settled` event, and the `Cover` event if any. Post the numbers on the agents page.

## 7a. Router sweeps
`sweep(token, router, swapData, amountIn)` is capped at `maxSweepUsdc` of oracle value per call (25,000 USDC at launch, owner-settable). Floor = oracle value minus `maxSlippageBps` (set 100 to 300). Oracle staleness check ships in week one together with the permissionless `cover()`; until then the keeper sweeps only when the Morpho oracle for the token has been updated within the hour (keeper check, not contract).

## 8. Kill switch
- Pause junior deposits: `cast send $JUNIOR "setDepositsPaused(bool)" true`. Exits, claims and settle keep working by construction.
- Stop the agent: `cast send $JUNIOR "setAgent(address)" 0x0000000000000000000000000000000000000000` and on senior (curator or sentinel) `setIsAllocator(AGENT,false)` is timelocked 3 days, so instead revoke pending submissions and `decreaseAbsoluteCap` to 0 on the market ids (curator or sentinel, instant). Deposits then stop at the Felix cap.
- Senior deposits: V2 has no pause; set `decreaseAbsoluteCap` on the Felix id to the current allocation (instant) and deposits revert.
- Rotator: set repo variable `LIVE` to empty; the next run is dry-run only.
- If the agent key leaks: the above, then rotate the GitHub secret. The key could only have moved funds between allowlisted venues and the contract.
