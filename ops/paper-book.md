# Paper book, junior strategies

Marked 2026-11-24T21:24:16Z, 3.19 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.58 | $0.1589 (0.352%, 40.3%/yr) | -3.499% | -400.3% | $45.04 (-0.281%) | in range -236420..-234400, 3 ranges, HYPE 60.07 |
| Nest ±20%, own rule | $44.96 | $0.0934 (0.208%, 23.8%/yr) | -0.083% | -9.5% | $44.87 (-0.287%) | in range -237550..-233480, 1 range, HYPE 60.07 |
| Project X 0.05% ±10%, own rule | $43.94 | $0.6305 (1.401%, 160.3%/yr) | -2.345% | -268.3% | $44.69 (-0.694%) | in range -236430..-234420, 3 ranges, HYPE 59.81 |
| Project X 0.05% ±20%, own rule | $44.98 | $0.3043 (0.676%, 77.4%/yr) | -0.040% | -4.6% | $44.69 (-0.694%) | in range -237510..-233440, 1 range, HYPE 59.81 |
| Project X 0.3% ±10%, own rule | $44.07 | $0.7321 (1.627%, 186.2%/yr) | -2.062% | -236.0% | $44.73 (-0.597%) | in range -236460..-234360, 3 ranges, HYPE 59.80 |
| HLP (Hypercore vault) | $45.01 | $0.0119 (0.027%, 3.0%/yr) | 0.027% | 3.0% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0161 (0.036%, 4.1%/yr) | 0.036% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0182 (0.041%, 4.6%/yr) | 0.041% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 4.56% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0180 (0.040%, 4.6%/yr) | 0.040% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 4.56% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
