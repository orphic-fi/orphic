# Paper book, junior strategies

Marked 2026-11-24T04:30:08Z, 2.49 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.50 | $0.1273 (0.282%, 41.4%/yr) | 0.752% | 110.5% | $46.46 (2.862%) | in range -235830..-233810, 2 ranges, HYPE 63.87 |
| Nest ±20%, own rule | $46.19 | $0.0727 (0.162%, 23.7%/yr) | 2.646% | 388.6% | $46.29 (2.860%) | in range -237550..-233480, 1 range, HYPE 63.87 |
| Project X 0.05% ±10%, own rule | $45.92 | $0.4591 (1.020%, 149.8%/yr) | 2.050% | 301.1% | $46.17 (2.598%) | in range -235570..-233550, 2 ranges, HYPE 63.80 |
| Project X 0.05% ±20%, own rule | $46.25 | $0.2236 (0.497%, 73.0%/yr) | 2.784% | 408.9% | $46.17 (2.598%) | in range -237510..-233440, 1 range, HYPE 63.80 |
| Project X 0.3% ±10%, own rule | $45.96 | $0.5450 (1.211%, 177.9%/yr) | 2.141% | 314.3% | $46.16 (2.580%) | in range -235560..-233520, 2 ranges, HYPE 63.64 |
| HLP (Hypercore vault) | $45.01 | $0.0134 (0.030%, 4.4%/yr) | 0.030% | 4.4% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0126 (0.028%, 4.1%/yr) | 0.028% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0148 (0.033%, 4.8%/yr) | 0.033% | 4.8% | $45.00 (0.000%) | liquidity index; supply APY now 3.94% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0146 (0.032%, 4.8%/yr) | 0.032% | 4.8% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.94% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
