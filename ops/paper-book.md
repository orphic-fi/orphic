# Paper book, junior strategies

Marked 2026-11-25T01:50:51Z, 3.37 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.12 | $0.1643 (0.364%, 39.3%/yr) | -4.530% | -490.0% | $44.60 (-1.241%) | in range -236420..-234400, 3 ranges, HYPE 58.91 |
| Nest ±20%, own rule | $44.50 | $0.0962 (0.214%, 23.1%/yr) | -1.110% | -120.1% | $44.44 (-1.249%) | in range -237550..-233480, 1 range, HYPE 58.91 |
| Project X 0.05% ±10%, own rule | $43.56 | $0.6537 (1.453%, 157.1%/yr) | -3.199% | -346.0% | $44.32 (-1.514%) | in range -236430..-234420, 3 ranges, HYPE 58.81 |
| Project X 0.05% ±20%, own rule | $44.58 | $0.3134 (0.697%, 75.3%/yr) | -0.927% | -100.3% | $44.32 (-1.514%) | in range -237510..-233440, 1 range, HYPE 58.81 |
| Project X 0.3% ±10%, own rule | $43.75 | $0.7595 (1.688%, 182.5%/yr) | -2.774% | -300.0% | $44.42 (-1.299%) | in range -236460..-234360, 3 ranges, HYPE 58.95 |
| HLP (Hypercore vault) | $45.01 | $0.0117 (0.026%, 2.8%/yr) | 0.026% | 2.8% | $45.00 (0.000%) | Hypercore reports 15.8% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0170 (0.038%, 4.1%/yr) | 0.038% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0193 (0.043%, 4.6%/yr) | 0.043% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 4.65% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0191 (0.042%, 4.6%/yr) | 0.042% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 4.65% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
