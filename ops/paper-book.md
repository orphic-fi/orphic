# Paper book, junior strategies

Marked 2026-11-24T21:39:32Z, 3.20 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.54 | $0.1593 (0.353%, 40.2%/yr) | -3.597% | -410.2% | $44.99 (-0.379%) | in range -236420..-234400, 3 ranges, HYPE 59.95 |
| Nest ±20%, own rule | $44.92 | $0.0936 (0.208%, 23.7%/yr) | -0.185% | -21.0% | $44.83 (-0.386%) | in range -237550..-233480, 1 range, HYPE 59.95 |
| Project X 0.05% ±10%, own rule | $43.92 | $0.6320 (1.405%, 160.2%/yr) | -2.391% | -272.7% | $44.67 (-0.742%) | in range -236430..-234420, 3 ranges, HYPE 59.75 |
| Project X 0.05% ±20%, own rule | $44.96 | $0.3050 (0.678%, 77.3%/yr) | -0.090% | -10.3% | $44.67 (-0.742%) | in range -237510..-233440, 1 range, HYPE 59.75 |
| Project X 0.3% ±10%, own rule | $44.11 | $0.7345 (1.632%, 186.2%/yr) | -1.985% | -226.4% | $44.76 (-0.527%) | in range -236460..-234360, 3 ranges, HYPE 59.88 |
| HLP (Hypercore vault) | $45.01 | $0.0120 (0.027%, 3.0%/yr) | 0.027% | 3.0% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0162 (0.036%, 4.1%/yr) | 0.036% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0183 (0.041%, 4.6%/yr) | 0.041% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 4.56% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0181 (0.040%, 4.6%/yr) | 0.040% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 4.56% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
