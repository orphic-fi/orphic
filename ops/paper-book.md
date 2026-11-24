# Paper book, junior strategies

Marked 2026-11-24T13:43:27Z, 2.87 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.87 | $0.1402 (0.310%, 39.5%/yr) | -0.660% | -83.9% | $45.94 (1.725%) | in range -235830..-233810, 2 ranges, HYPE 62.50 |
| Nest ±20%, own rule | $45.79 | $0.0814 (0.181%, 23.0%/yr) | 1.765% | 224.5% | $45.77 (1.721%) | in range -237550..-233480, 1 range, HYPE 62.50 |
| Project X 0.05% ±10%, own rule | $45.31 | $0.5334 (1.185%, 150.8%/yr) | 0.689% | 87.6% | $45.64 (1.423%) | in range -235570..-233550, 2 ranges, HYPE 62.37 |
| Project X 0.05% ±20%, own rule | $45.86 | $0.2590 (0.575%, 73.2%/yr) | 1.904% | 242.2% | $45.64 (1.423%) | in range -237510..-233440, 1 range, HYPE 62.37 |
| Project X 0.3% ±10%, own rule | $45.40 | $0.6292 (1.398%, 177.8%/yr) | 0.889% | 113.1% | $45.67 (1.490%) | in range -235560..-233520, 2 ranges, HYPE 62.32 |
| HLP (Hypercore vault) | $45.02 | $0.0161 (0.036%, 4.6%/yr) | 0.036% | 4.6% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0145 (0.032%, 4.1%/yr) | 0.032% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0166 (0.037%, 4.7%/yr) | 0.037% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0164 (0.036%, 4.6%/yr) | 0.036% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
