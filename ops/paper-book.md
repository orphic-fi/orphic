# Paper book, junior strategies

Marked 2026-11-24T02:46:18Z, 2.41 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.22 | $0.1239 (0.274%, 41.5%/yr) | 0.114% | 17.3% | $46.22 (2.348%) | in range -235830..-233810, 2 ranges, HYPE 63.25 |
| Nest ±20%, own rule | $46.01 | $0.0704 (0.156%, 23.7%/yr) | 2.248% | 340.0% | $46.06 (2.345%) | in range -237550..-233480, 1 range, HYPE 63.25 |
| Project X 0.05% ±10%, own rule | $45.56 | $0.4405 (0.979%, 148.0%/yr) | 1.251% | 189.2% | $45.90 (1.991%) | in range -235570..-233550, 2 ranges, HYPE 63.06 |
| Project X 0.05% ±20%, own rule | $46.03 | $0.2137 (0.475%, 71.8%/yr) | 2.282% | 345.2% | $45.90 (1.991%) | in range -237510..-233440, 1 range, HYPE 63.06 |
| Project X 0.3% ±10%, own rule | $45.74 | $0.5161 (1.147%, 173.5%/yr) | 1.639% | 247.8% | $46.00 (2.230%) | in range -235560..-233520, 2 ranges, HYPE 63.22 |
| HLP (Hypercore vault) | $45.01 | $0.0129 (0.029%, 4.3%/yr) | 0.029% | 4.3% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0123 (0.027%, 4.1%/yr) | 0.027% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0144 (0.032%, 4.8%/yr) | 0.032% | 4.8% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0142 (0.032%, 4.8%/yr) | 0.032% | 4.8% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
