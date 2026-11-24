# Paper book, junior strategies

Marked 2026-11-24T14:10:52Z, 2.89 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.91 | $0.1414 (0.313%, 39.6%/yr) | -0.566% | -71.5% | $45.97 (1.793%) | in range -235830..-233810, 2 ranges, HYPE 62.58 |
| Nest ±20%, own rule | $45.82 | $0.0822 (0.183%, 23.1%/yr) | 1.824% | 230.5% | $45.81 (1.790%) | in range -237550..-233480, 1 range, HYPE 62.58 |
| Project X 0.05% ±10%, own rule | $45.38 | $0.5379 (1.195%, 151.0%/yr) | 0.834% | 105.4% | $45.68 (1.520%) | in range -235570..-233550, 2 ranges, HYPE 62.49 |
| Project X 0.05% ±20%, own rule | $45.90 | $0.2613 (0.581%, 73.4%/yr) | 1.993% | 251.8% | $45.68 (1.520%) | in range -237510..-233440, 1 range, HYPE 62.49 |
| Project X 0.3% ±10%, own rule | $45.48 | $0.6354 (1.412%, 178.4%/yr) | 1.070% | 135.2% | $45.72 (1.609%) | in range -235560..-233520, 2 ranges, HYPE 62.47 |
| HLP (Hypercore vault) | $45.02 | $0.0162 (0.036%, 4.6%/yr) | 0.036% | 4.6% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0146 (0.032%, 4.1%/yr) | 0.032% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0168 (0.037%, 4.7%/yr) | 0.037% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0166 (0.037%, 4.6%/yr) | 0.037% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
