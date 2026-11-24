# Paper book, junior strategies

Marked 2026-11-24T12:11:57Z, 2.81 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.05 | $0.1367 (0.303%, 39.4%/yr) | -0.249% | -32.4% | $46.09 (2.042%) | in range -235830..-233810, 2 ranges, HYPE 62.88 |
| Nest ±20%, own rule | $45.91 | $0.0790 (0.176%, 22.8%/yr) | 2.022% | 263.0% | $45.92 (2.039%) | in range -237550..-233480, 1 range, HYPE 62.88 |
| Project X 0.05% ±10%, own rule | $45.50 | $0.5119 (1.138%, 148.0%/yr) | 1.113% | 144.8% | $45.79 (1.766%) | in range -235570..-233550, 2 ranges, HYPE 62.79 |
| Project X 0.05% ±20%, own rule | $45.98 | $0.2487 (0.553%, 71.9%/yr) | 2.174% | 282.8% | $45.79 (1.766%) | in range -237510..-233440, 1 range, HYPE 62.79 |
| Project X 0.3% ±10%, own rule | $45.69 | $0.6118 (1.360%, 176.8%/yr) | 1.526% | 198.4% | $45.89 (1.981%) | in range -235560..-233520, 2 ranges, HYPE 62.92 |
| HLP (Hypercore vault) | $45.01 | $0.0130 (0.029%, 3.8%/yr) | 0.029% | 3.8% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0142 (0.032%, 4.1%/yr) | 0.032% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0164 (0.036%, 4.7%/yr) | 0.036% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.93% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0161 (0.036%, 4.7%/yr) | 0.036% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.93% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
