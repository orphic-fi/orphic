# Junior backtest

Every swap in the Project X $HYPE/USDC pools from 2026-06-03 to 2026-11-25 (175 days), replayed for 120 strategies with $1000 each, valued in USDC. Strategies are ranked on the choose window (2026-06-03 to 2026-09-28) and judged on the check window (2026-09-28 to 2026-11-25), which the ranking never saw. A year figures scale a short window up and are estimates, not yields anyone should expect.

$HYPE went from $69.73 to $91.69 in the choose window and to $59.91 by the end.

## USDC lending, the bar to beat

| Strategy | Choose window, a year | Check window, a year | Check worst drop | Whole window | Ranges | LP fees / costs | Hedge |
|---|---|---|---|---|---|---|---|
| Felix USDC | 6.3% | 4.8% | 0.0% | 2.7% | | | |
| HLP, Hypercore (rough: two-week points) | 2.1% | 11.2% | | | | | |
| HyperLend USDC | 6.5% | 5.5% | 0.0% | 2.9% | | | |

## Hedged (no $HYPE price bet), best 15 by the choose window

| Strategy | Choose window, a year | Check window, a year | Check worst drop | Whole window | Ranges | LP fees / costs | Hedge |
|---|---|---|---|---|---|---|---|
| Project X 0.3% ±20%, recentre near edge (min 6h), hedged | 1.7% | 1.9% | -0.6% | 0.8% | 9 | $285 / $22 / funding $22 | min margin 23% |
| Project X 0.3% ±20%, recentre near edge (min 24h), hedged | 1.7% | 1.9% | -0.6% | 0.8% | 9 | $285 / $22 / funding $22 | min margin 23% |
| Project X 0.3% ±20%, recentre when out (min 6h), hedged | 1.1% | -3.6% | -1.0% | -0.2% | 12 | $281 / $26 / funding $23 | min margin 24% |
| Project X 0.3% ±20%, recentre when out (min 24h), hedged | 1.1% | -3.6% | -1.0% | -0.2% | 12 | $281 / $26 / funding $23 | min margin 24% |
| Project X 0.3% ±10%, recentre when out (min 24h), hedged | -9.1% | -11.4% | -2.3% | -4.9% | 31 | $573 / $75 / funding $20 | min margin 24% |
| Project X 0.3% ±10%, recentre near edge (min 24h), hedged | -9.7% | -0.9% | -1.1% | -3.4% | 35 | $548 / $72 / funding $21 | min margin 24% |
| Project X 0.3% ±10%, recentre near edge (min 6h), hedged | -10.7% | -9.8% | -2.5% | -5.1% | 39 | $577 / $77 / funding $22 | min margin 25% |
| Project X 0.3% ±10%, recentre when out (min 6h), hedged | -12.6% | -0.4% | -1.2% | -4.3% | 31 | $568 / $74 / funding $22 | min margin 24% |
| Project X 0.05% ±20%, recentre near edge (min 6h), hedged | -14.6% | -23.7% | -4.2% | -8.9% | 12 | $224 / $18 / funding $21 | min margin 21% |
| Project X 0.05% ±20%, recentre near edge (min 24h), hedged | -14.6% | -23.7% | -4.2% | -8.9% | 12 | $224 / $18 / funding $21 | min margin 21% |
| Project X 0.05% ±20%, recentre when out (min 6h), hedged | -14.8% | -16.7% | -3.0% | -7.7% | 12 | $226 / $19 / funding $21 | min margin 23% |
| Project X 0.05% ±20%, recentre when out (min 24h), hedged | -14.8% | -16.7% | -3.0% | -7.7% | 12 | $226 / $19 / funding $21 | min margin 23% |
| Project X 0.3% ±5%, recentre when out (min 6h), hedged | -32.7% | -31.9% | -6.2% | -17.1% | 97 | $1025 / $202 / funding $20 | min margin 19% |
| Project X 0.05% ±10%, recentre near edge (min 24h), hedged | -33.4% | -17.0% | -3.0% | -14.8% | 37 | $428 / $48 / funding $19 | min margin 24% |
| Project X 0.3% ±5%, recentre when out (min 24h), hedged | -34.1% | -18.7% | -3.8% | -15.3% | 69 | $887 / $157 / funding $18 | min margin 18% |

## Unhedged (carries the $HYPE price), best 10 by the choose window

| Strategy | Choose window, a year | Check window, a year | Check worst drop | Whole window | Ranges | LP fees / costs | Hedge |
|---|---|---|---|---|---|---|---|
| Project X 0.3% ±20%, never recentre | 128.1% | -49.9% | -11.6% | 16.7% | 1 | $266 / $0 |  |
| Project X 0.3% ±5%, never recentre | 106.4% | -43.8% | -9.7% | 15.1% | 1 | $281 / $0 |  |
| Project X 0.3% ±10%, never recentre | 105.4% | -46.3% | -9.8% | 14.1% | 1 | $258 / $0 |  |
| Project X 0.05% ±20%, never recentre | 100.2% | -51.5% | -12.0% | 11.4% | 1 | $215 / $0 |  |
| Project X 0.3% ±40%, never recentre | 96.7% | -60.0% | -14.7% | 7.4% | 1 | $157 / $0 |  |
| Project X 0.3% ±40%, recentre near edge (min 6h) | 88.9% | -81.3% | -24.9% | -6.1% | 3 | $187 / $3 |  |
| Project X 0.3% ±40%, recentre near edge (min 24h) | 88.9% | -81.3% | -24.9% | -6.1% | 3 | $187 / $3 |  |
| Project X 0.3% ±40%, recentre when out (min 6h) | 86.3% | -82.5% | -25.7% | -7.4% | 3 | $188 / $3 |  |
| Project X 0.3% ±40%, recentre when out (min 24h) | 86.3% | -82.5% | -25.7% | -7.4% | 3 | $188 / $3 |  |
| Project X 0.05% ±40%, never recentre | 83.0% | -61.5% | -15.1% | 4.3% | 1 | $128 / $0 |  |

Hedged lines the hedge would have liquidated: 28 of 60.

Method: fees per swap at our share of the pool's liquidity while in range (the pool's own formula). Each recentre closes at the pool price, pays the pool fee plus 0.05% slippage on the swap back to 50/50 and $0.05 gas. Hedged lines keep 1/6 as Hypercore margin for a $HYPE short sized to the LP's $HYPE, resized hourly when 5% off at the 0.045% taker fee, with Hypercore's real hourly funding; liquidated if margin falls under 5% of the short. Not charged: basis between Hypercore and the pool, and moving USDC between HyperEVM and Hypercore. Our own liquidity is assumed not to change other traders' behaviour. Source: keeper/scripts/btSim.mjs.
