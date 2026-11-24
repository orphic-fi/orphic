# Paper book, junior strategies

Marked 2026-11-24T11:56:40Z, 2.80 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.19 | $0.1365 (0.302%, 39.5%/yr) | 0.052% | 6.8% | $46.19 (2.277%) | in range -235830..-233810, 2 ranges, HYPE 63.16 |
| Nest ±20%, own rule | $45.99 | $0.0789 (0.175%, 22.9%/yr) | 2.211% | 288.6% | $46.02 (2.274%) | in range -237550..-233480, 1 range, HYPE 63.16 |
| Project X 0.05% ±10%, own rule | $45.67 | $0.5116 (1.137%, 148.4%/yr) | 1.492% | 194.8% | $45.92 (2.055%) | in range -235570..-233550, 2 ranges, HYPE 63.14 |
| Project X 0.05% ±20%, own rule | $46.09 | $0.2488 (0.553%, 72.2%/yr) | 2.412% | 315.0% | $45.92 (2.055%) | in range -237510..-233440, 1 range, HYPE 63.14 |
| Project X 0.3% ±10%, own rule | $45.72 | $0.6113 (1.359%, 177.4%/yr) | 1.598% | 208.7% | $45.92 (2.037%) | in range -235560..-233520, 2 ranges, HYPE 62.99 |
| HLP (Hypercore vault) | $45.01 | $0.0137 (0.031%, 4.0%/yr) | 0.031% | 4.0% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0141 (0.031%, 4.1%/yr) | 0.031% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0163 (0.036%, 4.7%/yr) | 0.036% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.93% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0161 (0.036%, 4.7%/yr) | 0.036% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.93% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
