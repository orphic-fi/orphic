# Paper book, junior strategies

Marked 2026-11-24T18:39:32Z, 3.08 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.08 | $0.1514 (0.335%, 39.8%/yr) | -2.409% | -285.9% | $45.38 (0.481%) | in range -235830..-233810, 2 ranges, HYPE 60.99 |
| Nest ±20%, own rule | $45.30 | $0.0889 (0.197%, 23.4%/yr) | 0.663% | 78.6% | $45.21 (0.476%) | in range -237550..-233480, 1 range, HYPE 60.99 |
| Project X 0.05% ±10%, own rule | $44.58 | $0.6089 (1.353%, 160.6%/yr) | -0.923% | -109.5% | $45.11 (0.248%) | in range -235570..-233550, 2 ranges, HYPE 60.95 |
| Project X 0.05% ±20%, own rule | $45.41 | $0.2950 (0.655%, 77.8%/yr) | 0.900% | 106.9% | $45.11 (0.248%) | in range -237510..-233440, 1 range, HYPE 60.95 |
| Project X 0.3% ±10%, own rule | $44.68 | $0.7092 (1.576%, 187.1%/yr) | -0.718% | -85.2% | $45.14 (0.322%) | in range -235560..-233520, 2 ranges, HYPE 60.91 |
| HLP (Hypercore vault) | $45.01 | $0.0125 (0.028%, 3.3%/yr) | 0.028% | 3.3% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0155 (0.035%, 4.1%/yr) | 0.035% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0176 (0.039%, 4.7%/yr) | 0.039% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0174 (0.039%, 4.6%/yr) | 0.039% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
