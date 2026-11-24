# Paper book, junior strategies

Marked 2026-11-24T10:42:44Z, 2.74 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.99 | $0.1347 (0.298%, 39.7%/yr) | -0.390% | -51.9% | $46.04 (1.937%) | in range -235830..-233810, 2 ranges, HYPE 62.75 |
| Nest ±20%, own rule | $45.87 | $0.0777 (0.173%, 23.0%/yr) | 1.934% | 257.2% | $45.87 (1.934%) | in range -237550..-233480, 1 range, HYPE 62.75 |
| Project X 0.05% ±10%, own rule | $45.38 | $0.4994 (1.110%, 147.6%/yr) | 0.849% | 112.9% | $45.72 (1.593%) | in range -235570..-233550, 2 ranges, HYPE 62.58 |
| Project X 0.05% ±20%, own rule | $45.91 | $0.2424 (0.539%, 71.6%/yr) | 2.013% | 267.8% | $45.72 (1.593%) | in range -237510..-233440, 1 range, HYPE 62.58 |
| Project X 0.3% ±10%, own rule | $45.57 | $0.5953 (1.323%, 176.0%/yr) | 1.277% | 169.8% | $45.82 (1.823%) | in range -235560..-233520, 2 ranges, HYPE 62.73 |
| HLP (Hypercore vault) | $45.01 | $0.0132 (0.029%, 3.9%/yr) | 0.029% | 3.9% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0139 (0.031%, 4.1%/yr) | 0.031% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0161 (0.036%, 4.7%/yr) | 0.036% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.93% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0159 (0.035%, 4.7%/yr) | 0.035% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.93% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
