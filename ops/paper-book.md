# Paper book, junior strategies

Marked 2026-11-23T22:57:19Z, 2.25 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.38 | $0.1190 (0.264%, 42.7%/yr) | 0.474% | 76.8% | $46.36 (2.647%) | in range -235830..-233810, 2 ranges, HYPE 63.61 |
| Nest ±20%, own rule | $46.11 | $0.0671 (0.149%, 24.2%/yr) | 2.472% | 400.3% | $46.19 (2.645%) | in range -237550..-233480, 1 range, HYPE 63.61 |
| Project X 0.05% ±10%, own rule | $45.75 | $0.4132 (0.918%, 148.7%/yr) | 1.656% | 268.1% | $46.06 (2.358%) | in range -235570..-233550, 2 ranges, HYPE 63.51 |
| Project X 0.05% ±20%, own rule | $46.15 | $0.2007 (0.446%, 72.2%/yr) | 2.547% | 412.4% | $46.06 (2.358%) | in range -237510..-233440, 1 range, HYPE 63.51 |
| Project X 0.3% ±10%, own rule | $45.83 | $0.4831 (1.074%, 173.8%/yr) | 1.845% | 298.7% | $46.10 (2.451%) | in range -235560..-233520, 2 ranges, HYPE 63.49 |
| HLP (Hypercore vault) | $45.01 | $0.0133 (0.030%, 4.8%/yr) | 0.030% | 4.8% | $45.00 (0.000%) | Hypercore reports 17.0% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0115 (0.026%, 4.2%/yr) | 0.026% | 4.2% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0137 (0.031%, 4.9%/yr) | 0.031% | 4.9% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0135 (0.030%, 4.9%/yr) | 0.030% | 4.9% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.05% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
