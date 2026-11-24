# Paper book, junior strategies

Marked 2026-11-24T11:28:36Z, 2.78 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.00 | $0.1357 (0.300%, 39.5%/yr) | -0.354% | -46.6% | $46.05 (1.963%) | in range -235830..-233810, 2 ranges, HYPE 62.78 |
| Nest ±20%, own rule | $45.88 | $0.0783 (0.174%, 22.9%/yr) | 1.956% | 257.2% | $45.88 (1.960%) | in range -237550..-233480, 1 range, HYPE 62.78 |
| Project X 0.05% ±10%, own rule | $45.46 | $0.5069 (1.127%, 148.1%/yr) | 1.013% | 133.2% | $45.77 (1.700%) | in range -235570..-233550, 2 ranges, HYPE 62.71 |
| Project X 0.05% ±20%, own rule | $45.95 | $0.2462 (0.547%, 71.9%/yr) | 2.113% | 277.9% | $45.77 (1.700%) | in range -237510..-233440, 1 range, HYPE 62.71 |
| Project X 0.3% ±10%, own rule | $45.50 | $0.6054 (1.345%, 176.9%/yr) | 1.101% | 144.8% | $45.76 (1.679%) | in range -235560..-233520, 2 ranges, HYPE 62.55 |
| HLP (Hypercore vault) | $45.01 | $0.0135 (0.030%, 3.9%/yr) | 0.030% | 3.9% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0141 (0.031%, 4.1%/yr) | 0.031% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0162 (0.036%, 4.7%/yr) | 0.036% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.93% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0160 (0.036%, 4.7%/yr) | 0.036% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.93% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
