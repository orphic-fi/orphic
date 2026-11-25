# Paper book, junior strategies

Marked 2026-11-25T02:21:22Z, 3.40 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.02 | $0.1651 (0.365%, 39.3%/yr) | -4.744% | -509.9% | $44.52 (-1.422%) | in range -236420..-234400, 3 ranges, HYPE 58.69 |
| Nest ±20%, own rule | $44.41 | $0.0966 (0.215%, 23.1%/yr) | -1.313% | -141.1% | $44.36 (-1.430%) | in range -237550..-233480, 1 range, HYPE 58.69 |
| Project X 0.05% ±10%, own rule | $43.48 | $0.6585 (1.463%, 157.3%/yr) | -3.370% | -362.2% | $44.25 (-1.665%) | in range -236430..-234420, 3 ranges, HYPE 58.63 |
| Project X 0.05% ±20%, own rule | $44.51 | $0.3154 (0.701%, 75.3%/yr) | -1.097% | -117.9% | $44.25 (-1.665%) | in range -237510..-233440, 1 range, HYPE 58.63 |
| Project X 0.3% ±10%, own rule | $43.65 | $0.7630 (1.696%, 182.2%/yr) | -3.009% | -323.4% | $44.32 (-1.503%) | in range -236460..-234360, 3 ranges, HYPE 58.70 |
| HLP (Hypercore vault) | $45.01 | $0.0118 (0.026%, 2.8%/yr) | 0.026% | 2.8% | $45.00 (0.000%) | Hypercore reports 15.8% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0171 (0.038%, 4.1%/yr) | 0.038% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0194 (0.043%, 4.6%/yr) | 0.043% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0192 (0.043%, 4.6%/yr) | 0.043% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
