# Paper book, junior strategies

Marked 2026-11-23T22:10:34Z, 2.22 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.68 | $0.1140 (0.252%, 41.5%/yr) | 1.142% | 187.6% | $46.62 (3.219%) | in range -235830..-233810, 2 ranges, HYPE 64.30 |
| Nest ±20%, own rule | $46.30 | $0.0638 (0.142%, 23.3%/yr) | 2.887% | 474.2% | $46.45 (3.218%) | in range -237550..-233480, 1 range, HYPE 64.30 |
| Project X 0.05% ±10%, own rule | $46.02 | $0.4071 (0.905%, 148.6%/yr) | 2.270% | 372.9% | $46.30 (2.886%) | in range -235570..-233550, 2 ranges, HYPE 64.15 |
| Project X 0.05% ±20%, own rule | $46.32 | $0.1982 (0.440%, 72.3%/yr) | 2.944% | 483.6% | $46.30 (2.886%) | in range -237510..-233440, 1 range, HYPE 64.15 |
| Project X 0.3% ±10%, own rule | $46.14 | $0.4769 (1.060%, 174.1%/yr) | 2.537% | 416.8% | $46.37 (3.043%) | in range -235560..-233520, 2 ranges, HYPE 64.20 |
| HLP (Hypercore vault) | $45.01 | $0.0133 (0.030%, 4.8%/yr) | 0.030% | 4.8% | $45.00 (0.000%) | Hypercore reports 17.0% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0114 (0.025%, 4.2%/yr) | 0.025% | 4.2% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0136 (0.030%, 5.0%/yr) | 0.030% | 5.0% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0134 (0.030%, 4.9%/yr) | 0.030% | 4.9% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.05% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
