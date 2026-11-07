# Orphic JuniorVault and FeeRouter: independent review

Scope: `src/JuniorVault.sol` (396 lines) and `src/FeeRouter.sol` (194 lines), read against `test/Base.t.sol`,
`test/JuniorVault.t.sol` and `test/Invariant.t.sol` for intended behaviour, and against `lib/vault-v2` (tag 2026-10-12)
for how the senior actually accrues, dilutes and recognises transfers. No file under `src/` or `test/` was changed;
proof-of-concept tests live in `test/review/Review.t.sol`.

Verdict in one paragraph: the agent allowlist and the exit bookkeeping are sound and I could not break them. The
cover logic is not. As written, `_coverSenior` sizes the payment by senior supply at settle time and measures the
senior through a rate-capped price, which produces one permissionless drain (C-1) and one self-inflicted double
payment (H-1). Both are fixable in a few lines and both should be fixed before Monday. Below those, there is a stake
accounting bug that strands ORPH after any loss, a predictable pre-settle deposit leak, and a liveness gap where exits
depend on the agent keeping reserved USDC idle. The owner's powers are wider than the stated model: an approval rule
on USDC is a raw drain path, and the owner's role as senior curator lets senior "losses" be manufactured that junior
then pays for.

Severity scale: Critical = external party drains funds under realistic preconditions. High = funds lost or stuck
without an attacker, or an owner path that contradicts the stated trust model. Medium = bounded value leak or
liveness failure. Low = needs owner error or an unlikely state. Informational = hygiene.

---

## Critical

### C-1. Cover is billed on senior supply at settle time: anyone can buy senior after a loss and have junior top them up

`JuniorVault.sol:269-273`

```solidity
uint256 supply = senior.totalSupply();
uint256 shortfall = (expected - price) * supply / PRICE_UNIT;
...
paid = shortfall < idle ? shortfall : idle;
```

`shortfall` is "per-share deficit times every share that exists right now". Shares minted after the loss happened
were bought at the depressed price and did not suffer the loss, but junior pays to lift them to `expected` all the
same. Senior deposits are permissionless and priced at `previewDeposit`, which reflects the loss immediately
(`accrueInterestView` takes `min(realAssets, maxTotalAssets)`, so losses are instant).

Attack sequence (reproduced on the fork in `test_H1_coverSnipedByLateSeniorDepositor`):

1. Senior has 100k, junior 20k idle. Felix (senior's liquidity adapter) takes a 2% hit: real loss 2,000 USDC.
2. Attacker sees it and deposits 1,000,000 USDC into senior at the depressed price any time before the weekly settle.
3. `settle()` runs. `shortfall = 2% * 1.1M = 22k > idle`, so junior transfers its entire 20,001 USDC idle to senior.
   Real damage was 2,000.
4. Senior recognises the transfer under `maxRate` (200% APR max: about 1.8 days for 1%). Attacker redeems:
   1,000,000 in, 1,018,719 out. Junior holders lost 90% of their capital to cover a 2% event.

Bound on the attack: the attacker's deposit must clear the senior's adapter caps (10M absolute in `Base`), and the
senior loss must be real (I could not manufacture one from rounding; see "What I verified"). With a 5% loss and a
10M cap the whole 500k launch cap is extractable. Capital must sit for the recognition window, so no flash loans, but
a fund with a few million can do this every time the senior takes any hit, which is exactly the event this product
exists for.

Fix (minimum): snapshot senior supply at each settle and bill only the shares that were exposed to the loss:

```solidity
uint256 seniorSupplyBase; // set to senior.totalSupply() at the end of every _coverSenior
...
uint256 supply = senior.totalSupply();
uint256 exposed = supply < seniorSupplyBase ? supply : seniorSupplyBase;
uint256 shortfall = (expected - price) * exposed / PRICE_UNIT;
...
seniorPriceBase = price + paid * PRICE_UNIT / supply;
seniorSupplyBase = supply;
```

This caps junior's bill at what the pre-existing shares actually lost. Late depositors still share the top-up pro
rata (that is Vault V2 donation mechanics and cannot be avoided with a plain transfer), so pre-existing senior
holders are not made fully whole when there are late depositors, but junior can no longer be drained beyond the
real loss. Pair it with the real-assets measurement in H-1, and consider using the senior's `receiveSharesGate` to
close senior deposits while a loss is outstanding.

---

## High

### H-1. The same loss is covered again at the next settle whenever maxRate cannot recognise the transfer within a week

`JuniorVault.sol:262-264, 275`

`price` comes from `senior.convertToAssets`, which is `previewRedeem`, which uses `min(realAssets, maxTotalAssets)`.
A transfer from junior raises `realAssets` instantly but `_totalAssets` only by `maxRate * elapsed` per week (3.8% at
the 200% APR maximum; 0% at the factory default of `maxRate = 0`). Line 275 sets
`seniorPriceBase = price + paid * PRICE_UNIT / supply`, i.e. it assumes full recognition by the next settle. If the
loss exceeds what maxRate lets through, the next settle sees `price < expected` again and pays again.

Reproduced in `test_H2_coverPaidTwiceUnderMaxRateLag`: 10% loss on 100k senior, junior pays 9,645 at settle 1 and
6,179 more at settle 2 with no new loss. Total paid is 58% above the real loss and the overpayment accrues to senior
holders. With `maxRate = 0` (the state a fresh V2 vault is in until the allocator sets it; `Base` sets it, the deploy
script must too) every settle re-pays the full loss until junior's idle is gone.

Fix: measure the senior by real assets, not by the rate-capped price. Both adapter interfaces are already imported:

```solidity
function _seniorRealPrice() internal view returns (uint256) {
    uint256 real = asset.balanceOf(address(senior));
    uint256 n = senior.adaptersLength();
    for (uint256 i = 0; i < n; i++) real += IAdapter(senior.adapters(i)).realAssets();
    (, , uint256 mgmtShares) = senior.accrueInterestView(); // after accrueInterest() this is 0
    return PRICE_UNIT * (real + 1) / (senior.totalSupply() + mgmtShares + senior.virtualShares());
}
```

Use it for `price` on line 262 and for the baseline on lines 266 and 275. The baseline then already contains what
was paid, and the maxRate lag only affects when senior depositors see it, not whether junior pays twice. Keep the
`managementFee` adjustment.

### H-2. An approval rule on USDC is a raw drain path, which contradicts the "never raw token moves" guarantee

`JuniorVault.sol:348-352`, used at `318-320`

`setRule` refuses `target == asset`, but `setApprovalRule(address(asset), anySpender, true)` is accepted. After that
the agent calls `execute(USDC, approve(anySpender, max))` and `anySpender` pulls everything idle. Same for senior and
Felix share tokens (approvals map is per token, no restriction). This is owner plus agent, or owner alone after
`setAgent(owner)`; there is no timelock on either. It is not a bug in the sense of an outside attacker, but the
contract header and the test comment at `JuniorVault.t.sol:180` both state a guarantee the code does not provide.

Fix: only allow spenders that are venues the contract already trusts:

```solidity
function setApprovalRule(address token, address spender, bool allowed) external onlyOwner {
    if (token == address(stakeToken) && address(stakeToken) != address(0)) revert NotAllowed();
    if (allowed && spender != address(morpho) && !isVault[spender]) revert NotAllowed();
    ...
}
```

and add the same whitelist test to `setRule` targets (`target == address(morpho) || isVault[target]`). That turns the
allowlist from "whatever the owner typed" into "the valuation universe", which is what the header promises.

---

## Medium

### M-1. Stake is released by assets out versus principal in, so any loss strands ORPH forever

`JuniorVault.sol:208-215`

```solidity
uint256 release = assets >= principal ? stake : stake * assets / principal;
...
principalOf[msg.sender] = assets >= principal ? 0 : principal - assets;
```

`assets` is the exit value at the priced settle; `principal` is the deposit amount. Junior is a first-loss tranche, so
`assets < principal` is the normal outcome after a cover. A full exit after a 50% loss returns 50% of the stake and
leaves `stakeOf` and `principalOf` non-zero with zero shares. Nothing can release the rest: a new deposit adds to
`principal` by at least as much as it can ever return. The mirror case is also wrong: after a 100% gain, exiting half
the shares releases the whole stake while half the position stays in.

Reproduced in `test_M1_stakeStrandedAfterLoss`: 2,000 ORPH staked, full exit after a cover, 949 ORPH stuck.

Fix: track shares, not assets. Add `mapping(address => uint256) stakedShares` incremented in `deposit` by `shares`
and in `claimExit` do:

```solidity
uint256 held = stakedShares[msg.sender];
uint256 burned = r.shares > held ? held : r.shares;
uint256 release = held == 0 ? 0 : stake * burned / held;
if (held == burned) release = stake; // full exit, no dust left behind
stakedShares[msg.sender] = held - burned;
```

Drop `principalOf`. Transfers of shares to another address then neither release nor strand stake, which matches
"held here and released on full exit".

### M-2. Deposits mint at the frozen price, so a deposit in the settle block takes the epoch's accrued yield

`JuniorVault.sol:161, 295-297`

Between settles NAV grows (Morpho interest, Felix yield, FeeRouter's 25% share) but `pricePerShare` does not. A deposit
one block before `settle()` mints at last week's price and is immediately repriced upward. Reproduced in
`test_M2_preSettleDepositTakesEpochYield`: 10k in for a week earns 1,000; 90k deposited in the settle block walks
away with 900 of it. The rational strategy for every depositor is therefore to deposit right before settle, and
honest early depositors lose a share of their yield every week. The 7-day exit notice limits the sniper's agility but
not the transfer.

Fix: mint at the worse of the frozen price and the live price:

```solidity
function _toShares(uint256 assets) internal view returns (uint256) {
    uint256 supply = totalSupply() - pricedExitShares;
    uint256 live = supply == 0 ? WAD : totalAssets() * assetScale * WAD / supply;
    uint256 p = live > pricePerShare ? live : pricePerShare;
    return assets * assetScale * WAD / p;
}
```

`totalAssets()` is already computed in `deposit` for the cap check, so this costs nothing extra. It also removes the
mid-week donation uplift for new depositors. Note it does not protect a depositor who enters after a loss is visible
but before settle; that is adverse selection against themselves, not a leak.

### M-3. Exits are priced on full NAV but paid from idle only, and nothing keeps idle at or above reservedAssets

`JuniorVault.sol:202, 251-252`, agent path `314-333`

Two related gaps:

1. The priced amount (`matured * price`) is a share of NAV that includes Morpho positions, Felix shares and senior
   fee shares. Only idle USDC can pay it. In `test_M1` a plain full exit reverted `InsufficientLiquidity` until the
   agent redeemed the senior fee shares, with zero Morpho exposure.
2. `execute` lets the agent deploy USDC that is already reserved. `test_M3_agentCanStrandReservedAssets`: 5,000
   reserved, agent supplies everything to Morpho, `claimExit` reverts and `requestExit` reverts `AlreadySet`, so the
   user is frozen until the agent acts.

The header says "Exits, claims and settle always work"; claims work only when the agent keeps enough idle. With a
compromised or absent agent key, exits stop. Fix: enforce the floor inside `execute`:

```solidity
uint256 idleBefore = asset.balanceOf(address(this));
bytes memory ret = Address.functionCall(target, data);
uint256 idleAfter = asset.balanceOf(address(this));
if (idleAfter < idleBefore && idleAfter < reservedAssets) revert InsufficientLiquidity();
return ret;
```

and give `claimExit` a permissionless fallback: if idle is short, let the claimant (or anyone) pull from the
allowlisted venues in order (`morpho.withdraw` with `receiver = this`, `IERC4626.redeem` on vaults) before paying.
At minimum, document that exits require agent liquidity management.

### M-4. No way to remove a market or a vault; one bad entry bricks totalAssets, deposit and settle permanently

`JuniorVault.sol:354-371`, loop at `282-293`

`addMarket` checks only `loanToken`, `addVault` only `asset()`. Both are append-only. Any entry whose view call
reverts (IRM change, oracle-dependent adapter, selfdestructed or paused vault, or the owner's own address: 
`test_L2_addVaultSelfBricksValuation` shows `addVault(address(junior))` passes the check and bricks the vault as
soon as it holds its own shares) makes `totalAssets()` revert, which takes `deposit` and `settle` with it, and
therefore every future exit pricing. The only recovery is redeploying and asking holders to migrate without a working
exit. Also, an owner-added 4626 that over-reports `convertToAssets` inflates NAV, prices exits above real assets, and
lets the first claimers take real USDC from later holders.

Fix: `removeMarket(id)` and `removeVault(v)` that require the position to be zero (`expectedSupplyAssets == 0`,
`balanceOf == 0`), plus `try/catch` around each view in `totalAssets` that treats a reverting venue as zero and emits
an event. Reject `vault == address(this)` and `vault == address(senior)` unless explicitly intended (senior is
intended; keep it, but note that NAV then circularly contains the vault junior is covering).

### M-5. Owner-as-curator can manufacture a senior loss that junior pays for

Not a line in these contracts, but the trust model needs it stated. The same `owner` is curator and allocator of the
senior in `Base.t.sol:69-84`. A curator can add an adapter (after timelock, which is 0 on a fresh vault until set) or
set caps that route senior funds to a venue that reports a loss. `_coverSenior` then moves junior's idle into the
senior, where the owner can hold shares. Nothing in `JuniorVault` can detect this. Mitigation is procedural (senior
timelocks set to days before launch, curator on a multisig distinct from the junior owner) and should be in the
banner next to "unaudited". A code-side cap, for example `maxCoverPerSettleBps` of idle, would also bound C-1 and
H-1 until the measurement fixes land.

---

## Low

### L-1. FeeRouter nets parked amounts only for the current recipients

`FeeRouter.sol:126-128`, `176-181`

`_split` subtracts `owed[senior] + owed[junior] + owed[treasury]` using the current addresses. After
`setRecipients` changes any of them, USDC parked for the old address is treated as free balance and split again;
the old recipient's `pullOwed` then reverts for lack of balance (`test_L1_feeRouterOwedDoubleCountAfterRecipientChange`).
Fix: keep `uint256 totalParkedUsdc` updated in `_send` and `pullOwed` and subtract that.

### L-2. settle() divides by zero when senior supply is zero and its price sits below the baseline

`JuniorVault.sol:275`

`paid * PRICE_UNIT / supply` with `supply == 0` is a panic even when `paid == 0`. Reaching it needs every senior share
redeemed (including junior's fee shares via the allowlisted `redeem`) while `seniorPriceBase > 1e12`. On the fork the
last full senior redeem reverted inside Vault V2 on two of three runs and succeeded once with residual assets that
kept the price above base, so I could not land the panic (`test_L3_seniorCannotBeEmptiedOnThisFork`). The fix is one
line and removes the question: `if (supply == 0) { seniorPriceBase = price; return 0; }` before line 270.

### L-3. Notice is 8 to 14 days in practice, not 7

`JuniorVault.sol:39, 187`

`readyAt` is rounded up to midnight, so for a request at time t, `readyAt` is in `(t + 7d, t + 8d]`. A settle every
`7d - 1h` (or every 7d) after the previous settle S therefore never lands at or after `readyAt` for a request made
after S; the exit is priced at the second settle, 8 to 14 days out. Anyone can also walk settle time one hour earlier
each week by calling it the moment it is allowed. Not a loss, but the UI and docs say 7 days and the existing tests
all warp 8 days. Either drop the midnight rounding and key `maturingShares` by settle index, or document "priced at
the first weekly close after a 7-day notice, up to 14 days".

### L-4. FeeRouter keeper can extract up to maxSlippageBps of every sweep, more if the oracle is stale

`FeeRouter.sol:92-100`, `164-168`

The floor is the only thing standing between the keeper and the tokens. With any allowlisted router that supports
arbitrary recipients or arbitrary calls (every aggregator does), the keeper sends `token` to themselves and supplies
USDC equal to `floor` from their own pocket; the extraction is `maxSlippageBps` (owner-capped at 10%) plus the gap
between the oracle and market. `IOracle.price()` has no staleness field and none is checked. Keep `maxSlippageBps`
at 100 to 300 for liquid tokens, use oracles with heartbeat guarantees, and consider requiring `got >= floor` on the
oracle price fetched before and after the call (cheap check against same-block oracle writes). Partial fills are
handled correctly: the floor is computed on the full balance so a partial fill reverts.

### L-5. Stake token footguns

`JuniorVault.sol:342-352, 374-380`

`setStakeToken` is one-way and only rejects `asset`. Rules and approval rules set for that token before
`setStakeToken` survive and let the agent move stakes. A fee-on-transfer or rebasing stake token breaks `stakeOf`
accounting (last exiters cannot be paid). A stake token that is also in `vaults` (senior or Felix shares) would be
counted in NAV, so staking would inflate the share price. ORPH is your own plain ERC-20 so none of these apply today;
add `if (isVault[address(token)]) revert WrongAsset();` and clear `rules`/`approvals` for the token in
`setStakeToken` so it stays that way.

---

## Informational

- `JuniorVault.sol:205, 251`: `reservedAssets` is credited with the floor of the bucket total and debited with the
  floor of each claim, so a few units of dust accumulate in `reservedAssets` forever and are excluded from NAV. Harmless
  at 6 decimals; zero it when `pricedExitShares == 0`.
- `JuniorVault.sol:188`: `uint128(shares)` and `uint32(settles.length)` are unchecked casts. Unreachable at the cap;
  use `SafeCast` so a future cap change cannot silently split `pendingExitShares` from `exitOf`.
- `JuniorVault.sol:179`: shares sent to the contract with a plain `transfer` (not `requestExit`) or minted with
  `receiver == address(this)` sit in `totalSupply` forever, diluting price slightly and breaking
  `invariant_lockedSharesHeld`. Reject `receiver == address(this)` in `deposit`; the transfer case is user error.
- `JuniorVault.sol:237`: if NAV ever reaches zero, `pricePerShare` becomes 0 and `_toShares` divides by zero, so a
  wiped vault cannot be restarted by new deposits, only by a donation followed by a settle. Acceptable for a dead
  tranche; say so.
- `JuniorVault.sol:264`: `expected` uses the management fee rate at settle time, not time-weighted across the week.
  Negligible at 0.5% per year.
- `JuniorVault.sol:285`: `expectedSupplyAssets` reflects realised bad debt only. Undercollateralised positions that
  have not been liquidated, or markets with a dead oracle, are carried at par. This is Morpho curation risk and belongs
  in the market selection checklist, not in code.
- `Invariant.t.sol:106-111`: `invariant_supplyTimesPriceLeqBalance` is only true because the handler never triggers
  a cover or a Morpho loss. It would fail under either; the comment should say that is intended and a second handler
  with `_forceSeniorLoss` should assert the weaker property `reservedAssets <= idle + positions`.
- `FeeRouter.sol:141-143`: `_send` treats a call to an address with no code as success. `usdc` is immutable and has
  code; `sweepBurn` on a token address with no code silently "burns" nothing. Add `address(token).code.length != 0`
  in `setBurn` and `setFloor`.
- `FeeRouter.sol:149-155`: parked amounts can be pulled only to the recorded recipient. If that address is
  permanently unable to receive (USDC blocklist), the funds are stuck. Consider an owner `reassignOwed` behind a delay.
- Rounding direction is otherwise correct everywhere I checked: `_toShares` down, settle price down, `owed` down,
  claim assets down, `expected` dilution term down (slightly more cover, in senior's favour by dust), `shortfall`
  down, FeeRouter floor down (slightly looser floor by at most 1 unit).

---

## Owner and agent trust assumptions

Every privileged action, with what it can do at worst. None has a timelock or a two-step delay except ownership
transfer itself (`Ownable2Step`).

JuniorVault owner:

- `seed()`: one-time, 1 USDC in. No risk.
- `setAgent(a)`: any address, including the owner. Instant.
- `setRule(target, selector, allowed, receiverOffset)`: any target except the asset and the current stake token, any
  selector, any offset including "no check". Can enable `Morpho.setAuthorization` (agent delegates junior's positions
  to a third party), `transfer` of senior or Felix shares, or a call into any contract.
- `setApprovalRule(token, spender)`: any token including USDC, any spender. With `setAgent`, this is a full drain of
  idle USDC and of any share token held (H-2).
- `addMarket(mp)`: any Morpho market whose loan token is USDC. Permanent. A market with a reverting IRM bricks the
  vault (M-4). Also widens the agent's venue list.
- `addVault(v)`: any contract whose `asset()` returns USDC. Permanent. Inflated or reverting `convertToAssets` means
  exits overpaid or the vault bricked (M-4).
- `setStakeToken(token, rate)`: one-way. Any token but USDC (L-5).
- `setStakePerAsset(rate)`: any value, instantly. A huge value is a de facto deposit pause. Does not affect stakes
  already posted.
- `setDepositCap(cap)`: any value. Lowering below NAV blocks deposits.
- `setDepositsPaused(bool)`: deposits only; exits and settle unaffected (verified, `test_pauseBlocksDepositsOnly`).
- Ownable2Step transfer.

JuniorVault owner, through the senior (same key in `Base`): curator and allocator of the Vault V2. Can set adapters,
caps, liquidity adapter, `maxRate`, management fee (up to 5%/yr, recipient currently junior, redirectable),
performance fee (up to 50%), gates (a `receiveSharesGate` that excludes junior silently drops the fee shares), and
`forceDeallocatePenalty`. Any senior loss, including one the curator engineers, is covered by junior's idle (M-5).

JuniorVault agent (with the rules in `Base.t.sol:99-105`):

- `approve` USDC to Morpho or Felix.
- `Morpho.supply` to the two markets with `onBehalf == junior`; `Morpho.withdraw` with `receiver == junior`.
- Felix `deposit` and `redeem` with `receiver == junior`; senior `redeem` with `receiver == junior`.
- Cannot send USDC anywhere else, cannot call with value, cannot delegatecall, cannot reenter `deposit`,
  `requestExit`, `claimExit` or `settle` (all `nonReentrant`), cannot trigger Morpho callbacks (junior does not
  implement them; verified in `test_OK_agentContainment`).
- Can grief: deploy reserved USDC so claims revert (M-3), supply into a 100%-utilised market, redeem junior's senior
  fee shares at a depressed price during a maxRate lag, churn gas.

FeeRouter owner:

- `setRouter(r, bool)`: any address. A router that is really an attacker contract plus a loose floor is a drain.
- `setFloor(token, oracle, bps)`: any oracle address, up to 10% slippage. A wrong oracle scale makes the floor zero.
- `setBurn(token, bps)`: up to 100% burn, any non-USDC token.
- `setRecipients(...)`: any addresses, instantly. Redirects every future split; also triggers L-1.
- `setSplit(...)`: any split summing to at most 100%; treasury gets the remainder, so 0/0 sends everything to treasury.
- `setKeeper(k)`: any address; owner is always a keeper too.

FeeRouter keeper: `sweep` (chooses router and calldata, bounded by the floor, L-4), `distribute`, `sweepBurn`.
Timing of sweeps and distributions is at the keeper's discretion, which shifts a week's fee income between the
junior epoch before and after a settle.

Permissionless: `settle()` (timing within the window is anyone's, L-3), `pullOwed(to, token)` (only to the recorded
recipient), senior deposits (C-1).

---

## What I verified

Environment: forge 1.9.0, solc 0.8.28, HyperEVM fork at block 50666000 via `https://hyperliquid.drpc.org`.

Existing suite, unchanged: `forge test` passes 14/14 (13 unit tests in `JuniorVault.t.sol`, 1 invariant suite with
3 invariants, 24 runs x 24 depth, 0 reverts).

New tests in `test/review/Review.t.sol`, run with `forge test --match-path test/review/Review.t.sol -vv`, 9/9 pass:

| Test | Finding | Result |
|---|---|---|
| `test_H1_coverSnipedByLateSeniorDepositor` | C-1 | 2% senior loss (2,000 USDC); junior paid 20,001 USDC (all idle); late depositor turned 1,000,000 into 1,018,719 |
| `test_H2_coverPaidTwiceUnderMaxRateLag` | H-1 | 10% loss; 9,645 paid at settle 1, 6,179 more at settle 2 with no new loss |
| `test_M1_stakeStrandedAfterLoss` | M-1, M-3 | 2,000 ORPH staked; full exit after cover leaves 949 ORPH and 4,746 "principal" stranded; claim needed an agent redeem of fee shares first |
| `test_M2_preSettleDepositTakesEpochYield` | M-2 | 90k deposited in the settle block took 900 of the 1,000 earned by a 10k depositor over the week |
| `test_M3_agentCanStrandReservedAssets` | M-3 | agent deploys reserved USDC; `claimExit` reverts `InsufficientLiquidity`, `requestExit` reverts `AlreadySet` |
| `test_L1_feeRouterOwedDoubleCountAfterRecipientChange` | L-1 | parked 250 re-split after `setRecipients`; `pullOwed` for the old recipient reverts |
| `test_L2_addVaultSelfBricksValuation` | M-4 | `addVault(address(junior))` accepted; `totalAssets` and `settle` revert once the vault holds its own shares |
| `test_L3_seniorCannotBeEmptiedOnThisFork` | L-2 | 0/0 path not reached: Vault V2 reverted the last full redeem on 2 of 3 runs, residual dust kept price above base on the third. Finding stands from code. |
| `test_OK_agentContainment` | agent allowlist | approve to unlisted spender rejected on a non-USDC token; Morpho supply with callback data reverts; short calldata on a receiver-checked rule rejected |

Checked by reading and reasoning, no test needed:

- Exit bookkeeping: the settle that folds bucket `d` (`block.timestamp / 1 days >= d`) is exactly the first settle
  with `timestamp >= readyAt`, which is what `_priceAtOrAfter` returns, so claim price equals reserve price.
  `settleHint` cannot skip a qualifying settle because every settle before the request has `timestamp < readyAt`.
  Merging removes the old bucket in full and re-adds the merged total; `pendingExitShares` only grows by the new
  shares; a priced request cannot be merged. `pricedExitShares` and `reservedAssets` are decremented once per claim
  and the request is deleted before any external call. Double claim is not possible.
- Share price around settle: `supply` excludes priced shares and includes pending ones, `nav` excludes reserved,
  matured shares are priced after cover. Consistent. First-depositor inflation is dead: price is frozen at `WAD`
  until the first settle, 1e18 dead shares exist from `seed`, and a donation large enough to round a 1 USDC deposit
  to zero shares would need about 1e12 USDC.
- Agent `execute`: `approve` is intercepted for every target so no allowlisted rule can reach it; receiver word is
  decoded as `address` so dirty upper bits revert; `Address.functionCall` is a plain call with no value; the offsets
  used in `Base` (224 for `supply.onBehalf`, 256 for `withdraw.receiver`, 32 for 4626 `deposit`/`redeem` receiver)
  are correct against the ABI layouts.
- `totalAssets` and `convertToAssets` on Felix v1.1 include accrued fee shares (`_accruedFeeAndAssets`), and senior
  `convertToAssets` is `previewRedeem` including pending fee dilution, so junior's own valuation of its fee shares
  is not stale.
- Management fee dilution model at line 264: with `managementFeeShares = F * (S + V) / (TA - F + 1)` the post-fee
  price is `p * (1 - m * elapsed)` to within the `+1`, so `expected` is right when there is no yield and
  conservative when there is.
- Whether a senior "loss" can be manufactured from rounding alone (deposit/withdraw cycles through Felix) to feed
  C-1 without a real loss, by reasoning not by test: the per-share drop is at most one unit of `PRICE_UNIT`, which
  bills 1e-12 of senior TVL. Not exploitable; C-1 needs a genuine loss event.
- FeeRouter: `nonReentrant` on `sweep` blocks a router re-entering `distribute`/`pullOwed`; `forceApprove` to zero
  after the call; deltas measured not trusted; floor arithmetic `amountIn * price / 1e36` matches the Morpho oracle
  convention (quote units per base unit, decimals folded in); no ETH path, no `receive`.

Not covered: gas profiling of `settle` after months without a call (the `maturingShares` loop is linear in days,
about 2.1k gas per day, so a year of silence is about 800k gas; fine), and behaviour under a USDC blocklist of the
vault itself (every path would revert; nothing to do about it in code).

---

## Recommended order of work before deploy

1. C-1 and H-1 together: real-assets measurement plus supply snapshot in `_coverSenior`, and the `supply == 0` guard
   (L-2). Re-run `test_H1` and `test_H2` and assert `paid <= realLoss + dust` and `paid2 == 0`.
2. H-2 and M-5: restrict `setApprovalRule` and `setRule` targets to Morpho and `isVault`; put the senior curator role
   on a separate multisig with timelocks set.
3. M-3: idle floor in `execute`.
4. M-1: share-based stake release.
5. M-2: mint at `max(frozen, live)`.
6. M-4: removal functions and `try/catch` in `totalAssets`.
7. L-1, L-3 wording, L-4 parameters.

---

# Second pass: the fixes

Scope: the new code paths in `src/JuniorVault.sol` (sync, real-price cover, `_toShares` live price, `try/catch`
valuation, idle floor, removal, rule restrictions, `stakedShares`) and `FeeRouter.totalParked`, plus
`script/02_DeployJuniorRouter.s.sol` ordering. New PoCs are in `test/review/Review2.t.sol`. First-pass findings C-1,
H-1, H-2, M-1, M-2, M-3, M-4, L-1, L-2 and L-5 are confirmed fixed by the flipped regression tests and by reading.

## High

### S-1. execute never checks the Morpho MarketParams: a compromised agent can supply to any USDC market, including one with an attacker oracle

`JuniorVault.sol:389-398` (rule check), `415-420` (setRule now limits targets to Morpho and `isVault`)

The allowlist checks target, selector and the receiver word. For `Morpho.supply` the market is the first 160 bytes
of calldata and nothing reads them. `isMarket` is used only by `addMarket`/`removeMarket`. Morpho market creation is
permissionless for any enabled IRM and LLTV with an arbitrary oracle.

Reproduced in `test_S1_agentSuppliesToUnlistedMarketAndAttackerBorrowsItAll`: attacker creates a USDC market with
a junk collateral token and an oracle returning 1e60, the agent key supplies 50,000 USDC to it (both calls pass the
allowlist exactly like the legitimate ones), `totalAssets` drops to the seed, attacker posts 1 wei of junk and
borrows the full 50,000. This existed in the first version too and I missed it; it is the single biggest hole in the
agent containment story and it is independent of every other fix.

Fix: for `target == address(morpho)` require the leading `MarketParams` to be allowlisted, for every selector:

```solidity
if (target == address(morpho)) {
    if (data.length < 4 + 160) revert NotAllowed();
    MarketParams memory mp = abi.decode(data[4:164], (MarketParams));
    if (!isMarket[mp.id()]) revert NotAllowed();
}
```

Every market-level Morpho function (`supply`, `withdraw`, `supplyCollateral`, `borrow`, `repay`, `liquidate`,
`accrueInterest`) starts with `MarketParams`, so the decode is well-typed for all of them; the non-market functions
(`setAuthorization`, `flashLoan`) would fail the decode or the `isMarket` check, which is what you want. Combine with
S-4 below so that `isVault[target]` is also checked at call time, not only at rule-set time.

## Medium

### S-2. `_seniorRealPrice` ignores unminted management-fee shares, so a sync after an idle period makes the next settle pay junior's own fee as cover

`JuniorVault.sol:312-319`, `297-303`, `306-309`

Vault V2 mints management-fee shares only inside `accrueInterest`. `_seniorRealPrice` divides by
`senior.totalSupply()`, which excludes the fee shares accrued since `lastUpdate`. `syncSenior` does not call
`accrueInterest`, so a sync taken while senior has a fee backlog records a baseline that is too high, and the drift
term in `_expectedSeniorPrice` only allows for fees since `seniorBaseTime`. At the next settle, `accrueInterest`
mints the whole backlog, the real price drops by `fee * (settle - lastUpdate)` and the gap beyond
`fee * (settle - baseTime) + 1 ppm` is billed.

Reproduced in `test_S2_feeBacklogReadAsLossAfterSync`: 30 idle days on senior, sync, one hour, settle: junior pays
40.65 USDC with no loss anywhere (about 400 ppm of a 100k senior). The money goes to senior holders; junior's fee
shares do not compensate because they were going to be minted anyway. Size is `fee rate x senior TVL x idle
interval`, so small at 0.5% but it is systematic, grows with the fee (owner can set 5%), and it is the kind of
"junior bled a little every week and nobody knows why" bug that erodes trust.

Fix: make the real price fee-aware so sync and settle agree:

```solidity
function _seniorRealPrice() internal view returns (uint256) {
    uint256 real = asset.balanceOf(address(senior));
    uint256 n = senior.adaptersLength();
    for (uint256 i = 0; i < n; i++) real += IAdapter(senior.adapters(i)).realAssets();
    (, uint256 perfShares, uint256 mgmtShares) = senior.accrueInterestView(); // 0 right after accrueInterest
    return PRICE_UNIT * (real + 1) / (senior.totalSupply() + perfShares + mgmtShares + senior.virtualShares());
}
```

Note `accrueInterestView` computes the fee on `min(real, maxTotalAssets)`, so during a maxRate lag the pending fee is
slightly lower than it will be once recognised; that error is `fee x lag x unrecognised`, far below the 1 ppm band.
With this in place the 1 ppm tolerance can shrink to a few units of `PRICE_UNIT` (see S-5).

### S-3. Removed venues remain callable: rules and approvals are keyed by address and `execute` only checks the rule

`JuniorVault.sol:439-455`, `386-391`

`removeVault` clears `isVault` and pops the array, but `rules[vault][*]` and `approvals[USDC][vault]` stay set and
`execute` consults only those. Reproduced in `test_S4_removedVaultStillCallable`: after `removeVault(Felix)` the
agent deposits 5,000 USDC into Felix and `totalAssets` no longer counts it. The same holds for `removeMarket` (and
for never-listed markets, see S-1). An agent that can move value into an unvalued venue can depress the settle
price, have an accomplice deposit, move it back, and let the accomplice exit at the restored price. Needs a
compromised agent plus an owner removal, so Medium.

Fix: check membership at call time in `execute`:

```solidity
if (target != address(morpho) && !isVault[target]) revert NotAllowed();
if (selector == IERC20.approve.selector) { ... if (spender != address(morpho) && !isVault[spender]) revert NotAllowed(); }
```

Clearing `rules`/`approvals` on removal is then unnecessary.

### S-4. A venue whose view reverts during settle sets a wrong frozen price silently

`JuniorVault.sol:334-343`, `246`

`try/catch` keeps the vault alive, which is right for `claimExit` and arguably for `deposit`, but a settle that
valued a venue at zero because its view reverted freezes a price far below reality. Anyone who deposits before the
view recovers (at `max(frozen, live)`, both wrong) buys at that price and the recovery is theirs. I could not find a
way for an outsider to make any current venue's view revert: `expectedSupplyAssets` and the Felix and V2 paths go
through IRMs and adapters only, never an oracle. So this is a sharp edge rather than an exploit today, but one new
venue with an oracle-dependent view changes that, and the failure is silent.

Fix: have `totalAssets` report completeness and make `settle` and `deposit` refuse when it is incomplete:

```solidity
function _totalAssets() internal view returns (uint256 total, bool complete) { ... complete = false in catch ... }
function totalAssets() public view returns (uint256 t) { (t,) = _totalAssets(); }
// settle: (nav, ok) = _totalAssets(); if (!ok) revert VenueUnavailable();
// deposit: same
```

`claimExit` keeps working because its price is already frozen. Also note that `removeMarket` calls
`expectedSupplyAssets` and `removeVault` calls `balanceOf`, so a venue that reverts permanently cannot be removed
through them; add an owner `forceRemove*` that skips the position check and emits a loud event.

## Low

### S-5. The 1 ppm tolerance is a ratchet on uncovered loss

`JuniorVault.sol:308`

Each successful sync accepts a drop of up to 1 ppm plus fee drift and resets the baseline to it. With an hourly
keeper that is up to 8,760 ppm a year of senior decline that is never covered, if the senior bled at exactly that
rate. No attacker can slice a real loss into sub-ppm pieces hourly (deposit/withdraw rounding on Felix is about
1e-12 per operation and `forceDeallocate` penalties raise the price), so this is a bound, not a vector. After S-2
the remaining rounding is a few units of `PRICE_UNIT` and the tolerance can be `seniorPriceBase / 1e9` or an absolute
`1e3`.

### S-6. Rule restriction limits targets, not selectors: share-token `transfer` on senior or Felix is still allowlistable

`JuniorVault.sol:415-420`

`setRule(address(senior), transfer.selector, true, max)` is accepted because `isVault[senior]`. That lets the agent
send junior's senior fee shares (or Felix shares) anywhere. Owner-enabled, so trust-model only, but it contradicts
"never raw token moves" for the share tokens. Fix: reject `transfer`, `transferFrom`, `approve` (already
intercepted), `permit` and `increaseAllowance` selectors in `setRule`, or whitelist the 4626 selectors explicitly.

### S-7. `coverInProgress` returns 0 when senior is empty, which is fine

`JuniorVault.sol:322-327`

With `totalSupply() == 0` the two prices are `(real+1) * 1e12` and `(TA+1) * 1e12`; any difference is multiplied by
zero supply, so the view returns 0 and never panics. Noted only because the front end should not read 0 here as
"nothing pending" while senior is empty for other reasons.

## Informational

- `_toShares` (`359-364`): correct. `live` rounds down so the depositor gets at most 1 share-wei extra; the seed path
  has `supply == 0` and mints exactly 1e18; a pre-seed donation does not change the seed mint; a mid-week donation
  raises `live` and benefits holders, with no profitable inflation given 1e18 dead shares. With a broken venue
  (S-4) `live` is understated and the depositor pays the frozen price, which is the conservative side for holders.
  A depositor entering after a mid-week loss pays the frozen price and overpays; that is adverse selection against
  themselves, not a leak.
- Idle floor (`400-404`): correct and tight. `test_OK_removalAndIdleFloor` deploys `idle - reserved + 1` and is
  refused, `idle - reserved` is accepted. The only way around it is a call that commits a later outflow, and with
  approvals limited to Morpho and `isVault` there is none (after S-1 and S-3). A claim during the call is blocked by
  `nonReentrant`.
- `try this.marketAssets(i)` / `vaultAssets(i)` (`335-342`): both are `view`, so the self-call is a STATICCALL and no
  reentrancy is possible. Gas griefing would need a venue that burns the forwarded 63/64 of gas; only the owner can
  add venues and the loop is bounded at 16 + 16. A venue returning garbage without reverting is the M-4 owner-trust
  case, now mitigated by removal.
- Removal (`439-455`): swap-and-pop is correct and the `isMarket`/`isVault` flags match the arrays afterwards
  (`test_OK_removalAndIdleFloor`). Indices shift on removal, so the front end and scripts must look up by address,
  not by stored index.
- `stakedShares` (`170-175`, `215-223`): correct. Release is `stake * burned / held` with `burned` capped at `held`,
  full release when `burned == held` (including `0 == 0`), so no dust and no division by zero. Transfers neither
  release nor strand stake (`test_OK_stakeFollowsSharesThroughTransferAndMerge`: carol exits transferred shares
  with no stake, bob frees 600 of 1,000 staked shares across two merged requests and gets exactly 60% back).
  Pre-gate deposits have `stakedShares == 0` and `stakeOf == 0` and skip the block. Mixed pre- and post-gate deposits
  release in proportion to post-gate shares burned, which slightly favours the exiter (first shares out are deemed
  the staked ones). Acceptable; mention it in the docs.
- Snapshot refresh before a loss is not an attack (`test_OK_snapshotRefreshBeforeLossBillsOnlyTheRealLoss`): shares
  deposited before the loss took it, and the bill is the absolute loss (1,490 paid on a 2,000 loss after a week of
  Felix yield), not a multiple. `syncSenior` and `deposit` both refuse to move the baseline while `price <
  expected`, so post-loss deposits cannot be added. Senior withdrawals after a loss lower `exposed` and the bill.
- `_coverSenior` with `supply == 0` now skips the division and resets the baseline to `(real+1) * 1e12`. Correct.
- `FeeRouter.totalParked` (`44`, `127`, `146`, `155`): correct for USDC. For burn-split tokens a parked amount of
  `token` is still inside `sweep`'s `amountIn` if the owner later switches that token to the swap path; low, owner
  sequencing.
- Deploy script `02_DeployJuniorRouter.s.sol`: ordering is correct. `addVault(FELIX)` and `addVault(senior)` precede
  every `setRule`/`setApprovalRule` that needs `isVault`; the Morpho rules need no prerequisite; `seed()` runs
  before `setDepositsPaused(true)` and `setAgent`; `setStakeToken` is not in the script and would reject `asset`,
  `morpho` and any `isVault` address. A wrong market id in `Addresses.sol` yields zeroed params and
  `addMarket` reverts `WrongAsset`, which is a good guard. One note: `setRule(FELIX, withdraw(uint256,address,address))`
  and `setRule(senior, withdraw(...))` use offset 32 for `receiver`, which is correct.

## What I verified (second pass)

`forge test --match-path test/review/Review2.t.sol -vv`: 6/6 pass.

| Test | Finding | Result |
|---|---|---|
| `test_S1_agentSuppliesToUnlistedMarketAndAttackerBorrowsItAll` | S-1 | agent supplies 50,000 USDC to an unlisted market with an attacker oracle; attacker borrows all 50,000 against 1 wei |
| `test_S2_feeBacklogReadAsLossAfterSync` | S-2 | 30 idle days, sync, settle: 40.65 USDC paid as cover with no loss |
| `test_S4_removedVaultStillCallable` | S-3 | after `removeVault(Felix)` the agent still deposits into Felix and NAV ignores it |
| `test_OK_snapshotRefreshBeforeLossBillsOnlyTheRealLoss` | C-1 residual | deposit + sync before a 2,000 loss: junior pays 1,490 (loss less Felix yield), not a multiple |
| `test_OK_removalAndIdleFloor` | removal, idle floor | removal blocked with a position, swap-and-pop flags correct, floor refuses `idle - reserved + 1` and accepts `idle - reserved` |
| `test_OK_stakeFollowsSharesThroughTransferAndMerge` | stakedShares | transferred shares exit with no stake, merged requests release exactly pro rata |

Flipped first-pass regression tests (`test/review/Review.t.sol`, edited by the coordinator, read by me): 9/9 pass
and their assertions match the fixed behaviour I expected (paid about 2k on a 2k loss with a 1M late depositor;
second settle pays 0 under maxRate lag; full exit after a loss returns the whole stake; settle-block deposit mints
at the live price; agent refused below the reserved floor; parked total survives a recipient change;
`addVault(address(this))` refused; `removeVault` works).

Full `forge test`: 32 pass, 1 fail. The failure is `test/ORPH.t.sol` `setUp()` (`ERC20InsufficientBalance`), a file
that appeared during this pass from parallel work and is outside the scope of this review. Everything under
`src/JuniorVault.sol`, `src/FeeRouter.sol`, `test/*.sol` as of the first pass, and `test/review/` is green.

Checked by reading only: `syncSenior` cannot raise the baseline (it sets `base = price`, never higher), cannot be
used after a loss (refuses while `price < expected`), and a junior `deposit` goes through the same guard. The real
price cannot be inflated through views: Morpho interest is monotone and paid by borrowers, Felix v1.1
`previewRedeem` reflects `lostAssets` live, and a donation that raises the baseline is permanent so there is no
"raise then drop" against junior. Reverting venues count as zero in `_toShares` and `settle` (S-4) but never in
`claimExit`.

## Recommended order (second pass)

1. S-1 market check in `execute`, together with S-3 call-time membership check. Both are five lines and close the
   agent containment properly.
2. S-2 fee-aware `_seniorRealPrice`, then tighten the tolerance (S-5).
3. S-4 completeness flag for `settle` and `deposit`, plus `forceRemove*`.
4. S-6 selector blacklist in `setRule`.
