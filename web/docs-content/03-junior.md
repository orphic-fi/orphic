---
title: Junior
order: 3
---

# Junior

Junior is one custom contract, `JuniorVault`, about 570 lines, unaudited, fork-tested, reviewed twice. It is an ERC-20 share token over USDC: name "Orphic Junior USDC", symbol `ojUSDC`, 18 decimals. It holds junior depositors' USDC, their ORPH stakes, and the senior fee shares it earns.

Junior is first loss. Any loss in senior's venues is paid out of junior before any senior holder is touched. Any loss in junior's own venues is junior's alone.

## Launch caps

| Cap | Value | Lifted by |
|---|---|---|
| Total junior deposits (`depositCap`) | $75,000 | owner, instant |
| Per wallet, week one (`walletCap`) | $10,000 at the frozen share price, counted across shares held plus shares in an open exit | owner, planned off (`setWalletCap(0)`) the Monday after launch |
| Seed | 1 USDC of dead shares funded by the owner before deposits open | permanent |

The seed removes any first-depositor price game. Deposits revert until the vault is seeded.

## Deposit

`deposit(assets, receiver)` pulls USDC and, because the stake gate is on from day one, a stake of ORPH. Both approvals are needed first.

Stake: `stake = assets * stakePerAsset / 1e6`, with `stakePerAsset` in ORPH wei per 1 USDC. At launch the rate is set so the stake is worth 20% of the deposit at the pool's opening price. The stake is held in the contract, is not counted in junior's assets, earns nothing, and is returned in ORPH when the depositor exits. It is quoted once at deposit and never re-quoted.

Price: shares are minted at the worse (for the depositor) of the share price frozen at the last settle and the live price computed from current net assets. A deposit one block before a settle therefore cannot take the week's yield from earlier depositors. A deposit made after a loss is visible but before the settle pays the frozen price and overpays; that is the depositor's own adverse selection.

Each junior deposit also calls `syncSenior()`, which refreshes the set of senior shares junior stands behind (see Cover).

Deposits revert when paused, before seeding, above `depositCap`, above `walletCap`, or when any venue's valuation call reverts (the contract will not mint at a price it cannot compute).

## The stake rate and how it changes

There is no ORPH price oracle. `stakePerAsset` is an owner-set number.

- At launch: set by `setStakeToken(ORPH, stakePerAsset)`, one-way, with the rate derived from the pool's opening price. Example from the runbook: at $0.000005 per ORPH, 20% of 1 USDC is 40,000 ORPH, so `stakePerAsset = 40000e18`.
- Weekly: the keeper samples the HYPE/ORPH pool hourly (Uniswap v4 has no on-chain TWAP) and computes a 7-day time-weighted average price. On the weekly run it prints `proposeStakePerAsset(0.20 / twap7d * 1e18)`.
- If the implied gate has drifted outside 15% to 25% of deposit value, the owner sends `proposeStakePerAsset(x)` on Sunday after the settle. Inside the band, the week is skipped.
- Three days later, Wednesday, anyone may call `applyStakePerAsset()`. The keeper does it. `pendingStakePerAsset()` and `stakeEta()` show the pending change in the app.
- The owner can `cancelStakePerAsset()` before it applies. There is no instant path: in an emergency the owner pauses deposits instead.

A new rate applies to new deposits only.

## Exit

Exits take notice and are priced at a settle, so that every exit is paid at a price computed after any cover owed to senior.

1. `requestExit(shares)` moves the shares into the contract and sets `readyAt` to the first UTC midnight at least 7 days away. One open request per address. A second request merges into the first and restarts the notice. A request that has already been priced must be claimed before a new one can be opened.
2. The request is priced at the first weekly `settle()` whose timestamp is at or after `readyAt`. Because `readyAt` is rounded up to midnight and settles are weekly, the notice is 8 to 14 days in practice, not 7. Until that settle the shares still count in the live supply and still take their share of gains and losses, including a cover.
3. At that settle the matured shares are moved to the priced set, their value `shares * price` is reserved as `reservedAssets`, and from then on they are a fixed USDC claim: no longer first loss, no longer earning.
4. `claimExit()` pays `shares * price` in USDC from the contract's idle balance, burns the shares and releases the stake.

Stake release is by shares, not by value: `release = stake * burned / stakedShares`, and a full exit returns the whole stake regardless of what the shares are worth. Shares transferred to another address carry no stake with them and release none when that address exits. Where a wallet mixes deposits made before and after the gate, the first shares out are treated as the staked ones, which slightly favours the exiter.

`claimExit` reverts with `InsufficientLiquidity` if the contract's idle USDC is below the claim. The agent cannot deploy USDC that priced exits are owed (`execute` enforces `reservedAssets` as an idle floor), and the Rotator returns reserved assets to idle before each settle. If it fails to, the claim is delayed until it does. No user funds are at risk from this, only time.

## What junior earns

- Senior's management fee: 0.5% a year of senior's balance, minted to junior as senior shares at every `accrueInterest`. At a 425:75 ratio that is roughly 2.8% a year on junior before anything else; an estimate from the ratio, not a rate promise.
- The agents' results on junior's own USDC in the registered venues: the Morpho USDC markets, Felix, and later the Ranger vault. Published weekly on the agents page from the first settle. No estimate is given before there is a number.
- 25% of every fee Orphic earns, delivered as USDC by the fee router.

## What junior can lose

- Every senior loss, up to junior's entire idle USDC net of what priced exits are owed, at each settle.
- Every loss in junior's own venues: Morpho bad debt in a registered market, a Felix loss, or Ranger range losses once Ranger is funded.
- Share price can fall to zero. A wiped junior cannot be restarted by deposits, only by a donation followed by a settle.

The ORPH stake is not at risk from junior's results. It is returned in full on a full exit. Its value in USDC can of course change with ORPH's price.

## How cover is computed

Junior keeps three numbers about senior: `seniorPriceBase` (senior's real assets per share at the last sync or settle, after any cover), `seniorSupplyBase` (senior's share supply at that moment) and `seniorBaseTime`.

"Real assets" means senior's own USDC balance plus every adapter's `realAssets()`, divided by supply plus pending fee shares plus virtual shares. This is measured independently of Vault V2's `maxRate` smoothing, so a cover already paid is never paid twice.

At each `settle()`:

1. `senior.accrueInterest()` runs, so junior's fee shares exist before anything is valued.
2. Expected price = `seniorPriceBase`, less the management fee drift since `seniorBaseTime`, less a 1 ppm rounding tolerance.
3. If the real price is below expected, the shortfall is `(expected - real) * exposed / PRICE_UNIT`, where `exposed` is the smaller of senior's current supply and `seniorSupplyBase`.
4. Junior pays the shortfall from its idle USDC, net of `reservedAssets`, by transferring USDC into the senior vault. If idle is short, it pays what it has and the rest stays uncovered.
5. The baseline is reset to the real price after payment, so the same loss is billed once.

The bill is limited to shares present at the last sync. Senior shares bought after a loss were bought at the depressed price and are owed nothing; without this rule anyone could buy senior after a loss and have junior top them up. `syncSenior()` is permissionless, the keeper calls it hourly, every junior deposit calls it, and it refuses to move the baseline while senior is below expected, so it can never be used after a loss to enlarge the bill. The consequence is that senior shares deposited since the last sync are uncovered until the next one, about an hour.

Late senior depositors still share the top-up pro rata, because a plain USDC transfer into a Vault V2 goes to all shares. Pre-existing senior holders are not made exactly whole when there are late depositors; junior is never billed beyond the real loss.

Residuals: losses under 1 ppm per sync are inside the tolerance and never covered. If `maxRate` has not fully recognised a cover by the time of the next measurement, that is handled by measuring real assets, not the recognised price, so there is no second instalment.

## Agent access to junior's USDC

A single agent key can move junior's idle USDC to the registered venues and back, through `execute`, under an allowlist described in Agents. It cannot send USDC to anyone, cannot touch the ORPH stakes, and cannot take idle below what priced exits are owed.

## Pause

The owner can pause deposits only. Exits, claims, settles and `syncSenior` keep working by construction.
