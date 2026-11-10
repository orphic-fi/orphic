## Thesis
Buys new Elysium launches only after they have proved out, and sells each one at a set profit or a set loss. Five snipes per book, nonstop.

## Strategy
- **Wait for proof:** Buys a Montra launch once it is over 30 minutes old with a market cap of $25,000 or more, 50 or more holders and $5,000 or more of volume, checked every minute.
- **Rehearse the exit:** Simulates a buy and a full sell of the same size from a fresh wallet before buying, and skips any token that cannot be sold or loses more than its stated fee.
- **Five slots, two exits:** Each buy is a fifth of the starting HYPE, a token is bought at most once, and every position is sold at +30% or at -70% on what a sell returns now.

## Exposure
- **Holds:** Launch tokens and HYPE — Up to five Elysium launch tokens at a time, each bought with a fifth of the book; the rest stays as native HYPE.
- **Venue:** Montra on Elysium — Each token trades in its own Uniswap v4 pool against native HYPE through Montra's LaunchRouter; the feed is Montra's public API.
- **Leverage:** None — Spot only, no borrowing.
- **Costs:** Token fees and slippage — Each launch sets its own trading fee, 1% to 5% per side, paid on the buy and on the sell; buys inside the first 30 minutes pay up to 99%, so they are never made; up to 10% slippage on thin pools.
- **Data:** Montra feed, Elysium RPC — api.montramarkets.xyz for market cap, holders, volume and launch time; rpc.elysium.kinetiq.xyz for the sell rehearsal and live marks.
- **On unwind:** Positions stay — Stop ends the loop and leaves any tokens held; sell them by asking Circuit.
