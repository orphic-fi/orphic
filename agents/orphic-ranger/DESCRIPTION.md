## Thesis
Supplies one range of liquidity on Nest's HYPE/USDC pool on Elysium, earns the swap fees, and recentres when the price walks out.

## Strategy
- **One range:** Swaps half the USDC to HYPE, then supplies both 10% either side of the current price (adjustable) with 1% price protection, every 15 minutes checked.
- **Recentre:** Closes and reopens the range around the current price when the price leaves it or it is 72 hours old, never sooner than 6 hours after it was opened.
- **Kill switch:** Closes the range and swaps all to USDC when HYPE moves over 15% in 24 hours (adjustable); reopens once the move is back inside the limit.

## Exposure
- **Holds:** HYPE and USDC — Inside one Uniswap v4 position on Elysium, with some of each in the wallet between ranges; long the pair and short volatility, not market neutral.
- **Venue:** Nest on Elysium — The canonical Uniswap v4 HYPE/USDC pool with Nest's hook setting the fee; opens, adds and removes go through Circuit's liquidity action.
- **Leverage:** None — Spot only, no borrowing.
- **Costs:** Swap fees and gas — Nest's dynamic fee on the balancing swaps, Elysium gas on every open and close, and 1% slippage; out of range earns nothing until recentred.
- **Data:** Circuit prices — HYPE's hourly bars on Elysium for the 24-hour move; the position's own range from the allocation.
- **On unwind:** Range stays — Stop ends the schedule and leaves the position open; Circuit offers one reviewed removal that returns both tokens to the wallet.
