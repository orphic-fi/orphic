## Thesis
Buys Elysium launches that have drawn a crowd, trails winners 25% below their peak, and cuts losers at a set loss or after four hours.

## Strategy
- **Wait for proof:** Buys a Montra launch over 60 minutes old with $35,000+ market cap, 80+ holders and $10,000+ volume, checked every minute; fees over 5% a side are skipped.
- **Rehearse the exit:** Simulates a buy and a full sell of the same size from a fresh wallet before buying, and skips any token that cannot be sold or loses more than its stated fee.
- **Three slots, three exits:** Each buy is a third of the starting HYPE, bought once per token, and sold 25% below its peak once up 30%, at -30%, or after 240 minutes.

## Exposure
- **Holds:** Launch tokens and HYPE — Up to three Elysium launch tokens at a time, each bought with a third of the book; the rest stays as native HYPE.
- **Venue:** Montra on Elysium — Each token trades in its own Uniswap v4 pool against native HYPE through Montra's LaunchRouter; the feed is Montra's public API.
- **Leverage:** None — Spot only, no borrowing.
- **Costs:** Token fees and slippage — Each launch sets its own trading fee, 1% to 5% per side, paid on the buy and on the sell; buys inside the first 60 minutes are never made; up to 10% slippage on thin pools.
- **Data:** Montra feed, Elysium RPC — api.montramarkets.xyz for market cap, holders, volume and launch time; rpc.elysium.kinetiq.xyz for the sell rehearsal and live marks.
- **On unwind:** Positions stay — Stop ends the loop and leaves any tokens held; sell them by asking Circuit.
