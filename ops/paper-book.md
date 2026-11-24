# Paper book, junior strategies

Marked 2026-11-24T08:28:19Z, 2.65 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.46 | $0.1312 (0.291%, 40.0%/yr) | 0.656% | 90.3% | $46.42 (2.774%) | in range -235830..-233810, 2 ranges, HYPE 63.76 |
| Nest ±20%, own rule | $46.16 | $0.0754 (0.167%, 23.1%/yr) | 2.587% | 356.2% | $46.25 (2.772%) | in range -237550..-233480, 1 range, HYPE 63.76 |
| Project X 0.05% ±10%, own rule | $45.88 | $0.4791 (1.065%, 146.6%/yr) | 1.952% | 268.7% | $46.12 (2.480%) | in range -235570..-233550, 2 ranges, HYPE 63.66 |
| Project X 0.05% ±20%, own rule | $46.22 | $0.2333 (0.518%, 71.4%/yr) | 2.715% | 373.8% | $46.12 (2.480%) | in range -237510..-233440, 1 range, HYPE 63.66 |
| Project X 0.3% ±10%, own rule | $46.06 | $0.5644 (1.254%, 172.7%/yr) | 2.354% | 324.2% | $46.22 (2.721%) | in range -235560..-233520, 2 ranges, HYPE 63.81 |
| HLP (Hypercore vault) | $45.01 | $0.0135 (0.030%, 4.1%/yr) | 0.030% | 4.1% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0134 (0.030%, 4.1%/yr) | 0.030% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0156 (0.035%, 4.8%/yr) | 0.035% | 4.8% | $45.00 (0.000%) | liquidity index; supply APY now 3.94% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0154 (0.034%, 4.7%/yr) | 0.034% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.94% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
