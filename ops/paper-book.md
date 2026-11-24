# Paper book, junior strategies

Marked 2026-11-24T00:17:10Z, 2.31 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.39 | $0.1210 (0.268%, 42.3%/yr) | 0.499% | 78.9% | $46.37 (2.663%) | in range -235830..-233810, 2 ranges, HYPE 63.63 |
| Nest ±20%, own rule | $46.12 | $0.0684 (0.152%, 24.0%/yr) | 2.488% | 393.1% | $46.20 (2.661%) | in range -237550..-233480, 1 range, HYPE 63.63 |
| Project X 0.05% ±10%, own rule | $45.77 | $0.4211 (0.936%, 147.9%/yr) | 1.718% | 271.5% | $46.08 (2.394%) | in range -235570..-233550, 2 ranges, HYPE 63.55 |
| Project X 0.05% ±20%, own rule | $46.16 | $0.2046 (0.455%, 71.9%/yr) | 2.584% | 408.4% | $46.08 (2.394%) | in range -237510..-233440, 1 range, HYPE 63.55 |
| Project X 0.3% ±10%, own rule | $45.84 | $0.4914 (1.092%, 172.6%/yr) | 1.870% | 295.6% | $46.11 (2.457%) | in range -235560..-233520, 2 ranges, HYPE 63.49 |
| HLP (Hypercore vault) | $45.01 | $0.0131 (0.029%, 4.6%/yr) | 0.029% | 4.6% | $45.00 (0.000%) | Hypercore reports 16.3% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0118 (0.026%, 4.1%/yr) | 0.026% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0140 (0.031%, 4.9%/yr) | 0.031% | 4.9% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0138 (0.031%, 4.8%/yr) | 0.031% | 4.8% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.05% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
