# Paper book, junior strategies

Marked 2026-11-24T02:15:50Z, 2.39 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.36 | $0.1232 (0.273%, 41.6%/yr) | 0.428% | 65.3% | $46.34 (2.601%) | in range -235830..-233810, 2 ranges, HYPE 63.56 |
| Nest ±20%, own rule | $46.10 | $0.0700 (0.156%, 23.7%/yr) | 2.444% | 372.8% | $46.17 (2.599%) | in range -237550..-233480, 1 range, HYPE 63.56 |
| Project X 0.05% ±10%, own rule | $45.68 | $0.4353 (0.967%, 147.6%/yr) | 1.501% | 229.1% | $45.99 (2.195%) | in range -235570..-233550, 2 ranges, HYPE 63.31 |
| Project X 0.05% ±20%, own rule | $46.10 | $0.2114 (0.470%, 71.7%/yr) | 2.442% | 372.6% | $45.99 (2.195%) | in range -237510..-233440, 1 range, HYPE 63.31 |
| Project X 0.3% ±10%, own rule | $45.83 | $0.5136 (1.141%, 174.1%/yr) | 1.843% | 281.1% | $46.08 (2.396%) | in range -235560..-233520, 2 ranges, HYPE 63.42 |
| HLP (Hypercore vault) | $45.01 | $0.0138 (0.031%, 4.7%/yr) | 0.031% | 4.7% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0122 (0.027%, 4.1%/yr) | 0.027% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0144 (0.032%, 4.9%/yr) | 0.032% | 4.9% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0142 (0.032%, 4.8%/yr) | 0.032% | 4.8% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.05% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
