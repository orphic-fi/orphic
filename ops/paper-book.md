# Paper book, junior strategies

Marked 2026-11-25T01:21:05Z, 3.35 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.26 | $0.1637 (0.363%, 39.4%/yr) | -4.214% | -458.6% | $44.73 (-0.966%) | in range -236420..-234400, 3 ranges, HYPE 59.24 |
| Nest ±20%, own rule | $44.64 | $0.0959 (0.213%, 23.2%/yr) | -0.805% | -87.6% | $44.56 (-0.973%) | in range -237550..-233480, 1 range, HYPE 59.24 |
| Project X 0.05% ±10%, own rule | $43.67 | $0.6500 (1.444%, 157.2%/yr) | -2.965% | -322.6% | $44.41 (-1.305%) | in range -236430..-234420, 3 ranges, HYPE 59.06 |
| Project X 0.05% ±20%, own rule | $44.69 | $0.3122 (0.694%, 75.5%/yr) | -0.693% | -75.4% | $44.41 (-1.305%) | in range -237510..-233440, 1 range, HYPE 59.06 |
| Project X 0.3% ±10%, own rule | $43.84 | $0.7574 (1.683%, 183.2%/yr) | -2.575% | -280.2% | $44.50 (-1.122%) | in range -236460..-234360, 3 ranges, HYPE 59.16 |
| HLP (Hypercore vault) | $45.01 | $0.0116 (0.026%, 2.8%/yr) | 0.026% | 2.8% | $45.00 (0.000%) | Hypercore reports 15.8% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0169 (0.038%, 4.1%/yr) | 0.038% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0192 (0.043%, 4.6%/yr) | 0.043% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 4.68% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0190 (0.042%, 4.6%/yr) | 0.042% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 4.68% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
