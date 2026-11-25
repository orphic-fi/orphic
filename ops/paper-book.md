# Paper book, junior strategies

Marked 2026-11-25T00:41:48Z, 3.33 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.30 | $0.1629 (0.361%, 39.6%/yr) | -4.118% | -451.8% | $44.77 (-0.878%) | in range -236420..-234400, 3 ranges, HYPE 59.35 |
| Nest ±20%, own rule | $44.68 | $0.0955 (0.212%, 23.3%/yr) | -0.710% | -77.9% | $44.60 (-0.885%) | in range -237550..-233480, 1 range, HYPE 59.35 |
| Project X 0.05% ±10%, own rule | $43.73 | $0.6453 (1.434%, 157.3%/yr) | -2.823% | -309.7% | $44.47 (-1.171%) | in range -236430..-234420, 3 ranges, HYPE 59.23 |
| Project X 0.05% ±20%, own rule | $44.75 | $0.3103 (0.689%, 75.6%/yr) | -0.547% | -60.0% | $44.47 (-1.171%) | in range -237510..-233440, 1 range, HYPE 59.23 |
| Project X 0.3% ±10%, own rule | $43.91 | $0.7543 (1.676%, 183.9%/yr) | -2.429% | -266.5% | $44.56 (-0.985%) | in range -236460..-234360, 3 ranges, HYPE 59.33 |
| HLP (Hypercore vault) | $45.01 | $0.0116 (0.026%, 2.8%/yr) | 0.026% | 2.8% | $45.00 (0.000%) | Hypercore reports 15.8% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0168 (0.037%, 4.1%/yr) | 0.037% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0190 (0.042%, 4.6%/yr) | 0.042% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 4.68% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0188 (0.042%, 4.6%/yr) | 0.042% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 4.68% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
