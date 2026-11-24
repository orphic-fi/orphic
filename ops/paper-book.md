# Paper book, junior strategies

Marked 2026-11-24T15:54:54Z, 2.96 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.31 | $0.1453 (0.322%, 39.7%/yr) | -1.886% | -232.5% | $45.54 (0.842%) | in range -235830..-233810, 2 ranges, HYPE 61.43 |
| Nest ±20%, own rule | $45.45 | $0.0848 (0.188%, 23.2%/yr) | 0.993% | 122.4% | $45.38 (0.837%) | in range -237550..-233480, 1 range, HYPE 61.43 |
| Project X 0.05% ±10%, own rule | $44.75 | $0.5697 (1.266%, 156.1%/yr) | -0.547% | -67.4% | $45.24 (0.538%) | in range -235570..-233550, 2 ranges, HYPE 61.30 |
| Project X 0.05% ±20%, own rule | $45.51 | $0.2760 (0.613%, 75.6%/yr) | 1.137% | 140.2% | $45.24 (0.538%) | in range -237510..-233440, 1 range, HYPE 61.30 |
| Project X 0.3% ±10%, own rule | $44.84 | $0.6673 (1.483%, 182.8%/yr) | -0.365% | -45.0% | $45.27 (0.599%) | in range -235560..-233520, 2 ranges, HYPE 61.25 |
| HLP (Hypercore vault) | $45.01 | $0.0137 (0.030%, 3.7%/yr) | 0.030% | 3.7% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0149 (0.033%, 4.1%/yr) | 0.033% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0171 (0.038%, 4.7%/yr) | 0.038% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0169 (0.038%, 4.6%/yr) | 0.038% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
