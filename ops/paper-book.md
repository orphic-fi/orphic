# Paper book, junior strategies

Marked 2026-11-23T23:27:47Z, 2.28 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.52 | $0.1202 (0.266%, 42.7%/yr) | 0.796% | 127.7% | $46.48 (2.911%) | in range -235830..-233810, 2 ranges, HYPE 63.93 |
| Nest ±20%, own rule | $46.20 | $0.0679 (0.151%, 24.2%/yr) | 2.673% | 428.7% | $46.31 (2.910%) | in range -237550..-233480, 1 range, HYPE 63.93 |
| Project X 0.05% ±10%, own rule | $45.91 | $0.4173 (0.927%, 148.7%/yr) | 2.025% | 324.8% | $46.19 (2.655%) | in range -235570..-233550, 2 ranges, HYPE 63.87 |
| Project X 0.05% ±20%, own rule | $46.25 | $0.2030 (0.451%, 72.4%/yr) | 2.782% | 446.2% | $46.19 (2.655%) | in range -237510..-233440, 1 range, HYPE 63.87 |
| Project X 0.3% ±10%, own rule | $45.94 | $0.4861 (1.080%, 173.3%/yr) | 2.099% | 336.7% | $46.19 (2.654%) | in range -235560..-233520, 2 ranges, HYPE 63.73 |
| HLP (Hypercore vault) | $45.01 | $0.0127 (0.028%, 4.5%/yr) | 0.028% | 4.5% | $45.00 (0.000%) | Hypercore reports 17.0% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0116 (0.026%, 4.1%/yr) | 0.026% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0138 (0.031%, 4.9%/yr) | 0.031% | 4.9% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0136 (0.030%, 4.9%/yr) | 0.030% | 4.9% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.05% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
