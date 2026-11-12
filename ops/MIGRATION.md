# Migration to the fixed contracts (audit fixes 7/8)

Moves the live system (senior `0x3F73…9759`, old junior `0x20D5…7F2E`, old router `0xC2d2…aA37`) to the fixed contracts: a new junior (v2), a new FeeRouter and the senior receive-shares gate, **without touching senior's funds**. Only the partner signs. Claude prepares, replays on a loopback fork and reads back. Nothing here is signed, sent or deployed yet; `FACTS.md` section 0a holds the placeholders for the new addresses.

The old junior is a **pre-fix build** (no `snapFelixExposure`, `observeSenior`, `carryOwed`; checked by selector search on its code on 12 Nov). Its first live settle is due **Sun 15 Nov 20:27:00 UTC** (`lastSettle` 1794173220 + 601,200 s = 1794774420). Nothing below changes it, and phase C refuses to run before that settle has happened.

## 0. Prerequisites (before phase A)

1. **Fund `0x2DBE` (JUNIOR_OWNER, hardware wallet).** It holds 0.0195 USDC today (12 Nov). Phase A needs **at least 1 USDC** (the v2 seed) and HYPE for about 11.2M gas of deployments (measured on the live-state fork: library 1.50M, JuniorVault 6.48M, FeeRouter 2.10M, gate 1.12M, the rest under 0.7M). It had 0.50 HYPE on 12 Nov; at the 0.1 gwei the earlier steps paid, that is ample, but a busier chain costs more (the 8 Nov base fee reached 56 gwei), so keep a margin.
2. **Big blocks on for `0x2DBE` during phase A only.** HyperEVM small blocks carry 2M gas, big blocks 30M (RUNBOOK 0.1). This is a HyperCore action, not an EVM transaction: the signer page's "sign big blocks on" button, or the SDK call in RUNBOOK 0.1. JuniorVault (6.5M), FeeRouter (2.1M) and the library step (limit 2.64M) cannot land in a small block. Switch back off after phase A. Phases B, C, D fit small blocks (largest step 0.45M used, 0.74M limit).
3. **`0x9EDf` (SENIOR_SAFE) is an EOA with no code today** (0.218 HYPE, nonce 1). It is the senior owner and curator, so it submits phase B, and it is the owner of the new gate. A Safe later is an owner change, not part of this plan. It needs a little HYPE for 4 small transactions.
4. The deployer must be the account the plans were generated for (see "Regenerating the plans").

## Phases

One signer per phase. Every phase has read-backs (the plan's `precheck` before the first transaction, `verify` after the last). Gas is measured on a fork of the live state (12 Nov, block 51,034,654), per step.

| Phase | Signer | Transactions (gas used) | Wait | Read-backs | Rollback |
|---|---|---|---|---|---|
| **A** `06a_DeployJuniorV2` | JUNIOR_OWNER `0x2DBE`, **big blocks on** | 1 VenueAdmin via CREATE2 (1.50M) · 2 JuniorVault v2 (6.48M, **big block**) · 3 USDC.approve 1 USDC (55k) · 4 multicall x11 on v2: seed, deposits paused, walletCap 10k, agent, addVault Felix, addVault senior, 5 rules (573k) · 5 setApprovalRule USDC to Felix (57k) · 6 FeeRouter v2 (2.10M, **big block**) · 7 router.setKeeper (30k) · 8 SeniorReceiveGate (1.12M) | none | library code hash equals the value computed from the build; v2 owner, senior, agent, seeded, paused, caps 5,000 / 10,000 USDC, no markets, vaults Felix + senior, no Morpho rule, no Morpho approval; router owner / senior / v2 / treasury / keeper; gate senior / v2 / owner `0x9EDf` / max 10 USDC; senior still unwired and the fee recipient still the old junior | Nothing is wired. Abandon the new addresses (1 USDC seed stays in v2). |
| **B** `06b_SubmitSenior` | SENIOR_SAFE `0x9EDf` | `senior.submit(setManagementFeeRecipient(v2))` (54k), `senior.submit(setReceiveSharesGate(gate))` (54k) | **On or after Fri 13 Nov 00:00 UTC**, so the earliest execution (+3 days) is after the 15 Nov settle | `executableAt(data) != 0` for both; recipient and gate unchanged | `senior.revoke(data)` for each (curator). Nothing has happened to senior. |
| **S** (not signed by us) | keeper / anyone | `senior.accrueInterest()`, `oldJunior.settle()` | **Sun 15 Nov 20:27:00 UTC** (the keeper may be minutes late; the watchdog fallback fires 4 h after) | old `lastSettle >= 1794774420` | n/a |
| **C** `06c_ExecuteSenior` | SENIOR_SAFE (anyone may send it) | `setManagementFeeRecipient(v2)` (453k, V2 accrues first), `setReceiveSharesGate(gate)` (50k) | **at least 3 days (259,200 s) after B, and only after S.** The script and the plan's precheck REFUSE until old `lastSettle >= OLD_SETTLE_DUE` | recipient is v2; gate is the new gate; a fresh account can receive shares (normal times); both pending changes consumed | **After C, undoing the fee recipient is ANOTHER 3-day timelock:** the curator submits `setManagementFeeRecipient(oldJunior)`, waits 3 days, executes. The gate is removed the same way (`submit(setReceiveSharesGate(0))`, 3 days). Before C: just do not execute (or `revoke`). |
| **D** `06d_CutOver` | JUNIOR_OWNER | old router `setRecipients(senior, v2, treasury)` (36k) · old junior `setDepositsPaused(true)` (30k) · old junior `setRule(Morpho supply, false)` and `(Morpho withdraw, false)` (30k each) · `v2.snapFelixExposure()` (445k) · `v2.setDepositsPaused(false)` (30k, **last**) | right after C | precheck: recipient is v2, gate wired, fresh account accepted, v2 still paused, every old market position is 0. After: router recipients, old paused, both rules off, v2 Felix snapshot present, v2 deposits open | old `setDepositsPaused(false)`, v2 `setDepositsPaused(true)`, old router `setRecipients(senior, oldJunior, treasury)`, old `setRule(...)` back on (RUNBOOK 8a offsets 224 / 256). Instant, owner only. |
| **E** holders (not scripted) | each holder | see "Holders" | see calendar | | |
| **F** keeper | ops | second keeper config (below) | with D | | |
| **G** $ORPH | JUNIOR_OWNER + a contract NFT_OWNER | `04`, `05`, then `v2.setStakeToken` | independent of A to D | RUNBOOK 5a | RUNBOOK 5a |

**Senior is not touched by any transaction above except the two timelocked fee/gate changes.** On the live-state fork, senior `totalAssets` was 316,263,742 before the cut-over and 316,263,745 after, `convertToAssets(1e18)` 1,000,739 both times.

## Calendar (UTC; today is Thu 12 Nov)

| When | What |
|---|---|
| Thu 12 Nov | Prerequisites 0.1 to 0.3. Phase A (big blocks on, then off). The only holder, `0x2DBE`, can request its exit now. |
| **Fri 13 Nov 00:00 or later** | Phase B (earliest execution is 3 days after the submit, so Mon 16 Nov 00:00 or later). |
| **Sat 14 Nov 23:59** | Last moment for an old-junior exit request to be priced at the next settle after the 15 Nov one (see below). |
| **Sun 15 Nov 20:27:00** | The old junior's first settle (unchanged by this plan). Read `lastSettle()` and the `Settled` / `Cover` events afterwards. |
| **Mon 16 Nov 00:00 or later** | Phase C, only after the settle above. Then phase D the same hour. |
| Thu 19 Nov (about 7 days after A) | v2's own first settle is due (`lastSettle` is its deployment time; the keeper must run it, see F). |
| **Sun 22 Nov about 19:27** | The old junior's second settle (15 Nov settle time + 6 d 23 h): prices the exits requested by Sat 14 Nov 23:59, then claim. |
| about Sun 29 Nov | Next old settle: prices exits requested from 15 Nov on. |

**Exit timing.** `requestExit` ends the notice at the first UTC midnight at least 7 days out; a claim pays at the first settle at or after it. A request on Thu 12 Nov has `readyAt` 20 Nov 00:00 and is priced at the ~22 Nov settle (the 15 Nov settle is earlier). Any request made by Sat 14 Nov 23:59 has `readyAt` at most 22 Nov 00:00 and is priced at the same settle. A request from Sun 15 Nov is priced at the ~29 Nov settle. A new request merges with an open one and restarts its notice.

## Holders: the only holder is `0x2DBE`

Today the old junior has 81 ojUSDC: **80 owned by `0x2DBE` (the partner's own capital)** and 1 dead seed. `0x2DBE` also has a 1e-12 ojUSDC dust exit open (readyAt 16 Nov). There is no outside holder to protect, so the **claim to redeposit window is minutes**, the same day, by the same wallet.

Procedure for `0x2DBE` (rehearsed on the live-state fork, numbers below):
1. `oldJunior.requestExit(balanceOf)` by Sat 14 Nov 23:59.
2. Before the due second of the settle that prices it, the agent (or owner) recalls every position through `oldJunior.execute`: `Felix.withdraw(assets, oldJunior, oldJunior)` for the whole Felix position, `senior.redeem(allShares, oldJunior, oldJunior)` for the fee shares the old junior holds (the rules exist). The claim pays from idle USDC only.
3. Anyone sends `senior.accrueInterest()` then `oldJunior.settle()` at the due second.
4. `oldJunior.claimExit()` from `0x2DBE`.
5. Same day: `USDC.approve(v2, amount)`, `v2.deposit(amount, 0x2DBE)` (wallet cap 10,000 and deposit cap 5,000 USDC).

**Rehearsal numbers (live-state fork, 12 Nov state, warped to the settles):** 79.999999999999 ojUSDC requested; at the 22 Nov settle `pricePerShare` 1.001842765; **claim paid 80.147421 USDC (= shares x price exactly)**; 1.001843 USDC stays in the old junior (the dead seed's share, plus nothing else); `0x2DBE` redeposited 84.166939 USDC (80.147 plus its own 5 USDC funding less the 1 USDC seed) into v2 for 81.70 shares (v2's NAV per share was 1.030 because it had accrued about 0.03 USDC of senior fee shares). The old junior ends with supply 1.0 (dead seed) and totalAssets 1.001843 USDC.

**Who covers senior while both juniors exist.** Cover is not tied to the fee recipient. Whichever junior settles after a loss pays senior's shortfall from its own idle USDC. They pay **sequentially, not twice**: after the first payment senior's price is repaired and the second junior sees no shortfall below its own baseline. The residual is the old junior's pre-fix bookkeeping: if it paid only part, it may bill its remainder again at its next settle after v2 already paid the rest. That over-payment is bounded by the old junior's idle USDC (about 5 to 81 USDC) and goes to senior holders. There is no uncovered window: the old junior stays the cover until its holder claims, and the claim and the v2 deposit are minutes apart by the same owner. The fee recipient flip is a clean cut: V2 accrues first, so every fee second up to phase C goes to the old junior (it keeps those shares), every second after goes to v2.

## What if the old settle (15 Nov) covers a loss

The settle pays senior's shortfall from the old junior's **idle** USDC (5 USDC today; the keeper's settle tick recalls Felix to idle first, so up to about 81 USDC) and records `Cover(owed, paid)`. Before phase C read: (1) the `Settled` and `Cover` events of that settle; (2) `senior.convertToAssets(1e18)` against its value before; (3) `senior.receiveSharesGate()` is still 0 (so nothing is refused yet) and whether `v2.coverInProgress()` is 0. Phase C itself still passes (it only needs the old settle). **Do not run phase D (v2 deposits open) while a loss is outstanding or unrecognised:** wait until `v2.coverInProgress() == 0` and `gate.canReceiveShares(<fresh address>)` is true; v2's baseline is re-taken by `v2.syncSenior()` (permissionless, the keeper calls it hourly) only once the price is back at or above its expectation, so call it after the cover and check `seniorPriceBase()` moved. If the old junior could not pay in full, the rest is a pre-fix shortfall for senior holders: that is a decision for you and us, not a step of this plan.

## The v2 universe

v2 lists **Felix and the senior vault only**: no Morpho markets, no Morpho rules, no USDC approval to Morpho (the shipped keeper only deploys to Felix; audit A9b/A9f). Adding a market later is an owner step: `addMarket`, `setRule` (supply 224, withdraw 256), `setApprovalRule(USDC, MORPHO)`, and it falls under the 5/8 recall rule (RUNBOOK 6a items 5 and 6, 8a: a stranded market position blocks the settle tick every week). Caps: deposit cap 5,000 USDC and wallet cap 10,000 USDC, as live today (not the 75k of script 02). The router's `setRouter -> setFloor -> seedPrice` setup is not part of phase A (no sweep token or oracle exists yet); it runs in 06a only when `SWEEP_TOKEN`, `SWEEP_ROUTER`, `SWEEP_ORACLE`, `SWEEP_SLIPPAGE_BPS`, `SWEEP_SEED_PRICE` are given, in that order.

## Phase F: the keeper (an ops step, not signed by us)

`keeper/config/senior.json` points at one junior and one router. Until the old junior is closed (its 22 Nov settle and claims done) it still needs its weekly settle and recall, so run **two configs**: keep the current one (old junior, old router) for the old junior, and add a second one (`junior` v2, `feeRouter` router v2, `expectedReceiveSharesGate` the gate; see RUNBOOK 3a item 5) for v2, passing `--config`. The GitHub workflow and the Circuit agent bundle read the single file today; **we do not touch `.github/`, secrets or the Circuit session**, so a second keeper instance is an operator change. v2's own first settle is due about 7 days after phase A. When the old junior is closed, retire the old config.

## Phase G: the $ORPH launch (04 / 05, independent)

Unchanged scripts (RUNBOOK 5a). Prerequisites that are not fixed by this migration: `05` refuses an EOA `NFT_OWNER`, and `SENIOR_SAFE` is an EOA, so a **contract** (a Safe or a timelock) must exist first; `HYPE_USD_REF_E8` from a source other than the Morpho API; `SEED_CAP_ORPH` set deliberately; seed in a **big block** if the gap holds about 45 or more initialised ranges (about 31k gas each above a 462k base); read back on chain after the broadcast (the script's `_verify` runs only in simulation). Then `setStakeToken(ORPH, rate)` on **v2**, not the old junior.

## Regenerating the plans at the real nonce

CREATE addresses depend on the signer's nonce (`0x2DBE` was at 27 on 12 Nov; `0x9EDf` at 1). The plans must be generated just before signing, on a fork of the current head:

```
anvil --fork-url https://hyperliquid.drpc.org --port 8945 --host 127.0.0.1 --gas-limit 30000000   # loopback only
export SENIOR=0x3F7382bd8BFC6C548CAa2D7B4dfCe628B12A9759 OLD_JUNIOR=0x20D5F4f78858D257eA047EB5F47773E361697F2E OLD_ROUTER=0xC2d2C5e56798Bfd0EEc67EEC12ddC2b521b1aA37
python3 ops/make_migration.py out/ http://127.0.0.1:8945 --holder      # live-state mode; fork-only cheats: funding, impersonation, warps
```
It writes `a-deploy.json`, `b-submit.json`, `s-old-settle.json`, `c-execute.json`, `d-cutover.json`, `manifest.json`, and refuses any RPC that is not `http://127.0.0.1:<port>` on an anvil. Each plan carries the signer's nonce at generation; `replay_plan.py` refuses a plan whose nonce differs. Phases B to D are generated on the fork after the previous phase, so their nonces assume nothing else is sent by that signer in between (in the rehearsal `0x2DBE` also sends the exit request, so D's nonce was 36: if the real sequence differs, regenerate D). The only real transactions in the plans are the signer's; the plan JSON has no impersonation, funding or time warps. `python3 ops/replay_plan.py out/manifest.json http://127.0.0.1:8945` replays them again.

**The signer page does not support the new plan fields.** It is in this repo (`web/public/ops/deploy.html`, with `plan1..5.json`). It reads `plan.deployer`, each step's `to`/`data`/`gas`/`value`/`readbacks`, `predictedAddress` and `plan.verify` with `expect` (exact) or non-zero. It does **not** read `precheck`, `gte`, `codehash`, `word`, `waitFromPlan`, `notBeforeCall`, `nonce` or `needsBigBlock`: a `gte` or `word` check without a matching `expect` would be treated as "non-zero" (weaker than meant), a `codehash` check has no `to` and would error, and no precheck or wait would run. Until the page learns them, **sign phases B, C, D by hand from the plan (the transaction list above is the full list) and run the plan's `precheck` and `verify` read-backs with `cast`**, or extend the page first (a web change outside this milestone).

## Timeline of checks the partner or Claude runs

After A: library code at `0x4Ec0…94dC` and its hash (FACTS 0a), v2 seeded and paused, gate owner `0x9EDf`. After B: `senior.executableAt(data)` for both. After S: `oldJunior.lastSettle()`. After C: `managementFeeRecipient()`, `receiveSharesGate()`. After D: v2 `depositsPaused() == false`, old paused. Then update `keeper/config`, `web/src/config/addresses.ts`, `FACTS.md` 0a.
