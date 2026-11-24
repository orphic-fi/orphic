# Paper book, junior strategies

Marked 2026-11-24T05:15:49Z, 2.52 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.48 | $0.1282 (0.284%, 41.2%/yr) | 0.704% | 102.0% | $46.44 (2.819%) | in range -235830..-233810, 2 ranges, HYPE 63.82 |
| Nest ±20%, own rule | $46.18 | $0.0733 (0.163%, 23.6%/yr) | 2.616% | 379.3% | $46.27 (2.817%) | in range -237550..-233480, 1 range, HYPE 63.82 |
| Project X 0.05% ±10%, own rule | $45.93 | $0.4626 (1.028%, 149.1%/yr) | 2.058% | 298.4% | $46.17 (2.598%) | in range -235570..-233550, 2 ranges, HYPE 63.80 |
| Project X 0.05% ±20%, own rule | $46.25 | $0.2252 (0.501%, 72.6%/yr) | 2.788% | 404.3% | $46.17 (2.598%) | in range -237510..-233440, 1 range, HYPE 63.80 |
| Project X 0.3% ±10%, own rule | $45.99 | $0.5479 (1.217%, 176.5%/yr) | 2.210% | 320.4% | $46.18 (2.631%) | in range -235560..-233520, 2 ranges, HYPE 63.70 |
| HLP (Hypercore vault) | $45.01 | $0.0135 (0.030%, 4.4%/yr) | 0.030% | 4.4% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0128 (0.028%, 4.1%/yr) | 0.028% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0150 (0.033%, 4.8%/yr) | 0.033% | 4.8% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0148 (0.033%, 4.8%/yr) | 0.033% | 4.8% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
