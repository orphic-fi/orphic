# Paper book, junior strategies

Marked 2026-11-24T18:54:46Z, 3.09 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.88 | $0.1515 (0.336%, 39.7%/yr) | -2.847% | -336.8% | $45.25 (0.195%) | in range -235830..-233810, 2 ranges, HYPE 60.64 |
| Nest ±20%, own rule | $45.17 | $0.0890 (0.198%, 23.4%/yr) | 0.385% | 45.5% | $45.08 (0.189%) | in range -237550..-233480, 1 range, HYPE 60.64 |
| Project X 0.05% ±10%, own rule | $44.32 | $0.6101 (1.356%, 160.4%/yr) | -1.502% | -177.7% | $44.95 (-0.103%) | in range -235570..-233550, 2 ranges, HYPE 60.52 |
| Project X 0.05% ±20%, own rule | $45.25 | $0.2952 (0.656%, 77.6%/yr) | 0.552% | 65.3% | $44.95 (-0.103%) | in range -237510..-233440, 1 range, HYPE 60.52 |
| Project X 0.3% ±10%, own rule | $44.47 | $0.7115 (1.581%, 187.0%/yr) | -1.178% | -139.3% | $45.02 (0.043%) | in range -235560..-233520, 2 ranges, HYPE 60.57 |
| HLP (Hypercore vault) | $45.01 | $0.0125 (0.028%, 3.3%/yr) | 0.028% | 3.3% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0156 (0.035%, 4.1%/yr) | 0.035% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0177 (0.039%, 4.7%/yr) | 0.039% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0175 (0.039%, 4.6%/yr) | 0.039% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
