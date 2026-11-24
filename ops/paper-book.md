# Paper book, junior strategies

Marked 2026-11-24T05:31:02Z, 2.53 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.60 | $0.1287 (0.285%, 41.2%/yr) | 0.965% | 139.3% | $46.54 (3.038%) | in range -235830..-233810, 2 ranges, HYPE 64.08 |
| Nest ±20%, own rule | $46.25 | $0.0737 (0.164%, 23.6%/yr) | 2.778% | 401.2% | $46.37 (3.037%) | in range -237550..-233480, 1 range, HYPE 64.08 |
| Project X 0.05% ±10%, own rule | $46.05 | $0.4645 (1.032%, 149.1%/yr) | 2.344% | 338.5% | $46.28 (2.839%) | in range -235570..-233550, 2 ranges, HYPE 64.09 |
| Project X 0.05% ±20%, own rule | $46.34 | $0.2265 (0.503%, 72.7%/yr) | 2.972% | 429.2% | $46.28 (2.839%) | in range -237510..-233440, 1 range, HYPE 64.09 |
| Project X 0.3% ±10%, own rule | $46.10 | $0.5508 (1.224%, 176.7%/yr) | 2.441% | 352.5% | $46.27 (2.819%) | in range -235560..-233520, 2 ranges, HYPE 63.93 |
| HLP (Hypercore vault) | $45.01 | $0.0136 (0.030%, 4.4%/yr) | 0.030% | 4.4% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0128 (0.029%, 4.1%/yr) | 0.029% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0150 (0.033%, 4.8%/yr) | 0.033% | 4.8% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0148 (0.033%, 4.8%/yr) | 0.033% | 4.8% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
