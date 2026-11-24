# Paper book, junior strategies

Marked 2026-11-24T08:13:02Z, 2.64 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.41 | $0.1308 (0.290%, 40.0%/yr) | 0.550% | 76.1% | $46.38 (2.687%) | in range -235830..-233810, 2 ranges, HYPE 63.66 |
| Nest ±20%, own rule | $46.13 | $0.0751 (0.167%, 23.1%/yr) | 2.521% | 348.5% | $46.21 (2.686%) | in range -237550..-233480, 1 range, HYPE 63.66 |
| Project X 0.05% ±10%, own rule | $45.85 | $0.4770 (1.060%, 146.5%/yr) | 1.898% | 262.3% | $46.10 (2.439%) | in range -235570..-233550, 2 ranges, HYPE 63.61 |
| Project X 0.05% ±20%, own rule | $46.21 | $0.2322 (0.516%, 71.3%/yr) | 2.681% | 370.6% | $46.10 (2.439%) | in range -237510..-233440, 1 range, HYPE 63.61 |
| Project X 0.3% ±10%, own rule | $46.00 | $0.5613 (1.247%, 172.4%/yr) | 2.233% | 308.7% | $46.18 (2.626%) | in range -235560..-233520, 2 ranges, HYPE 63.70 |
| HLP (Hypercore vault) | $45.01 | $0.0134 (0.030%, 4.1%/yr) | 0.030% | 4.1% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0134 (0.030%, 4.1%/yr) | 0.030% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0156 (0.035%, 4.8%/yr) | 0.035% | 4.8% | $45.00 (0.000%) | liquidity index; supply APY now 3.94% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0154 (0.034%, 4.7%/yr) | 0.034% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.94% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
