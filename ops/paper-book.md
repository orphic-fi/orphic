# Paper book, junior strategies

Marked 2026-11-24T03:31:59Z, 2.45 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.04 | $0.1257 (0.278%, 41.5%/yr) | -0.266% | -39.7% | $46.09 (2.047%) | in range -235830..-233810, 2 ranges, HYPE 62.89 |
| Nest ±20%, own rule | $45.90 | $0.0716 (0.159%, 23.8%/yr) | 2.010% | 300.1% | $45.92 (2.044%) | in range -237550..-233480, 1 range, HYPE 62.89 |
| Project X 0.05% ±10%, own rule | $45.45 | $0.4523 (1.005%, 150.0%/yr) | 1.002% | 149.6% | $45.80 (1.783%) | in range -235570..-233550, 2 ranges, HYPE 62.81 |
| Project X 0.05% ±20%, own rule | $45.96 | $0.2194 (0.487%, 72.8%/yr) | 2.123% | 316.9% | $45.80 (1.783%) | in range -237510..-233440, 1 range, HYPE 62.81 |
| Project X 0.3% ±10%, own rule | $45.50 | $0.5329 (1.184%, 176.8%/yr) | 1.112% | 166.0% | $45.81 (1.804%) | in range -235560..-233520, 2 ranges, HYPE 62.70 |
| HLP (Hypercore vault) | $45.01 | $0.0132 (0.029%, 4.4%/yr) | 0.029% | 4.4% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0125 (0.028%, 4.1%/yr) | 0.028% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0146 (0.033%, 4.9%/yr) | 0.033% | 4.9% | $45.00 (0.000%) | liquidity index; supply APY now 3.94% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0144 (0.032%, 4.8%/yr) | 0.032% | 4.8% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.05% realised 24h, HyperLend 3.94% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
