# Paper book, junior strategies

Marked 2026-11-24T14:41:23Z, 2.91 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.86 | $0.1425 (0.316%, 39.6%/yr) | -0.672% | -84.3% | $45.94 (1.712%) | in range -235830..-233810, 2 ranges, HYPE 62.48 |
| Nest ±20%, own rule | $45.79 | $0.0829 (0.184%, 23.1%/yr) | 1.758% | 220.4% | $45.77 (1.709%) | in range -237550..-233480, 1 range, HYPE 62.48 |
| Project X 0.05% ±10%, own rule | $45.34 | $0.5470 (1.216%, 152.5%/yr) | 0.749% | 93.9% | $45.65 (1.444%) | in range -235570..-233550, 2 ranges, HYPE 62.40 |
| Project X 0.05% ±20%, own rule | $45.87 | $0.2657 (0.590%, 74.1%/yr) | 1.937% | 243.0% | $45.65 (1.444%) | in range -237510..-233440, 1 range, HYPE 62.40 |
| Project X 0.3% ±10%, own rule | $45.45 | $0.6436 (1.430%, 179.4%/yr) | 1.002% | 125.6% | $45.70 (1.547%) | in range -235560..-233520, 2 ranges, HYPE 62.39 |
| HLP (Hypercore vault) | $45.02 | $0.0164 (0.036%, 4.6%/yr) | 0.036% | 4.6% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0147 (0.033%, 4.1%/yr) | 0.033% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0169 (0.037%, 4.7%/yr) | 0.037% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0167 (0.037%, 4.6%/yr) | 0.037% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
