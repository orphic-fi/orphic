# Paper book, junior strategies

Marked 2026-11-24T20:53:44Z, 3.17 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.61 | $0.1582 (0.350%, 40.3%/yr) | -3.447% | -397.1% | $45.06 (-0.227%) | in range -236420..-234400, 3 ranges, HYPE 60.13 |
| Nest ±20%, own rule | $44.99 | $0.0931 (0.207%, 23.8%/yr) | -0.029% | -3.3% | $44.90 (-0.233%) | in range -237550..-233480, 1 range, HYPE 60.13 |
| Project X 0.05% ±10%, own rule | $44.00 | $0.6259 (1.391%, 160.2%/yr) | -2.222% | -255.9% | $44.75 (-0.562%) | in range -236430..-234420, 3 ranges, HYPE 59.97 |
| Project X 0.05% ±20%, own rule | $45.04 | $0.3025 (0.672%, 77.4%/yr) | 0.095% | 11.0% | $44.75 (-0.562%) | in range -237510..-233440, 1 range, HYPE 59.97 |
| Project X 0.3% ±10%, own rule | $44.09 | $0.7294 (1.621%, 186.7%/yr) | -2.027% | -233.5% | $44.75 (-0.557%) | in range -236460..-234360, 3 ranges, HYPE 59.85 |
| HLP (Hypercore vault) | $45.01 | $0.0127 (0.028%, 3.3%/yr) | 0.028% | 3.3% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0160 (0.036%, 4.1%/yr) | 0.036% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0181 (0.040%, 4.6%/yr) | 0.040% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 4.56% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0179 (0.040%, 4.6%/yr) | 0.040% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 4.56% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
