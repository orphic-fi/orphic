# Paper book, junior strategies

Marked 2026-11-24T20:38:30Z, 3.16 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.34 | $0.1571 (0.348%, 40.2%/yr) | -4.049% | -468.0% | $44.80 (-0.803%) | in range -236420..-234400, 3 ranges, HYPE 59.44 |
| Nest ±20%, own rule | $44.71 | $0.0925 (0.206%, 23.8%/yr) | -0.636% | -73.5% | $44.64 (-0.810%) | in range -237550..-233480, 1 range, HYPE 59.44 |
| Project X 0.05% ±10%, own rule | $43.70 | $0.6231 (1.385%, 160.0%/yr) | -2.891% | -334.2% | $44.47 (-1.188%) | in range -236430..-234420, 3 ranges, HYPE 59.21 |
| Project X 0.05% ±20%, own rule | $44.73 | $0.2993 (0.665%, 76.9%/yr) | -0.590% | -68.2% | $44.47 (-1.188%) | in range -237510..-233440, 1 range, HYPE 59.21 |
| Project X 0.3% ±10%, own rule | $43.87 | $0.7237 (1.608%, 185.9%/yr) | -2.500% | -289.0% | $44.56 (-0.989%) | in range -236460..-234360, 3 ranges, HYPE 59.32 |
| HLP (Hypercore vault) | $45.01 | $0.0124 (0.028%, 3.2%/yr) | 0.028% | 3.2% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0160 (0.035%, 4.1%/yr) | 0.035% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0181 (0.040%, 4.6%/yr) | 0.040% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 4.56% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0179 (0.040%, 4.6%/yr) | 0.040% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 4.56% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
