# Paper book, junior strategies

Marked 2026-11-24T16:10:09Z, 2.97 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.09 | $0.1461 (0.324%, 39.7%/yr) | -2.374% | -291.5% | $45.40 (0.512%) | in range -235830..-233810, 2 ranges, HYPE 61.03 |
| Nest ±20%, own rule | $45.31 | $0.0853 (0.190%, 23.3%/yr) | 0.685% | 84.1% | $45.23 (0.507%) | in range -237550..-233480, 1 range, HYPE 61.03 |
| Project X 0.05% ±10%, own rule | $44.51 | $0.5735 (1.274%, 156.5%/yr) | -1.096% | -134.6% | $45.09 (0.190%) | in range -235570..-233550, 2 ranges, HYPE 60.88 |
| Project X 0.05% ±20%, own rule | $45.36 | $0.2775 (0.617%, 75.7%/yr) | 0.805% | 98.8% | $45.09 (0.190%) | in range -237510..-233440, 1 range, HYPE 60.88 |
| Project X 0.3% ±10%, own rule | $44.66 | $0.6702 (1.489%, 182.9%/yr) | -0.748% | -91.9% | $45.16 (0.356%) | in range -235560..-233520, 2 ranges, HYPE 60.95 |
| HLP (Hypercore vault) | $45.01 | $0.0138 (0.031%, 3.8%/yr) | 0.031% | 3.8% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0150 (0.033%, 4.1%/yr) | 0.033% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0172 (0.038%, 4.7%/yr) | 0.038% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0170 (0.038%, 4.6%/yr) | 0.038% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.92% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
