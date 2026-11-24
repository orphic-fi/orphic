# Paper book, junior strategies

Marked 2026-11-24T12:27:14Z, 2.82 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.12 | $0.1371 (0.304%, 39.3%/yr) | -0.094% | -12.1% | $46.14 (2.161%) | in range -235830..-233810, 2 ranges, HYPE 63.02 |
| Nest ±20%, own rule | $45.95 | $0.0793 (0.176%, 22.8%/yr) | 2.119% | 274.6% | $45.97 (2.158%) | in range -237550..-233480, 1 range, HYPE 63.02 |
| Project X 0.05% ±10%, own rule | $45.55 | $0.5141 (1.143%, 148.0%/yr) | 1.223% | 158.5% | $45.83 (1.845%) | in range -235570..-233550, 2 ranges, HYPE 62.89 |
| Project X 0.05% ±20%, own rule | $46.01 | $0.2499 (0.555%, 72.0%/yr) | 2.242% | 290.6% | $45.83 (1.845%) | in range -237510..-233440, 1 range, HYPE 62.89 |
| Project X 0.3% ±10%, own rule | $45.69 | $0.6141 (1.365%, 176.8%/yr) | 1.526% | 197.7% | $45.89 (1.978%) | in range -235560..-233520, 2 ranges, HYPE 62.91 |
| HLP (Hypercore vault) | $45.01 | $0.0130 (0.029%, 3.8%/yr) | 0.029% | 3.8% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0142 (0.032%, 4.1%/yr) | 0.032% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0164 (0.036%, 4.7%/yr) | 0.036% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.93% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0162 (0.036%, 4.7%/yr) | 0.036% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.93% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
