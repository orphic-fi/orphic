# Paper book, junior strategies

Marked 2026-11-24T16:40:38Z, 2.99 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.85 | $0.1477 (0.327%, 39.9%/yr) | -2.915% | -355.6% | $45.23 (0.156%) | in range -235830..-233810, 2 ranges, HYPE 60.60 |
| Nest ±20%, own rule | $45.15 | $0.0864 (0.192%, 23.4%/yr) | 0.341% | 41.6% | $45.07 (0.150%) | in range -237550..-233480, 1 range, HYPE 60.60 |
| Project X 0.05% ±10%, own rule | $44.24 | $0.5829 (1.295%, 158.0%/yr) | -1.680% | -204.9% | $44.92 (-0.172%) | in range -235570..-233550, 2 ranges, HYPE 60.44 |
| Project X 0.05% ±20%, own rule | $45.20 | $0.2817 (0.626%, 76.4%/yr) | 0.452% | 55.2% | $44.92 (-0.172%) | in range -237510..-233440, 1 range, HYPE 60.44 |
| Project X 0.3% ±10%, own rule | $44.39 | $0.6849 (1.522%, 185.6%/yr) | -1.347% | -164.3% | $44.99 (-0.022%) | in range -235560..-233520, 2 ranges, HYPE 60.49 |
| HLP (Hypercore vault) | $45.01 | $0.0137 (0.030%, 3.7%/yr) | 0.030% | 3.7% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0151 (0.034%, 4.1%/yr) | 0.034% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0173 (0.038%, 4.7%/yr) | 0.038% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0171 (0.038%, 4.6%/yr) | 0.038% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
