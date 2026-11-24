# Paper book, junior strategies

Marked 2026-11-24T00:01:56Z, 2.30 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.47 | $0.1207 (0.267%, 42.4%/yr) | 0.668% | 106.1% | $46.43 (2.804%) | in range -235830..-233810, 2 ranges, HYPE 63.80 |
| Nest ±20%, own rule | $46.17 | $0.0683 (0.152%, 24.1%/yr) | 2.593% | 411.7% | $46.26 (2.802%) | in range -237550..-233480, 1 range, HYPE 63.80 |
| Project X 0.05% ±10%, own rule | $45.82 | $0.4197 (0.933%, 148.1%/yr) | 1.815% | 288.2% | $46.11 (2.476%) | in range -235570..-233550, 2 ranges, HYPE 63.65 |
| Project X 0.05% ±20%, own rule | $46.19 | $0.2040 (0.453%, 72.0%/yr) | 2.647% | 420.2% | $46.11 (2.476%) | in range -237510..-233440, 1 range, HYPE 63.65 |
| Project X 0.3% ±10%, own rule | $45.90 | $0.4903 (1.090%, 173.0%/yr) | 2.000% | 317.5% | $46.15 (2.564%) | in range -235560..-233520, 2 ranges, HYPE 63.62 |
| HLP (Hypercore vault) | $45.01 | $0.0129 (0.029%, 4.6%/yr) | 0.029% | 4.6% | $45.00 (0.000%) | Hypercore reports 16.3% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0118 (0.026%, 4.1%/yr) | 0.026% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0139 (0.031%, 4.9%/yr) | 0.031% | 4.9% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0137 (0.031%, 4.8%/yr) | 0.031% | 4.8% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.05% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
