# Ranger: design note (week one, not Monday)

## Mandate
Manage concentrated-liquidity ranges on USDC/HYPE pools for junior, capped at 30% of junior's assets, earning swap fees and (where a gauge exists) emissions that are sold to USDC at each weekly close. Market-neutral is not claimed: an LP position is short volatility and long the pair; the cap and the range rules bound that.

## The constraint the brief did not have
JuniorVault lives on HyperEVM and its agent can only call venues the owner registers, and `totalAssets()` only knows how to value two shapes: Morpho Blue positions and ERC-4626 vaults. Nest and Aero are on Elysium, which junior cannot call, and an LP position NFT is neither shape. Two consequences:

1. **Week one runs on HyperEVM, not Elysium.** Uniswap v4 is live on HyperEVM (PoolManager `0x12D4…6B1F`, verified) and has USDC/HYPE pools; Hyperswap and Kittenswap CL pools exist too. Nest and Aero wait for the December move with the rest of the contracts, exactly as the brief schedules.
2. **Ranger is an ERC-4626 strategy vault, not a new allowlist shape.** `RangerVault` (custom, small) holds the LP positions, is owned by Orphic, and reports `convertToAssets` from live pool state. Junior registers it with `addVault` and funds it through the existing `deposit(uint256,address)` rule; `totalAssets()` values it like Felix. The 30% cap is enforced inside RangerVault (`maxDeposit` returns the remaining room given junior's `totalAssets()`), so the agent cannot overshoot even if the keeper misbehaves.

## RangerVault (about 250 lines, unaudited, week one)
- ERC-4626 over USDC, single depositor (junior) enforced.
- Holds one or two Uniswap v4 positions in the USDC/HYPE pool through Uniswap's PositionManager (audited) and keeps the HYPE leg hedged only by range choice (no perps; that is Basis's job).
- `totalAssets()`: idle USDC + for each position, amounts of USDC and HYPE at the current sqrtPrice (StateView `getPositionInfo` + LiquidityAmounts) + uncollected fees, with HYPE valued at the Morpho WHYPE/USDC oracle (the same oracle the kHYPE and WHYPE markets use), never at the pool's own spot price. A 1% haircut on the HYPE leg covers exit slippage.
- Agent calls (allowlisted inside RangerVault, same receiver-word pattern as junior): `mint`, `increase`, `decrease`, `collect`, `burn` on PositionManager with recipient = RangerVault; swaps between USDC and HYPE only through the Universal Router with recipient = RangerVault and `minOut` from the oracle floor (FeeRouter's floor logic reused).
- Rules enforced on-chain: HYPE exposure after any call ≤ 60% of RangerVault assets; never more than 50% of a pool's active liquidity in our range (read from StateView, checked in `mint`/`increase`); only the whitelisted pool ids.
- Junior-side: withdrawals from RangerVault pull idle first, then `decrease` pro rata; the Rotator keeps RangerVault's idle at or above junior's reserved exits share.

## Keeper logic (Ranger module in the existing keeper)
- Range: centred on the 24h TWAP of the Morpho WHYPE oracle, width from realised 7-day volatility (2 sigma), recentred when price leaves the inner 60% of the range or after 72 hours, whichever first; never more than one recentre per 6 hours.
- Sizing: 20% of junior at most at launch (on-chain cap), 30% after two clean weekly settles; start at 10% in practice.
- Weekly close: collect fees, sell HYPE above the 50/50 target back to USDC (oracle floor), report realised return per position to the agents page.
- Kill switches: flat (burn both positions, swap to USDC) if HYPE moves more than 15% in 24h, if the oracle is stale over 1 hour, if the pool's active liquidity drops below 5x our position, or if RangerVault's NAV is down 3% on the week. Owner `pause` on RangerVault blocks new mints, never withdrawals.

## Tests before enabling (fork, HyperEVM)
Mint and value a position against the live USDC/HYPE v4 pool; price move up and down 10% with NAV within the haircut; 50%-of-pool rule rejects; exposure rule rejects; junior deposit through `execute` and withdrawal back with `totalAssets()` consistent; invariant `RangerVault.totalAssets() <= idle + oracle value of positions`; the agent cannot reach any other pool or recipient.

## Decided (Cashout, 8 Nov 01:55)
Ranger runs on HyperEVM's Uniswap v4 USDC/HYPE pool as an ERC-4626 strategy vault funded through the allowlist. Week one, not Monday. Four conditions, all binding:
1. Same two-pass independent review before it holds funds.
2. Single position type (one concentrated USDC/HYPE range, recentred by rule), no leverage, no borrowing, no second venue.
3. Cap 20% of junior at launch, raised to 30% only after two clean weekly settles. `maxDeposit` enforces the current cap on-chain; the raise is an owner call behind the 3-day timelock.
4. Junior exits never depend on Ranger liquidity: `reservedAssets` are kept in junior idle or Morpho/Felix, and the Rotator counts Ranger as illiquid for the pre-settle liquidity check (the keeper's maturity warning already excludes it).
