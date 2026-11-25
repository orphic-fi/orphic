## Thesis
Buys Elysium launches after they have proved out and sells each at a set profit, a set loss, or after an hour; five snipes a book.

## Strategy
- **Wait for proof:** Buys a Montra launch over 30 minutes old with $25,000+ market cap, 50+ holders and $5,000+ volume, checked every minute; fees over 5% a side are skipped.
- **Rehearse the exit:** Simulates a buy and a full sell of the same size from a fresh wallet before buying, and skips any token that cannot be sold or loses more than its stated fee.
- **Five slots, three exits:** Each buy is a fifth of the starting HYPE, bought once per token, and sold at +30%, at -30%, or after 60 minutes, on what a sell returns now.

## Exposure
- **Holds:** Launch tokens and HYPE — Up to five Elysium launch tokens at a time, each bought with a fifth of the book; the rest stays as native HYPE.
- **Venue:** Montra on Elysium — Each token trades in its own Uniswap v4 pool against native HYPE through Montra's LaunchRouter; the feed is Montra's public API.
- **Leverage:** None — Spot only, no borrowing.
- **Costs:** Token fees and slippage — Each launch sets its own trading fee, 1% to 5% per side, paid on the buy and on the sell; buys inside the first 30 minutes pay up to 99%, so they are never made; up to 10% slippage on thin pools.
- **Data:** Montra feed, Elysium RPC — api.montramarkets.xyz for market cap, holders, volume and launch time; rpc.elysium.kinetiq.xyz for the sell rehearsal and live marks.
- **On unwind:** Positions stay — Stop ends the loop and leaves any tokens held; sell them by asking Circuit.
