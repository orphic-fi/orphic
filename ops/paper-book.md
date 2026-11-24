# Paper book, junior strategies

Marked 2026-11-24T11:43:55Z, 2.79 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.03 | $0.1359 (0.301%, 39.4%/yr) | -0.307% | -40.2% | $46.07 (1.999%) | in range -235830..-233810, 2 ranges, HYPE 62.83 |
| Nest ±20%, own rule | $45.89 | $0.0785 (0.174%, 22.8%/yr) | 1.986% | 260.1% | $45.90 (1.996%) | in range -237550..-233480, 1 range, HYPE 62.83 |
| Project X 0.05% ±10%, own rule | $45.50 | $0.5088 (1.131%, 148.1%/yr) | 1.102% | 144.4% | $45.79 (1.764%) | in range -235570..-233550, 2 ranges, HYPE 62.79 |
| Project X 0.05% ±20%, own rule | $45.98 | $0.2472 (0.549%, 71.9%/yr) | 2.169% | 284.0% | $45.79 (1.764%) | in range -237510..-233440, 1 range, HYPE 62.79 |
| Project X 0.3% ±10%, own rule | $45.54 | $0.6065 (1.348%, 176.5%/yr) | 1.192% | 156.1% | $45.78 (1.743%) | in range -235560..-233520, 2 ranges, HYPE 62.63 |
| HLP (Hypercore vault) | $45.01 | $0.0137 (0.030%, 4.0%/yr) | 0.030% | 4.0% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0141 (0.031%, 4.1%/yr) | 0.031% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0162 (0.036%, 4.7%/yr) | 0.036% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.93% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0160 (0.036%, 4.7%/yr) | 0.036% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.93% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
