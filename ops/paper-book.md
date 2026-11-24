# Paper book, junior strategies

Marked 2026-11-24T22:07:34Z, 3.22 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.64 | $0.1601 (0.354%, 40.2%/yr) | -3.384% | -383.6% | $45.09 (-0.167%) | in range -236420..-234400, 3 ranges, HYPE 60.21 |
| Nest ±20%, own rule | $45.02 | $0.0940 (0.209%, 23.7%/yr) | 0.034% | 3.9% | $44.92 (-0.173%) | in range -237550..-233480, 1 range, HYPE 60.21 |
| Project X 0.05% ±10%, own rule | $44.04 | $0.6346 (1.410%, 159.9%/yr) | -2.142% | -242.9% | $44.77 (-0.501%) | in range -236430..-234420, 3 ranges, HYPE 60.04 |
| Project X 0.05% ±20%, own rule | $45.08 | $0.3069 (0.682%, 77.3%/yr) | 0.169% | 19.1% | $44.77 (-0.501%) | in range -237510..-233440, 1 range, HYPE 60.04 |
| Project X 0.3% ±10%, own rule | $44.17 | $0.7379 (1.640%, 185.9%/yr) | -1.849% | -209.6% | $44.82 (-0.400%) | in range -236460..-234360, 3 ranges, HYPE 60.04 |
| HLP (Hypercore vault) | $45.01 | $0.0120 (0.027%, 3.0%/yr) | 0.027% | 3.0% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0162 (0.036%, 4.1%/yr) | 0.036% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0184 (0.041%, 4.6%/yr) | 0.041% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 4.56% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0182 (0.040%, 4.6%/yr) | 0.040% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 4.56% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
