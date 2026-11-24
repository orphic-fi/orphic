# Paper book, junior strategies

Marked 2026-11-24T03:16:45Z, 2.43 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.77 | $0.1247 (0.276%, 41.4%/yr) | -0.879% | -131.8% | $45.88 (1.588%) | in range -235830..-233810, 2 ranges, HYPE 62.33 |
| Nest ±20%, own rule | $45.73 | $0.0710 (0.158%, 23.6%/yr) | 1.626% | 243.7% | $45.71 (1.585%) | in range -237550..-233480, 1 range, HYPE 62.33 |
| Project X 0.05% ±10%, own rule | $45.13 | $0.4474 (0.994%, 149.1%/yr) | 0.282% | 42.3% | $45.57 (1.271%) | in range -235570..-233550, 2 ranges, HYPE 62.19 |
| Project X 0.05% ±20%, own rule | $45.75 | $0.2164 (0.481%, 72.1%/yr) | 1.677% | 251.4% | $45.57 (1.271%) | in range -237510..-233440, 1 range, HYPE 62.19 |
| Project X 0.3% ±10%, own rule | $45.24 | $0.5266 (1.170%, 175.5%/yr) | 0.539% | 80.9% | $45.63 (1.405%) | in range -235560..-233520, 2 ranges, HYPE 62.22 |
| HLP (Hypercore vault) | $45.01 | $0.0128 (0.028%, 4.3%/yr) | 0.028% | 4.3% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0124 (0.028%, 4.1%/yr) | 0.028% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0146 (0.032%, 4.9%/yr) | 0.032% | 4.9% | $45.00 (0.000%) | liquidity index; supply APY now 3.94% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0144 (0.032%, 4.8%/yr) | 0.032% | 4.8% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.05% realised 24h, HyperLend 3.94% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
