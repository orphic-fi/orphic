## Thesis
Holds spot HYPE and an equal HYPE perp short so price cancels out, and earns the funding longs pay shorts while it is worth it.

## Strategy
- **Enter on funding:** When trailing 8h funding annualises above the bar, buys spot HYPE with 60% of the book and shorts the same size at 2x isolated.
- **Stay hedged:** Re-hedges when spot and short differ by over 3%, and cuts both legs by a quarter when the mark is within 15% of liquidation.
- **Exit on negative funding:** Unwinds both legs after a full day of negative funding, then waits flat for the next entry.

## Exposure
- **Holds:** HYPE spot and HYPE short — Equal units long spot and short perp on HyperCore, plus USDC margin and buffer; net price exposure near zero.
- **Venue:** Hyperliquid — Spot HYPE/USDC and the HYPE perp in one HyperCore account.
- **Leverage:** 2x on the short — Isolated margin; the spot leg is unlevered, so the book is about 1.5x gross.
- **Costs:** Fees and slippage — Two market orders in and two out, about a quarter percent per round trip; a basis gap between spot and perp at entry.
- **Data:** Circuit funding data — agent.data.fundingRates for HYPE, settled hours only; holdings from allocation.
- **On unwind:** Two orders — Stop leaves the legs open; Circuit's unwind closes the short and sells the spot.
