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

0.1 Put the deployer on big blocks. HyperEVM small blocks are 2M gas; the deploy needs up to 10M per transaction. This is a HyperCore exchange action, not an EVM transaction. With the official Python SDK (`pip install hyperliquid-python-sdk`):
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
(Live since 8 Nov. To move to the fixed junior, router and gate see `MIGRATION.md`; script `06a` deploys them beside the live senior.)


What it does: deploys JuniorVault (owner DEPLOYER, cap $75k, senior = step 1 vault), seeds it with 1 USDC of dead shares, pauses deposits, sets the agent, registers the four Morpho markets plus Felix and the senior vault as its valuation universe and venue list, sets the agent allowlist (Morpho supply/withdraw, Felix deposit/redeem/withdraw, senior redeem/withdraw, USDC approvals to Morpho and Felix only). Deploys FeeRouter with recipients senior / junior / treasury and keeper = AGENT.

```
export SENIOR=0x... TREASURY=0x...
forge script script/02_DeployJuniorRouter.s.sol --rpc-url $HYPEREVM_RPC --broadcast --slow --sender $DEPLOYER --interactive -vvv
```
**Library link (added 2/8).** JuniorVault delegatecalls the external library `VenueAdmin` (venue and rule admin; it holds 1,500+ B of what would not fit under EIP-170). `forge script` links it by itself: the broadcast has ONE EXTRA transaction before the junior CREATE, a CREATE2 through the deterministic deployer `0x4e59b44847b379578588920ca78fbf26c0b4956c` (salt 0, present on HyperEVM; checked with a read-only `eth_getCode`). The library address is therefore fixed by its bytecode: **`0x4Ec02Cfb29E387F6BbCBACF266C7213646DE94dC`** for the sources at orphic `fix/exits-deposits` head (any edit to `VenueAdmin.sol`, to a library it imports, or to the compiler settings changes it; recompute with `cast create2 --deployer 0x4e59b44847b379578588920ca78fbf26c0b4956c --salt 0x00..00 --init-code $(jq -r .bytecode.object out/VenueAdmin.sol/VenueAdmin.json)`). Expect 2 contract creations from the script (VenueAdmin, then JuniorVault) plus the FeeRouter; if the library already exists at that address the CREATE2 step is skipped by forge. Any other way of deploying JuniorVault (cast, a signer page, Circuit) must link the library first (`--libraries src/VenueAdmin.sol:VenueAdmin:0x4Ec0...`) and verification on an explorer needs the same `--libraries` flag; an unlinked creation code contains the placeholder and reverts. Check: `cast code 0x4Ec0...` is non-empty and the junior's runtime code contains the library address.

Read-back: `seeded() true`, `depositsPaused() true`, `agent()`, `marketsLength() 4`, `vaultsLength() 2`, `rules(MORPHO, 0xa99aad89)` allowed with offset 224 (supply), router `senior()`/`junior()`/`treasury()`.

## 3. Sunday: wire senior (step 3 of 3)

What it does: management fee 0.5% a year paid in senior shares to junior; `maxRate` 200% a year; Felix as liquidity adapter; then 3-day timelocks on addAdapter, caps, fees, fee recipients, allocators, gates, adapter registry. Optionally hands owner and curator to a Safe.

```
export JUNIOR=0x... FELIX_ADAPTER=0x...   # OWNER_FINAL=0xSafe optional
forge script script/03_WireSenior.s.sol --rpc-url $HYPEREVM_RPC --broadcast --slow --sender $DEPLOYER --interactive -vvv
```
Read-back: `managementFeeRecipient() == JUNIOR`, `managementFee() == 158548959`, `maxRate() == 63419583967`, `liquidityAdapter() == FELIX_ADAPTER`, `timelock(0x...addAdapter) == 259200`.

After step 3, caps and adapters cannot change for 3 days. That is the point.

## 3a. Senior receive-shares gate (curator; audit fixes 4/8, wired in 7/8)
**The migration plan (`MIGRATION.md`, scripts `06a` to `06d`) deploys the gate and wires it together with the new fee recipient; follow that, not the steps below, for the live system.** The steps below are the manual equivalent and the gate owner rules.

Not part of Sunday's launch script. Needs the senior curator key (hardware wallet) and a 3-day wait. Closes C7, C3b, C3 late buyer; see LIMITATIONS L15 and DECISIONS D43 for what it costs.

1. Deploy `SeniorReceiveGate(senior, junior, owner)` where `owner` is the senior curator. The constructor reverts `WrongPair` unless `junior.senior() == senior`.
2. Read back on the gate: `senior()`, `junior()`, `owner()`, `maxUnrecognised() == 10000000`, and `canReceiveShares(junior) == true`, `canReceiveShares(<a fresh address>) == true` in normal times.
3. Curator: `senior.submit(abi.encodeCall(setReceiveSharesGate, (gate)))` (the timelock on that selector is 3 days). Do NOT execute early.
4. After 3 days (and not while a cover or loss is in progress, so the first honest deposit is not refused): `senior.setReceiveSharesGate(gate)`. Read back `receiveSharesGate() == gate`, then run one small senior deposit and `accrueInterest()` and confirm junior's fee shares still mint.
5. Watchdog: set `expectedReceiveSharesGate` in `keeper/config/senior.json` to the gate address in the same change. Until then the watchdog expects no gate and alerts `SENIOR_GATE` the moment one appears; it also alerts if the gate is later swapped or removed.
6. Gate owner: `setAllowed(keeper, true)` ONLY if the keeper ever receives senior shares (it should not). Allowlist the Safe/treasury only if it must receive shares during a window. NEVER allowlist a pooled holder (a wrapper, a lending market, a router, a vault): it would let every depositor behind it buy during a loss or cover window and defeat the gate. Fee recipients and adapters are exempt automatically.
7. Abort: the curator can `submit(setReceiveSharesGate(0))` (3 days) to remove it; `revoke` cancels a pending set.
Expect: after any loss, depositors see `CannotReceiveShares` until junior settles and the cover is recognised (2 to 4 days). Redemptions are never affected.

## 4. Sunday: dry-run a settle on a fork
I run `forge test --match-contract DeployTest` against the live addresses (env `SENIOR`, `JUNIOR` override) and the junior test suite pointed at the deployed junior: deposit, agent supply, warp 7 days, `settle()`, exit, claim. Results into the log.

## 5. Sunday: keeper and front end
- Keeper: fill `keeper/config/senior.json` with SENIOR, MARKET_ADAPTER, FELIX_ADAPTER; repo variable `LIVE` unset (dry-run) until Monday; secrets `AGENT_PRIVATE_KEY`, `RPC_URL`.
- Front end: `web/src/config/addresses.ts` with the addresses, `DEPLOYED = true`, deploy to the orphic.fi host. Write buttons stay disabled by `OPENS_LABEL` until Monday.

## 5a. Monday: ORPH and the pool (step 4 and 5)
(Phase G of `MIGRATION.md`: independent of the junior migration; `setStakeToken` then goes on junior v2.)

Step 4, `04_DeployORPH.s.sol`: ORPH (1B, no owner), two OZ timelocks (treasury 15%, incentives 10%, 3-day delay, admin = TREASURY_ADMIN), TeamVesting (15%, 2 years, 6-month cliff, beneficiary TEAM), 60% to POOL_SEEDER (the Safe).
```
export DEPLOYER=0x... POOL_SEEDER=0xSafe TREASURY_ADMIN=0xSafe TEAM=0x...   # optional DELAY in seconds: the script refuses anything under 1 day (86400)
forge script script/04_DeployORPH.s.sol --rpc-url $HYPEREVM_RPC --broadcast --slow --sender $DEPLOYER --interactive -vvv
```
Read-back: `totalSupply() 1e27`, `balanceOf(POOL_SEEDER) 6e26`, `balanceOf(TREASURY) 1.5e26`, `balanceOf(VESTING) 1.5e26`, `balanceOf(INCENTIVES) 1e26`, `balanceOf(DEPLOYER) 0`, vesting `cliff()`, timelock `getMinDelay() 259200`.

Step 5, pool (`05_SeedPool.s.sol`, fork-tested against the live PoolManager): Uniswap v4 on HyperEVM, pool HYPE (native, currency0) / ORPH, 1% fee, tick spacing 200, no hook. Initialised at the price that makes 1B ORPH worth FDV_USD (default $5,000) using the live HYPE price. One single-sided position holding all 600M ORPH from the minimum tick up to just under the opening price; buyers walk into it. Minted from the hardware wallet (which holds the 600M from step 4, so POOL_SEEDER = the hardware wallet). No HYPE seed.

The position NFT can pull the buyers' HYPE out of the pool (measured in the audit: 100% of the liquidity in one call), so it must not sit in a single key. `NFT_OWNER` (default `SENIOR_SAFE`) must be a contract: the script refuses before broadcasting anything if it has no code. **`SENIOR_SAFE` in `Addresses.sol` is a MetaMask account (an EOA) today, so 05 refuses until it is a Safe or `NFT_OWNER` points at a Safe or timelock.**
```
export DEPLOYER=0x2DBE... ORPH=0x... NFT_OWNER=0xSafeOrTimelock
export HYPE_USD_E8=$(curl -s https://api.morpho.org/graphql -H 'content-type: application/json' -d '{"query":"{ assetByAddress(address:\"0x5555555555555555555555555555555555555555\", chainId:999){ priceUsd } }"}' | python3 -c 'import json,sys; print(int(float(json.load(sys.stdin)["data"]["assetByAddress"]["priceUsd"])*1e8))')
export HYPE_USD_REF_E8=...   # HYPE/USD x 1e8 from a DIFFERENT source than the Morpho API (an exchange or an oracle page), read by hand
export SEED_CAP_ORPH=...     # ORPH wei, set deliberately on launch day (see below); unset = 0
forge script script/05_SeedPool.s.sol --rpc-url $HYPEREVM_RPC --broadcast --slow --sender $DEPLOYER --interactive -vvv
```
The script refuses `HYPE_USD_E8` more than 20% away from `HYPE_USD_REF_E8` (a wrong input opens the pool at 1/f of the intended FDV) and prints both.

It sends three transactions from the deployer: (1) deploy `SeedLauncher` (`src/SeedLauncher.sol`, constructor args PoolManager, PositionManager, Permit2), (2) `ORPH.approve(launcher, 600M)`, (3) `launcher.seed(...)`. The seed is one `PoolManager.unlock`: if the pool key is not initialised it initialises it at the planned price; if someone initialised it elsewhere (anyone can, with no ORPH and no HYPE) it re-prices the pool with a price-limited swap to the planned price (an empty pool moves no tokens); then it mints the position to NFT_OWNER with the ORPH left. Nothing can land between the re-price and the mint, so a pre-initialised key cannot block the launch. Unspent ORPH and any HYPE the re-price earned go back to the deployer. Read-back (the script does these and prints `verify: ok`): `StateView.getSlot0(poolId)` sqrtPrice equals the plan and lpFee 10000, `PositionManager.ownerOf(tokenId) == NFT_OWNER`, `getPositionLiquidity(tokenId)` equals the plan (when nothing was spent) or is positive and at most the plan, ORPH `balanceOf(PoolManager)` within 1 ppm of 6e26. It logs `ORPH spent re-pricing` and `HYPE received`. Then put `poolId` and `orph` into `keeper/config/senior.json` so the hourly price samples start. On the fork at $38 HYPE: 1 HYPE bought 7.40M ORPH against a 7.6M ideal (1% fee plus impact). Gas of `launcher.seed` on the fork: 462,000 with no interference; it grows with the initialised ticks the re-price crosses (see the curve below).

**The seeder sets `SEED_CAP_ORPH` deliberately on launch day.** The cap is the only rule: the launcher reverts (`CapExceeded`, nothing minted, the ORPH stays with the deployer) if re-pricing needs to sell more than the cap. Read the cap as **the ORPH you accept selling, before any buyer, at about the launch price minus the 1% fee**; keep it small. Liquidity that straddles the opening tick buys at about the launch price (measured below); only a badly placed position pays more. With the default 0 any interference in the way forces a re-run: an attacker that initialises the key 2,000 ticks below the opening tick and parks **1 wei** of HYPE-only liquidity above its price makes the cap-0 run revert; a re-run with a cap seeds at the planned price (cost 27 wei of ORPH). Blocking costs the attacker only gas and locked capital: a blocked seed reverts, the attacker's position is untouched and withdrawable; its HYPE is spent only when the seed succeeds.

**Before launch, read the gap** (`getSlot0` of the key: any non-zero price means someone initialised it). Do not stop at the price: count the initialised ticks between that price and the plan, because the re-price crosses every one.
Measured on the fork (`test_O1_*`, $38 HYPE, cap 5% = 30M ORPH):
- Position straddling the opening tick (HYPE-only `[hi, hi+200)`, liquidity 3e24): the launcher sold 18.57M ORPH for 2.424 HYPE at an average FDV of **$4,961** against the launch $5,000, i.e. about the launch price minus the 1% fee (the fee accrues to the attacker's own position). Seeds at the plan, 534,860 gas.
- Position placed well below the opening tick (liquidity 1e24 in `[hi-1800, hi-1600)`, 3.96 HYPE): 25.52M ORPH sold at an average FDV of $5,893 (a badly placed position pays more), 572,000 gas.
- A cap of 10M ORPH against that second position reverts and mints nothing (pool left at the attacker's price, deployer's ORPH intact).
- Gas against dust positions (one tiny HYPE-only position per 200-tick range in the gap): 0 positions 462,438; 10 830,766; 25 1,291,113; 50 2,054,300; 100 3,581,024 (about 31k gas per initialised range). Small blocks carry 2M (step 0.1): the 50-range case (2,054,300) already exceeds it. Rule: if anything is initialised in the gap, check the measured curve (about 31k gas per range above the 462k base); at about 2M, i.e. more than about 45 initialised ranges, seed in a big block (`usingBigBlocks`). If the seed would exceed 30M gas, pre-cross the gap first with ordinary capped swaps (not atomic: the launcher has no multi-step re-price).
Set `SEED_CAP_ORPH` (wei, e.g. 30M ORPH = `30000000000000000000000000`) from what the gap needs, with a margin you accept selling at about the launch price.

**Read back on chain after the broadcast.** `_verify` runs only in forge's local simulation, not on chain. Check by hand with read-only calls: `StateView.getSlot0(poolId)` sqrtPrice equals the plan; `PositionManager.ownerOf(tokenId) == NFT_OWNER`; `getPositionLiquidity(tokenId)` is the plan (or positive and below it if ORPH was spent); the `Seeded(tokenId, nftOwner, orphSpent, hypeReceived)` event in the seed transaction's receipt (`cast receipt <tx>`) carries the spent ORPH and received HYPE; `ORPH.balanceOf(PoolManager)` within 1 ppm of 6e26.
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

## 6a. Keeper schedule (audit fixes 5/8): one checklist
Every tick (hourly; the GitHub keeper also fires at :37, which is harmless because every step is a no-op when there is nothing to do). The junior steps need the AGENT key; `distribute`, `observeSenior`, `syncSenior` and `settle` are permissionless, so the watchdog or anyone can run them if the keeper is down. Each step skips with a note on a junior build that predates the fixes.
1. `senior.accrueInterest()` once a day (junior's fee shares).
2. `feeRouter.distribute()` whenever the router holds unparked USDC (`balanceOf - totalParked`). `NothingToDo` is a skip. Flushing every tick keeps each push to senior small: with the senior gate wired (3a), a push above `maxUnrecognised` (10 USDC) closes senior deposits until the price is recognised, and it bounds a junior-deposit fee snipe (L14).
3. `junior.observeSenior()` when senior's supply is below `seniorSupplyMin` (L10), then `junior.syncSenior()` when senior's supply moved.
4. `junior.snapFelixExposure()` (agent), taken once senior is funded (the constructor's snapshot has fraction 0), then every tick, EXCEPT while a Felix loss is booked and unbilled: for any `felixExp(i)`, `(lostAssets(vault) - lostBase) * fraction / 1e24 * 1e6 > assetsRef` (junior's own 1 ppm guard). It resumes after the settle that bills the loss (L11 item 3).
5. Liquidity: if junior idle USDC < `reservedAssets + carryOwed()`, recall EVERY position through `junior.execute`: Felix, every Morpho market, and junior's own senior fee shares (`senior.redeem(shares, junior, junior)`, the rule set in step 2). Only idle USDC above the reserve is redeployed to Felix, where the reserve is the MAX of (`reservedAssets + carryOwed()` + exits maturing before the next settle), the 1% cover buffer and a 5 USDC floor, so the carry is never redeployed (L9, L12). If `carryOwed()` cannot be read (an RPC error, as opposed to a pre-fix junior that has no such function), nothing is redeployed that tick.
6. Settle tick, the first tick within 3,600 s of `lastSettle + SETTLE_INTERVAL` (6 d 23 h), and every tick after it until settled. In this order: touch Felix first (`execute(Felix.withdraw(0, junior, junior))`, which runs Felix's accrual so a pending bad debt is booked in `lostAssets`, L11 item 4), then recall EVERY Felix and market position to idle (markets by assets, capped by the market's live liquidity). `distribute` and `snapFelixExposure` are skipped until after `settle()`. If the due second is at most 15 minutes away (`SETTLE_MAX_WAIT` 900 s) the keeper waits for chain time to reach it and calls `settle()` at that second; otherwise the next tick settles (any tick after the due second settles first). Right before sending it re-reads `lastSettle`: a newer value, or a `TooSoon` refusal with `lastSettle` moved, means someone else settled, which counts as success.
   A settle tick never redeploys. Whatever fails (the touch, a recall, the wait, the settle) the tick stays a settle tick: the idle redeploy is skipped, the settle is not sent if the touch or a recall failed, and the run goes RED (`error`, exit 1, and the failure is listed in the report's `alerts`, exit 2). The next tick retries from the touch.
   Why the wait is bounded: the Action job has `timeout-minutes: 30` (the Tick step has none of its own) and also installs and runs the tests, so a 15-minute wait leaves margin; at :07 and :37 a tick can fall up to an hour before the due second and settles on the next one. The safety property is the recall BEFORE the due second: anyone who calls `settle()` at the due second finds idle funded. Raising `SETTLE_MAX_WAIT` would need a longer job timeout, which is an operator change to `.github/workflows/rotator.yml` for 7/8 (this fix does not touch `.github`).
   The watchdog's permissionless `settle()` fallback fires 4 h after the due second (it counts lateness from `lastSettle + 7 d`, 1 h later than the due second, and allows 3 h), and only sends in `ROTATOR_MODE=watchdog` with `LIVE=1` and the key present; otherwise it only alerts. It does not recall first.
7. Watchdog (every run): alerts on any junior Morpho-market position (the keeper only uses Felix), on an `agent()` that is not `EXPECTED_AGENT`, and on a senior `receiveSharesGate` that differs from `expectedReceiveSharesGate` in the config (zero address while none is wired).
If the keeper is down, anyone can call `syncSenior()`, `observeSenior()`, `distribute()` and `settle()`; `snapFelixExposure()` and the recalls need the agent or owner.

## 7. Weekly settle (every 6 d 23 h from the last settle)
Anyone can call `settle()`; the keeper runs the settle tick of 6a item 6 (touch Felix, recall every position, settle at the due second), not a Sunday-midnight-only window. Before it the recall makes junior idle USDC cover `pendingExitShares * pricePerShare` for exits maturing that day and the cover bill. After it: read `pricePerShare()`, `reservedAssets()`, `pricedExitShares()`, `Settled` event, and the `Cover` event if any. Post the numbers on the agents page.

## 7a. Router sweeps
`sweep(token, router, swapData, amountIn)` is capped at `maxSweepUsdc` of USDC out per call (25,000 USDC at launch, owner-settable): the oracle value of `amountIn` and the measured USDC received. The cap bounds USDC out, not the value of the tokens sold. Positive slippage at the cap is refused (`SweepTooLarge`), so size sweeps below it. Floor = oracle value minus `maxSlippageBps` (set 100 to 300).

**Before the first sweep of a token (owner, hardware wallet), in this order:** `setRouter(router, true)`, `setFloor(token, oracle, bps)`, then `seedPrice(token, price)` with the oracle price (1e36 scale) you checked against the market. Seeding before `setFloor` fails closed: a new oracle clears the seed and `sweep` reverts `PriceNotSeeded`. The oracle must not be movable by the keeper or by the swap venue (no spot price of the swap pool); ORPH's only market is the seeded v4 pool, which has no on-chain TWAP, so ORPH needs an oracle that does not read it. `setFloor` assumes an immutable oracle: after a proxy upgrade or feed change behind the same address, re-seed.

**The band.** `sweep` reverts `PriceOutsideBand` when the oracle is more than `maxPriceMoveBps` (1,000 = 10%) from the last accepted price, or more than `maxCumulativeMoveBps` (3,000 = 30%) from the last seed (the error's second value says which anchor). The drift compounds up to the cumulative bound. A sweep moves the reference only when its oracle value is at least `maxSweepUsdc / 100` (250 USDC at launch): a dust sweep passes but changes nothing. After a real market move beyond the bound, the owner checks the market and calls `seedPrice` again; read `lastPrice(token)`, `seedRef(token)`, `maxPriceMoveBps()` and `maxCumulativeMoveBps()` first. A band refusal is the signal that the oracle is stale or the market moved, not a keeper bug. `setMaxPriceMoveBps` and `setMaxCumulativeMoveBps` (step <= cumulative <= 5,000) widen it. The keeper still sweeps only when the Morpho oracle for the token has been updated within the hour (keeper check).

**Flushing.** `distribute()` is permissionless and the keeper calls it every tick (fixes 5/8): it is what bounds a junior-deposit fee snipe (LIMITATIONS L14). Anyone may call it; it only splits USDC already in the router, net of parked amounts, to the owner-set recipients.

## 8. Kill switch
- Pause junior deposits: `cast send $JUNIOR "setDepositsPaused(bool)" true`. Exits, claims and settle keep working by construction.
- Stop the agent, junior side: `cast send $JUNIOR "setAgent(address)" 0x0000000000000000000000000000000000000000` (hardware wallet, instant).
- Stop the agent, senior side: from the Safe, `submit(abi.encodeCall(setIsAllocator,(AGENT,false)))` then `setIsAllocator(AGENT,false)` in the same batch. This is deliberately NOT timelocked (step 3 leaves it at 0) because an allocator can, instantly: move funds between registered adapters within caps, set `maxRate` anywhere from 0 to 200%, and repoint the liquidity adapter. It cannot move funds out. After revoking, read back `maxRate()` (expect 63419583967) and `liquidityAdapter()` (expect the Felix adapter) and reset them from a fresh allocator if they were changed. The keeper checks both every tick and alerts on any change.
- Senior deposits: V2 has no pause; set `decreaseAbsoluteCap` on the Felix id to the current allocation (instant) and deposits revert.
- Rotator: set repo variable `LIVE` to empty; the next run is dry-run only.
- If the agent key leaks: the above, then rotate the GitHub secret. The key could only have moved funds between allowlisted venues and the contract.

## 8a. Owner hardening (junior owner, hardware wallet, and senior curator)
(Item 1 for the old junior is phase D of `MIGRATION.md`, behind a checklist that every market position is 0; v2 is deployed without those rules.)
1. **Remove the two Morpho rules the shipped keeper never uses** (audit A9b/A9f). The keeper only deploys junior's USDC to Felix; Morpho supply and withdraw on junior's markets are unused attack surface for a leaked agent key. From the junior owner:
   `cast send $JUNIOR "setRule(address,bytes4,bool,uint256)" $MORPHO 0xa99aad89 false 224` (supply)
   `cast send $JUNIOR "setRule(address,bytes4,bool,uint256)" $MORPHO 0x5c2bea49 false 256` (withdraw)
   Read back `rules($MORPHO, 0xa99aad89)` and `rules($MORPHO, 0x5c2bea49)` both not allowed. Do it only when `marketAssets(i)` is 0 for every market. **WARNING: a stranded market position blocks the settle tick EVERY WEEK.** The recall (6a items 5 and 6) withdraws a market position through the withdraw rule; with that rule removed, or when the market has no liquidity to pay it, the recall for that market fails, the settle is not sent by the keeper and the run goes red until the owner re-enables the withdraw rule (or the market regains liquidity), and the permissionless fallback settles without a recall. A market that is merely illiquid is reported and skipped, not an error; a revert (for example the rule is off) is an error. The watchdog alerts `JUNIOR_MORPHO_POSITION` on any such position.
2. **Safe migration before raising caps.** The senior owner and curator are the deployer account until handed over (review M-5: a curator can route senior funds to a venue that loses, and junior pays). Before ANY `increaseAbsoluteCap` / `increaseRelativeCap` beyond the launch caps: (a) the Safe `0x9EDf...5F29` has code on HyperEVM and its owners are confirmed; (b) from the current owner, `senior.setCurator(Safe)` then `senior.setOwner(Safe)` (or step 3 with `OWNER_FINAL`); (c) read back `curator()` and `owner()`; (d) the junior owner stays the separate hardware wallet, so the curator and the junior owner are never the same key; (e) keep the 3-day timelocks on adapters and caps. Raise caps only from the Safe, through `submit` and the timelock.

## Signer page (how Cashout deploys without Foundry)

https://orphic.fi/ops/deploy.html loads `/ops/planN.json`, one plan per step. Claude generates each plan by dry-running the step's forge script on a fresh HyperEVM fork with the real addresses (`ops/make_plan.py`), batches consecutive VaultV2 calls into `multicall` chunks under 1.5M gas, replays the exact calldata on the fork (`ops/replay_plan.py`), and only then commits it. The page signs each transaction with MetaMask in order, waits for the receipt, checks that created contracts have code at the predicted address, and runs the plan's read-backs at the end. Plans for steps 2 and 3 are generated only after the previous step is live, because junior and router addresses depend on the deployer nonce.

Big blocks: `createVaultV2` (about 4.5M gas) and `createMorphoMarketV1AdapterV2` (about 2.5M) exceed the 2M small-block limit. The page's "sign big blocks on" button signs the `evmUserModify` L1 action with the wallet (EIP-712, phantom agent, verified against the exchange API: the API recovers the signer address from the page's payload). The signer must exist on Hyperliquid L1 (`userRole` not `missing`): receive HYPE on the Hyperliquid app first, then Transfer to EVM. Turn big blocks off after step 1.

Step 1 plan (plan1.json, 7 signatures): createVaultV2 -> senior 0x3F7382bd8BFC6C548CAa2D7B4dfCe628B12A9759; multicall(setCurator,setName,setSymbol); market adapter -> 0x7b00b45e77afe7e07a2C9910FF9c5CE538386fb1; Felix adapter -> 0x0cdfdbC51744Ba1ed88bB8752098105fb43f37AC; three multicalls (allocators, adapters, caps). Addresses are CREATE2 and do not depend on nonce. Replayed on fork 8 Nov: all 7 succeed, 6 read-backs match.

## Rotator on Circuit (added 9 Nov 2026)

The keeper's decision code is bundled into `agents/orphic-rotator` and runs as a Circuit agent; Circuit's wallet signs.
The GitHub Action keeps running hourly as the watchdog (`ROTATOR_MODE=watchdog`): invariants, heartbeat, permissionless
fallbacks (accrueInterest, settle), alerts by red run plus Telegram when the two secrets exist.

Handover, in order:
1. Shadow week. On the Mac: `curl -fsSL https://api.circuit.org/dev | bash`, `circuit auth login` (passkey), create a
   Circuit wallet at app.circuit.org, fund it with 0.02 HYPE on Elysium and 0.3 HYPE on HyperEVM. In the repo:
   `cd agents/orphic-rotator && circuit run --target hosted --wallet <circuit wallet> --amount 0.01`. dryRun defaults to
   true, so the hosted session logs every decision and sends nothing. Compare its logs with the keeper's reports for 7 days.
2. Roles. Curator (0x9EDf) on senior: `submit(abi.encodeCall(setIsAllocator,(circuitWallet,true)))` then the call itself
   (timelock 0), and the same pair with `(githubAgent,false)`. Owner (0x2DBE) on junior: `setAgent(circuitWallet)`.
   Read back `isAllocator(circuitWallet)`, `isAllocator(githubAgent)`, `junior.agent()`.
3. Switch. Stop the shadow session and start it with `--setting dryRun=false`. Set repository variables
   `ROTATOR_MODE=watchdog` and `EXPECTED_AGENT=<circuit wallet>`. The next hourly Action runs the watchdog only.
4. Alerts. BotFather bot, add it to a private chat, store `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` as secrets.

Rollback: `ROTATOR_MODE=keeper`, give the roles back to the GitHub agent (same two transactions reversed), stop the
Circuit session. The permissionless calls work from either runner at any time.

Rebuild after any keeper change: `cd keeper && npm run build:agent && cd ../agents/orphic-rotator && circuit check`,
then `circuit upload` (a new code version reaches the running session on its next run).

## Sniper on Circuit (added 10 Nov 2026)
1. Shadow run: start `orphic-sniper` on Circuit's own page (app.circuit.org/agents/68d25adc-ca1d-4e34-8d82-a17510e50360) on "Your EVM Wallet" with 0.25 HYPE on Elysium. A partner-started session cannot send its buys (see FACTS), so until Circuit lifts that, every Sniper session starts on Circuit, and orphic.fi's Sniper page points there.
2. Watch: orphic.fi/agents/orphic-sniper shows the gate feed and the shadow wallet's trades read from the chain; Circuit's session log shows each minute's decision and every skip with its reason.
3. Stop: Circuit's Stop leaves tokens in the wallet; sell them by asking Circuit ("sell all <token> on Elysium").
4. Changing a rule: edit `agents/orphic-sniper/index.ts`, run the harness in the scratchpad against live data, `circuit check`, `circuit upload`, then restart the session. Settings (cap, take profit, stop) change per session without an upload.
5. Ask foobar: allow raw transactions to allowlisted contracts (LaunchRouter) for partner-started sessions, or route Montra pools; builder fee 0.05% to 0xba08A51bb1BB49E9840Eb55511E8880F95306A40; per-agent daily bars on the partner API; the iframe framing.
