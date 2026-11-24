# Paper book, junior strategies

Marked 2026-11-24T17:11:08Z, 3.01 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.17 | $0.1490 (0.330%, 40.0%/yr) | -2.197% | -266.0% | $45.45 (0.626%) | in range -235830..-233810, 2 ranges, HYPE 61.17 |
| Nest ±20%, own rule | $45.36 | $0.0873 (0.194%, 23.5%/yr) | 0.797% | 96.5% | $45.28 (0.621%) | in range -237550..-233480, 1 range, HYPE 61.17 |
| Project X 0.05% ±10%, own rule | $44.68 | $0.5928 (1.317%, 159.5%/yr) | -0.715% | -86.6% | $45.18 (0.399%) | in range -235570..-233550, 2 ranges, HYPE 61.13 |
| Project X 0.05% ±20%, own rule | $45.46 | $0.2872 (0.638%, 77.3%/yr) | 1.030% | 124.7% | $45.18 (0.399%) | in range -237510..-233440, 1 range, HYPE 61.13 |
| Project X 0.3% ±10%, own rule | $44.70 | $0.6942 (1.543%, 186.8%/yr) | -0.657% | -79.6% | $45.17 (0.380%) | in range -235560..-233520, 2 ranges, HYPE 60.98 |
| HLP (Hypercore vault) | $45.01 | $0.0141 (0.031%, 3.8%/yr) | 0.031% | 3.8% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0152 (0.034%, 4.1%/yr) | 0.034% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0174 (0.039%, 4.7%/yr) | 0.039% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0172 (0.038%, 4.6%/yr) | 0.038% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.92% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
