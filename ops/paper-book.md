# Paper book, junior strategies

Marked 2026-11-24T03:47:15Z, 2.46 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.16 | $0.1263 (0.280%, 41.5%/yr) | -0.009% | -1.3% | $46.18 (2.247%) | in range -235830..-233810, 2 ranges, HYPE 63.13 |
| Nest ±20%, own rule | $45.98 | $0.0720 (0.160%, 23.8%/yr) | 2.172% | 322.8% | $46.01 (2.244%) | in range -237550..-233480, 1 range, HYPE 63.13 |
| Project X 0.05% ±10%, own rule | $45.57 | $0.4548 (1.011%, 150.2%/yr) | 1.257% | 186.8% | $45.89 (1.971%) | in range -235570..-233550, 2 ranges, HYPE 63.04 |
| Project X 0.05% ±20%, own rule | $46.03 | $0.2208 (0.491%, 72.9%/yr) | 2.282% | 339.1% | $45.89 (1.971%) | in range -237510..-233440, 1 range, HYPE 63.04 |
| Project X 0.3% ±10%, own rule | $45.60 | $0.5355 (1.190%, 176.9%/yr) | 1.340% | 199.2% | $45.89 (1.969%) | in range -235560..-233520, 2 ranges, HYPE 62.90 |
| HLP (Hypercore vault) | $45.01 | $0.0132 (0.029%, 4.4%/yr) | 0.029% | 4.4% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0125 (0.028%, 4.1%/yr) | 0.028% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0147 (0.033%, 4.9%/yr) | 0.033% | 4.9% | $45.00 (0.000%) | liquidity index; supply APY now 3.94% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0145 (0.032%, 4.8%/yr) | 0.032% | 4.8% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.94% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
