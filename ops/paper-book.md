# Paper book, junior strategies

Marked 2026-11-24T16:25:24Z, 2.98 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.14 | $0.1473 (0.326%, 39.9%/yr) | -2.266% | -277.3% | $45.43 (0.582%) | in range -235830..-233810, 2 ranges, HYPE 61.11 |
| Nest ±20%, own rule | $45.34 | $0.0861 (0.191%, 23.4%/yr) | 0.753% | 92.2% | $45.26 (0.577%) | in range -237550..-233480, 1 range, HYPE 61.11 |
| Project X 0.05% ±10%, own rule | $44.64 | $0.5805 (1.290%, 157.9%/yr) | -0.810% | -99.1% | $45.16 (0.357%) | in range -235570..-233550, 2 ranges, HYPE 61.08 |
| Project X 0.05% ±20%, own rule | $45.44 | $0.2811 (0.625%, 76.5%/yr) | 0.976% | 119.4% | $45.16 (0.357%) | in range -237510..-233440, 1 range, HYPE 61.08 |
| Project X 0.3% ±10%, own rule | $44.65 | $0.6817 (1.515%, 185.4%/yr) | -0.777% | -95.0% | $45.15 (0.324%) | in range -235560..-233520, 2 ranges, HYPE 60.91 |
| HLP (Hypercore vault) | $45.01 | $0.0139 (0.031%, 3.8%/yr) | 0.031% | 3.8% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0151 (0.033%, 4.1%/yr) | 0.033% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0172 (0.038%, 4.7%/yr) | 0.038% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0170 (0.038%, 4.6%/yr) | 0.038% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
