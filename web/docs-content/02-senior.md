---
title: Senior
order: 2
---

# Senior

Senior is a Morpho Vault V2 on HyperEVM, created from Morpho's Vault V2 factory. The bytecode of that factory is identical to the one on Ethereum and Base. Orphic is the curator: it chooses the venues, sets the caps and the fee, and runs the allocator key. Orphic never holds senior's USDC. Depositing, withdrawing and share pricing are Morpho's code.

Share token: the Vault V2 share, an ERC-4626 vault over USDC (`0xb88339CB7199b77E23DB6E890353E22632Ba630f`, 6 decimals).

## Venues

A USDC Vault V2 can only allocate to venues whose loan asset is USDC. Two adapters are attached at deploy:

- a MorphoMarketV1 adapter, which reaches Morpho Blue USDC markets on HyperEVM;
- a MorphoVaultV1 adapter, which reaches the Felix USDC v1.1 vault (`0x8A862fD6c12f9ad34C9c2ff45AB2b6712e8CEa27`) and is the liquidity adapter (see below).

Morpho Blue markets registered at launch, all using the Adaptive Curve IRM:

| Market | Collateral | LLTV | Market id |
|---|---|---|---|
| kHYPE / USDC | kHYPE | 62.5% | `0xe7aa046832007a975d4619260d221229e99cc27da2e6ef162881202b4cd2349b` |
| kHYPE / USDC | kHYPE | 77.0% | `0x96c47d3797394dd25e33f814216793a89d2e6edcc54d1dac3ab4c2b2d82a73b9` |
| WHYPE / USDC | WHYPE | 77.0% | `0xd7d38220652d19c87099c3b23de9a70a1893620a050c635d1a94bd947c9c59a8` |
| UBTC / USDC | UBTC | 77.0% | `0x45af9c72aa97978e143a646498c8922058b7c6f18b6f7b05d7316c8cf7ab942f` |

Not in senior: USDT0 markets (a USDC vault cannot supply them), HyperLend (no Vault V2 adapter exists on HyperEVM), and the AVLT/USDT0 market, which is excluded on purpose.

## Targets and caps

Targets are where the Rotator tries to put the money. Caps are on-chain ceilings in the vault that the allocator cannot cross, set by the curator behind a 3-day timelock.

Opening targets decided for launch: kHYPE 62.5% market 34%, kHYPE 77% market 10%, WHYPE 77% market 20%, UBTC 77% market 19%, Felix 15%, idle 2%. A reduction of the UBTC target (the market is about $0.66M deep and a 19% allocation would push its rate down sharply) is proposed and pending. The targets in force are on the status page; the Rotator re-weights them hourly from live rates.

Caps at launch:

- Felix adapter: absolute cap $425,000. Deposits enter the liquidity adapter first, so this is the effective total cap on senior.
- Each market id: an absolute cap set in the deploy batch (figures published at launch). The UBTC cap is 10% of the total.
- Every relative cap is 100% at launch, because Vault V2 checks relative caps against total assets at the start of the transaction and a lower value would block the first deposits. Relative caps are revisited once the vault is above about $1M.
- Rotator rule on top of the caps: never more than 50% of any market's supply or of Felix's assets.

The total cap is soft: Vault V2 has per-id caps and no single total cap. If the Rotator has moved funds out of Felix, new deposits can enter until the market caps are also full. Worst case about 2.2 times the stated cap. See Risks.

## Fees

| Item | Value |
|---|---|
| Management fee | 0.5% a year of senior's balance, paid in senior shares to the junior vault (`managementFee = 158548959` per second, `managementFeeRecipient = JuniorVault`) |
| Performance fee | 0 |
| Felix's own fee | 10% of yield on the slice held in Felix, paid to Felix, not to Orphic |
| Orphic's fee router | 50% of all Orphic fees are paid into the senior vault as USDC |

The management fee is the price of the first-loss buffer under senior. It is the only thing senior pays Orphic.

## Withdrawals

Instant, to available liquidity. A withdrawal takes idle USDC in the vault first, then redeems from the liquidity adapter (Felix). If both are short, the withdrawal reverts until the Rotator deallocates from the markets, or the depositor calls Vault V2's `forceDeallocate` on a market adapter themselves (a Vault V2 feature; the curator can set a penalty on it and the current value is readable as `forceDeallocatePenalty` on the vault). Morpho Blue markets on HyperEVM run at 88 to 90% utilisation, so instant liquidity across all USDC markets is a few million dollars at the time of writing. Treat "instant" as "instant up to what the venues can pay".

There is no notice period, no exit fee and no gate on senior at launch.

## How fees paid into the vault raise the share price

The fee router and junior's cover payments both send plain USDC into the senior vault. Vault V2 counts the vault's own USDC balance plus each adapter's `realAssets()`. The transfer is counted in real assets at once, but the share price only moves as `accrueInterest` recognises it, at a pace bounded by `maxRate`. Senior's `maxRate` is set to the protocol maximum, 200% a year, the same value Felix uses. A fresh Vault V2 has `maxRate = 0` and recognises nothing, which is why it is set in the deploy batch.

Normal lending yield is far below that bound and shows in the price immediately. A large one-off transfer shows gradually.

## Cover recognition window

Measured on a HyperEVM fork against the real Vault V2 bytecode.

At 200% a year the share price can rise by at most 0.548% of total assets per day. A cover payment equal to 2% of senior is therefore recognised 29% after 1 day, 58% after 2, 87% after 3, and fully after 4 days (about 3.7 days). The transfer itself is in `realAssets` from the first block; only the price lags.

What a senior holder sees after a loss, in order:

1. The share price drops at once. Vault V2 marks losses immediately.
2. It stays down until junior's next `settle()`, up to 7 days away.
3. After the settle it recovers over up to 3.7 days.

Anyone who withdraws inside that window takes the part of the loss that has not been recognised yet; the value they leave behind goes to the holders who stayed. Nobody outside senior and junior gains from this. While it is happening the app shows "Cover in progress: n% recognised, whole in about h hours", read from `JuniorVault.coverInProgress()` and senior's `maxRate`.

The wait for the weekly settle is the larger part of the window and is Orphic's to remove. A permissionless `cover()` that the Rotator calls hourly whenever senior's price is below its fee-adjusted baseline ships in week one. That shortens the window to about 1 hour plus up to 3.7 days. The 3.7 days are Vault V2 accounting and stay.

## Roles on senior

| Role | Who | Can |
|---|---|---|
| Owner and curator | Orphic Safe (after deploy step 3) | add adapters, set caps, fees, fee recipient, allocators, gates, `maxRate`, liquidity adapter; each behind a 3-day timelock after setup |
| Allocator | Rotator key and the deployer wallet | `allocate` and `deallocate` between the vault's idle balance and its registered adapters, within the caps; also, by Vault V2's design, `setMaxRate` (at most 200% a year) and `setLiquidityAdapterAndData`, both instant |
| Sentinel or curator, instant | Orphic | `decreaseAbsoluteCap` (used as the senior kill switch), revoke pending timelocked submissions |
| Anyone | | deposit, withdraw, redeem, `accrueInterest`, `forceDeallocate` |

A note on trust: the curator can route senior funds to a venue that loses, and junior pays. The curator is kept on a Safe distinct from the junior owner before caps are raised beyond launch, and the 3-day timelock on adapters and caps stays. See Risks.
