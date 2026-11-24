# Paper book, junior strategies

Marked 2026-11-24T09:29:29Z, 2.69 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.20 | $0.1335 (0.296%, 40.1%/yr) | 0.078% | 10.6% | $46.20 (2.302%) | in range -235830..-233810, 2 ranges, HYPE 63.19 |
| Nest ±20%, own rule | $46.00 | $0.0769 (0.171%, 23.2%/yr) | 2.227% | 301.8% | $46.03 (2.300%) | in range -237550..-233480, 1 range, HYPE 63.19 |
| Project X 0.05% ±10%, own rule | $45.65 | $0.4910 (1.091%, 147.9%/yr) | 1.443% | 195.6% | $45.92 (2.052%) | in range -235570..-233550, 2 ranges, HYPE 63.14 |
| Project X 0.05% ±20%, own rule | $46.07 | $0.2387 (0.530%, 71.9%/yr) | 2.388% | 323.6% | $45.92 (2.052%) | in range -237510..-233440, 1 range, HYPE 63.14 |
| Project X 0.3% ±10%, own rule | $45.76 | $0.5845 (1.299%, 176.0%/yr) | 1.688% | 228.7% | $45.97 (2.151%) | in range -235560..-233520, 2 ranges, HYPE 63.12 |
| HLP (Hypercore vault) | $45.01 | $0.0131 (0.029%, 3.9%/yr) | 0.029% | 3.9% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0136 (0.030%, 4.1%/yr) | 0.030% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0158 (0.035%, 4.8%/yr) | 0.035% | 4.8% | $45.00 (0.000%) | liquidity index; supply APY now 3.93% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0156 (0.035%, 4.7%/yr) | 0.035% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.93% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
