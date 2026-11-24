# Paper book, junior strategies

Marked 2026-11-24T19:10:00Z, 3.10 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.79 | $0.1540 (0.341%, 40.2%/yr) | -3.033% | -357.5% | $45.20 (0.072%) | in range -235830..-233810, 2 ranges, HYPE 60.50 |
| Nest ±20%, own rule | $45.12 | $0.0906 (0.201%, 23.7%/yr) | 0.267% | 31.5% | $45.03 (0.066%) | in range -237550..-233480, 1 range, HYPE 60.50 |
| Project X 0.05% ±10%, own rule | $44.19 | $0.6113 (1.359%, 160.1%/yr) | -1.789% | -210.9% | $44.88 (-0.273%) | in range -235570..-233550, 2 ranges, HYPE 60.32 |
| Project X 0.05% ±20%, own rule | $45.17 | $0.2957 (0.657%, 77.4%/yr) | 0.381% | 44.9% | $44.88 (-0.273%) | in range -237510..-233440, 1 range, HYPE 60.32 |
| Project X 0.3% ±10%, own rule | $44.40 | $0.7122 (1.583%, 186.5%/yr) | -1.323% | -155.9% | $44.98 (-0.044%) | in range -235560..-233520, 2 ranges, HYPE 60.47 |
| HLP (Hypercore vault) | $45.01 | $0.0124 (0.028%, 3.3%/yr) | 0.028% | 3.3% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0156 (0.035%, 4.1%/yr) | 0.035% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0177 (0.039%, 4.6%/yr) | 0.039% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0175 (0.039%, 4.6%/yr) | 0.039% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
