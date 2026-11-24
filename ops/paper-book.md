# Paper book, junior strategies

Marked 2026-11-24T22:22:48Z, 3.23 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.57 | $0.1605 (0.355%, 40.1%/yr) | -3.531% | -399.0% | $45.02 (-0.317%) | in range -236420..-234400, 3 ranges, HYPE 60.02 |
| Nest ±20%, own rule | $44.95 | $0.0942 (0.209%, 23.7%/yr) | -0.119% | -13.4% | $44.85 (-0.323%) | in range -237550..-233480, 1 range, HYPE 60.02 |
| Project X 0.05% ±10%, own rule | $43.97 | $0.6351 (1.411%, 159.5%/yr) | -2.284% | -258.0% | $44.71 (-0.643%) | in range -236430..-234420, 3 ranges, HYPE 59.87 |
| Project X 0.05% ±20%, own rule | $45.01 | $0.3068 (0.682%, 77.0%/yr) | 0.019% | 2.1% | $44.71 (-0.643%) | in range -237510..-233440, 1 range, HYPE 59.87 |
| Project X 0.3% ±10%, own rule | $44.16 | $0.7381 (1.640%, 185.3%/yr) | -1.863% | -210.5% | $44.81 (-0.414%) | in range -236460..-234360, 3 ranges, HYPE 60.02 |
| HLP (Hypercore vault) | $45.01 | $0.0121 (0.027%, 3.0%/yr) | 0.027% | 3.0% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0163 (0.036%, 4.1%/yr) | 0.036% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0185 (0.041%, 4.6%/yr) | 0.041% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 4.56% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0183 (0.041%, 4.6%/yr) | 0.041% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 4.56% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
