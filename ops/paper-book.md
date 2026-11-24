# Paper book, junior strategies

Marked 2026-11-24T17:53:48Z, 3.04 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.97 | $0.1502 (0.333%, 39.9%/yr) | -2.653% | -318.1% | $45.31 (0.323%) | in range -235830..-233810, 2 ranges, HYPE 60.80 |
| Nest ±20%, own rule | $45.23 | $0.0881 (0.196%, 23.5%/yr) | 0.508% | 61.0% | $45.14 (0.317%) | in range -237550..-233480, 1 range, HYPE 60.80 |
| Project X 0.05% ±10%, own rule | $44.38 | $0.6001 (1.334%, 159.9%/yr) | -1.376% | -165.0% | $44.99 (-0.015%) | in range -235570..-233550, 2 ranges, HYPE 60.63 |
| Project X 0.05% ±20%, own rule | $45.28 | $0.2904 (0.645%, 77.4%/yr) | 0.630% | 75.6% | $44.99 (-0.015%) | in range -237510..-233440, 1 range, HYPE 60.63 |
| Project X 0.3% ±10%, own rule | $44.59 | $0.7048 (1.566%, 187.8%/yr) | -0.902% | -108.2% | $45.10 (0.216%) | in range -235560..-233520, 2 ranges, HYPE 60.78 |
| HLP (Hypercore vault) | $45.01 | $0.0145 (0.032%, 3.9%/yr) | 0.032% | 3.9% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0154 (0.034%, 4.1%/yr) | 0.034% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0175 (0.039%, 4.7%/yr) | 0.039% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 4.00% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0173 (0.038%, 4.6%/yr) | 0.038% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 4.00% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
