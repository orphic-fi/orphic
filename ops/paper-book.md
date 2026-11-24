# Paper book, junior strategies

Marked 2026-11-24T15:11:51Z, 2.93 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.44 | $0.1434 (0.318%, 39.5%/yr) | -1.595% | -198.6% | $45.64 (1.046%) | in range -235830..-233810, 2 ranges, HYPE 61.67 |
| Nest ±20%, own rule | $45.53 | $0.0835 (0.186%, 23.1%/yr) | 1.176% | 146.5% | $45.47 (1.041%) | in range -237550..-233480, 1 range, HYPE 61.67 |
| Project X 0.05% ±10%, own rule | $44.84 | $0.5552 (1.234%, 153.6%/yr) | -0.356% | -44.3% | $45.31 (0.681%) | in range -235570..-233550, 2 ranges, HYPE 61.47 |
| Project X 0.05% ±20%, own rule | $45.57 | $0.2690 (0.598%, 74.4%/yr) | 1.257% | 156.5% | $45.31 (0.681%) | in range -237510..-233440, 1 range, HYPE 61.47 |
| Project X 0.3% ±10%, own rule | $45.04 | $0.6516 (1.448%, 180.3%/yr) | 0.084% | 10.5% | $45.41 (0.910%) | in range -235560..-233520, 2 ranges, HYPE 61.62 |
| HLP (Hypercore vault) | $45.01 | $0.0132 (0.029%, 3.7%/yr) | 0.029% | 3.7% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0148 (0.033%, 4.1%/yr) | 0.033% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0170 (0.038%, 4.7%/yr) | 0.038% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0168 (0.037%, 4.6%/yr) | 0.037% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
