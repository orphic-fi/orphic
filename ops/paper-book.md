# Paper book, junior strategies

Marked 2026-11-24T04:45:22Z, 2.50 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.48 | $0.1276 (0.282%, 41.3%/yr) | 0.693% | 101.4% | $46.43 (2.812%) | in range -235830..-233810, 2 ranges, HYPE 63.81 |
| Nest ±20%, own rule | $46.17 | $0.0729 (0.162%, 23.7%/yr) | 2.610% | 381.6% | $46.26 (2.810%) | in range -237550..-233480, 1 range, HYPE 63.81 |
| Project X 0.05% ±10%, own rule | $45.90 | $0.4603 (1.023%, 149.6%/yr) | 2.011% | 294.0% | $46.15 (2.563%) | in range -235570..-233550, 2 ranges, HYPE 63.76 |
| Project X 0.05% ±20%, own rule | $46.24 | $0.2241 (0.498%, 72.8%/yr) | 2.759% | 403.4% | $46.15 (2.563%) | in range -237510..-233440, 1 range, HYPE 63.76 |
| Project X 0.3% ±10%, own rule | $46.04 | $0.5471 (1.216%, 177.8%/yr) | 2.306% | 337.3% | $46.22 (2.713%) | in range -235560..-233520, 2 ranges, HYPE 63.80 |
| HLP (Hypercore vault) | $45.01 | $0.0134 (0.030%, 4.3%/yr) | 0.030% | 4.3% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0127 (0.028%, 4.1%/yr) | 0.028% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0149 (0.033%, 4.8%/yr) | 0.033% | 4.8% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0147 (0.033%, 4.8%/yr) | 0.033% | 4.8% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.05% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
