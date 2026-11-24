# Paper book, junior strategies

Marked 2026-11-24T21:52:21Z, 3.21 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.59 | $0.1598 (0.354%, 40.2%/yr) | -3.483% | -396.1% | $45.04 (-0.267%) | in range -236420..-234400, 3 ranges, HYPE 60.09 |
| Nest ±20%, own rule | $44.97 | $0.0939 (0.209%, 23.7%/yr) | -0.068% | -7.7% | $44.88 (-0.273%) | in range -237550..-233480, 1 range, HYPE 60.09 |
| Project X 0.05% ±10%, own rule | $44.02 | $0.6335 (1.408%, 160.1%/yr) | -2.167% | -246.5% | $44.76 (-0.524%) | in range -236430..-234420, 3 ranges, HYPE 60.01 |
| Project X 0.05% ±20%, own rule | $45.06 | $0.3064 (0.681%, 77.4%/yr) | 0.144% | 16.4% | $44.76 (-0.524%) | in range -237510..-233440, 1 range, HYPE 60.01 |
| Project X 0.3% ±10%, own rule | $44.10 | $0.7361 (1.636%, 186.0%/yr) | -1.998% | -227.2% | $44.76 (-0.543%) | in range -236460..-234360, 3 ranges, HYPE 59.86 |
| HLP (Hypercore vault) | $45.01 | $0.0120 (0.027%, 3.0%/yr) | 0.027% | 3.0% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0162 (0.036%, 4.1%/yr) | 0.036% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0184 (0.041%, 4.6%/yr) | 0.041% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 4.56% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0182 (0.040%, 4.6%/yr) | 0.040% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 4.56% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
