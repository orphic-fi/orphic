# Paper book, junior strategies

Marked 2026-11-24T03:01:31Z, 2.42 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.11 | $0.1240 (0.275%, 41.3%/yr) | -0.117% | -17.7% | $46.14 (2.165%) | in range -235830..-233810, 2 ranges, HYPE 63.03 |
| Nest ±20%, own rule | $45.95 | $0.0705 (0.157%, 23.6%/yr) | 2.103% | 316.7% | $45.97 (2.163%) | in range -237550..-233480, 1 range, HYPE 63.03 |
| Project X 0.05% ±10%, own rule | $45.51 | $0.4421 (0.982%, 147.9%/yr) | 1.123% | 169.1% | $45.85 (1.890%) | in range -235570..-233550, 2 ranges, HYPE 62.94 |
| Project X 0.05% ±20%, own rule | $45.99 | $0.2144 (0.477%, 71.8%/yr) | 2.201% | 331.5% | $45.85 (1.890%) | in range -237510..-233440, 1 range, HYPE 62.94 |
| Project X 0.3% ±10%, own rule | $45.64 | $0.5178 (1.151%, 173.3%/yr) | 1.422% | 214.2% | $45.93 (2.061%) | in range -235560..-233520, 2 ranges, HYPE 63.02 |
| HLP (Hypercore vault) | $45.01 | $0.0129 (0.029%, 4.3%/yr) | 0.029% | 4.3% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0123 (0.027%, 4.1%/yr) | 0.027% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0145 (0.032%, 4.9%/yr) | 0.032% | 4.9% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0143 (0.032%, 4.8%/yr) | 0.032% | 4.8% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
