# Paper book, junior strategies

Marked 2026-11-24T19:25:16Z, 3.11 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.85 | $0.1556 (0.344%, 40.5%/yr) | -2.901% | -340.7% | $45.23 (0.155%) | in range -235830..-233810, 2 ranges, HYPE 60.59 |
| Nest ±20%, own rule | $45.16 | $0.0917 (0.204%, 23.9%/yr) | 0.352% | 41.3% | $45.07 (0.149%) | in range -237550..-233480, 1 range, HYPE 60.59 |
| Project X 0.05% ±10%, own rule | $44.28 | $0.6134 (1.363%, 160.1%/yr) | -1.607% | -188.8% | $44.92 (-0.169%) | in range -235570..-233550, 2 ranges, HYPE 60.44 |
| Project X 0.05% ±20%, own rule | $45.22 | $0.2968 (0.660%, 77.5%/yr) | 0.489% | 57.4% | $44.92 (-0.169%) | in range -237510..-233440, 1 range, HYPE 60.44 |
| Project X 0.3% ±10%, own rule | $44.40 | $0.7133 (1.585%, 186.2%/yr) | -1.325% | -155.6% | $44.98 (-0.046%) | in range -235560..-233520, 2 ranges, HYPE 60.46 |
| HLP (Hypercore vault) | $45.01 | $0.0125 (0.028%, 3.3%/yr) | 0.028% | 3.3% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0157 (0.035%, 4.1%/yr) | 0.035% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0178 (0.040%, 4.6%/yr) | 0.040% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0176 (0.039%, 4.6%/yr) | 0.039% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
