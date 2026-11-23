# Paper book, junior strategies

Marked 2026-11-23T23:43:01Z, 2.29 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.39 | $0.1203 (0.266%, 42.5%/yr) | 0.501% | 80.0% | $46.37 (2.666%) | in range -235830..-233810, 2 ranges, HYPE 63.63 |
| Nest ±20%, own rule | $46.12 | $0.0680 (0.151%, 24.1%/yr) | 2.489% | 397.4% | $46.20 (2.664%) | in range -237550..-233480, 1 range, HYPE 63.63 |
| Project X 0.05% ±10%, own rule | $45.74 | $0.4183 (0.929%, 148.4%/yr) | 1.644% | 262.4% | $46.05 (2.339%) | in range -235570..-233550, 2 ranges, HYPE 63.49 |
| Project X 0.05% ±20%, own rule | $46.14 | $0.2032 (0.451%, 72.1%/yr) | 2.538% | 405.2% | $46.05 (2.339%) | in range -237510..-233440, 1 range, HYPE 63.49 |
| Project X 0.3% ±10%, own rule | $45.90 | $0.4895 (1.088%, 173.7%/yr) | 2.007% | 320.5% | $46.16 (2.571%) | in range -235560..-233520, 2 ranges, HYPE 63.63 |
| HLP (Hypercore vault) | $45.01 | $0.0128 (0.029%, 4.6%/yr) | 0.029% | 4.6% | $45.00 (0.000%) | Hypercore reports 17.1% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0117 (0.026%, 4.1%/yr) | 0.026% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0139 (0.031%, 4.9%/yr) | 0.031% | 4.9% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0137 (0.030%, 4.9%/yr) | 0.030% | 4.9% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.05% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
