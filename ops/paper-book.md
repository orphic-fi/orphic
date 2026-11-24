# Paper book, junior strategies

Marked 2026-11-24T13:12:58Z, 2.85 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.75 | $0.1387 (0.307%, 39.3%/yr) | -0.907% | -116.2% | $45.86 (1.545%) | in range -235830..-233810, 2 ranges, HYPE 62.28 |
| Nest ±20%, own rule | $45.72 | $0.0803 (0.179%, 22.9%/yr) | 1.609% | 206.2% | $45.69 (1.541%) | in range -237550..-233480, 1 range, HYPE 62.28 |
| Project X 0.05% ±10%, own rule | $45.17 | $0.5254 (1.167%, 149.6%/yr) | 0.367% | 47.0% | $45.54 (1.210%) | in range -235570..-233550, 2 ranges, HYPE 62.12 |
| Project X 0.05% ±20%, own rule | $45.77 | $0.2548 (0.566%, 72.5%/yr) | 1.708% | 218.8% | $45.54 (1.210%) | in range -237510..-233440, 1 range, HYPE 62.12 |
| Project X 0.3% ±10%, own rule | $45.29 | $0.6227 (1.384%, 177.3%/yr) | 0.645% | 82.7% | $45.60 (1.330%) | in range -235560..-233520, 2 ranges, HYPE 62.13 |
| HLP (Hypercore vault) | $45.01 | $0.0132 (0.029%, 3.8%/yr) | 0.029% | 3.8% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0144 (0.032%, 4.1%/yr) | 0.032% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0166 (0.037%, 4.7%/yr) | 0.037% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.93% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0164 (0.036%, 4.7%/yr) | 0.036% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.93% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
