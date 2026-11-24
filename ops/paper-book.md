# Paper book, junior strategies

Marked 2026-11-24T12:57:43Z, 2.84 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.01 | $0.1378 (0.305%, 39.2%/yr) | -0.331% | -42.6% | $46.06 (1.977%) | in range -235830..-233810, 2 ranges, HYPE 62.80 |
| Nest ±20%, own rule | $45.89 | $0.0797 (0.177%, 22.8%/yr) | 1.971% | 253.5% | $45.89 (1.974%) | in range -237550..-233480, 1 range, HYPE 62.80 |
| Project X 0.05% ±10%, own rule | $45.42 | $0.5178 (1.151%, 148.0%/yr) | 0.942% | 121.2% | $45.73 (1.631%) | in range -235570..-233550, 2 ranges, HYPE 62.63 |
| Project X 0.05% ±20%, own rule | $45.93 | $0.2515 (0.559%, 71.9%/yr) | 2.066% | 265.7% | $45.73 (1.631%) | in range -237510..-233440, 1 range, HYPE 62.63 |
| Project X 0.3% ±10%, own rule | $45.62 | $0.6157 (1.368%, 176.0%/yr) | 1.375% | 176.8% | $45.84 (1.862%) | in range -235560..-233520, 2 ranges, HYPE 62.77 |
| HLP (Hypercore vault) | $45.01 | $0.0132 (0.029%, 3.8%/yr) | 0.029% | 3.8% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0144 (0.032%, 4.1%/yr) | 0.032% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0165 (0.037%, 4.7%/yr) | 0.037% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.93% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0163 (0.036%, 4.7%/yr) | 0.036% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.93% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
