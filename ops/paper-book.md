# Paper book, junior strategies

Marked 2026-11-24T14:56:37Z, 2.92 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.78 | $0.1426 (0.316%, 39.5%/yr) | -0.858% | -107.2% | $45.88 (1.575%) | in range -235830..-233810, 2 ranges, HYPE 62.31 |
| Nest ±20%, own rule | $45.74 | $0.0830 (0.184%, 23.1%/yr) | 1.641% | 205.1% | $45.71 (1.571%) | in range -237550..-233480, 1 range, HYPE 62.31 |
| Project X 0.05% ±10%, own rule | $45.16 | $0.5513 (1.225%, 153.1%/yr) | 0.345% | 43.1% | $45.52 (1.154%) | in range -235570..-233550, 2 ranges, HYPE 62.05 |
| Project X 0.05% ±20%, own rule | $45.76 | $0.2675 (0.594%, 74.3%/yr) | 1.687% | 210.8% | $45.52 (1.154%) | in range -237510..-233440, 1 range, HYPE 62.05 |
| Project X 0.3% ±10%, own rule | $45.35 | $0.6452 (1.434%, 179.2%/yr) | 0.785% | 98.1% | $45.63 (1.393%) | in range -235560..-233520, 2 ranges, HYPE 62.21 |
| HLP (Hypercore vault) | $45.02 | $0.0166 (0.037%, 4.6%/yr) | 0.037% | 4.6% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0147 (0.033%, 4.1%/yr) | 0.033% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0169 (0.038%, 4.7%/yr) | 0.038% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0167 (0.037%, 4.6%/yr) | 0.037% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
