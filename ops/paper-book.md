# Paper book, junior strategies

Marked 2026-11-26T18:33:17Z, 5.07 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.10 | $0.3488 (0.772%, 55.6%/yr) | -2.353% | -169.4% | $45.39 (0.503%) | in range -236420..-234400, 3 ranges, HYPE 61.02 |
| Nest ±20%, own rule | $45.41 | $0.1912 (0.425%, 30.6%/yr) | 0.911% | 65.6% | $45.22 (0.498%) | in range -237550..-233480, 1 range, HYPE 61.02 |
| Project X 0.05% ±10%, own rule | $44.72 | $1.0371 (2.305%, 165.9%/yr) | -0.612% | -44.0% | $45.09 (0.190%) | in range -236430..-234420, 3 ranges, HYPE 60.88 |
| Project X 0.05% ±20%, own rule | $45.59 | $0.5079 (1.129%, 81.2%/yr) | 1.317% | 94.8% | $45.09 (0.190%) | in range -237510..-233440, 1 range, HYPE 60.88 |
| Project X 0.3% ±10%, own rule | $44.84 | $1.1568 (2.571%, 185.0%/yr) | -0.351% | -25.3% | $45.09 (0.202%) | in range -236460..-234360, 3 ranges, HYPE 60.76 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.02 | $0.4151 (0.922%, 66.4%/yr) | 0.042% | 3.0% | $45.00 (0.000%) | LP fees $0.4233 + funding $0.0202 − hedge fees $0.0283 (34 trades); short 0.3036 vs LP 0.3071 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.15 | $0.9140 (2.031%, 146.2%/yr) | 0.335% | 24.1% | $45.00 (0.000%) | LP fees $0.9595 + funding $0.0216 − hedge fees $0.0671 (67 trades); short 0.2998 vs LP 0.2834 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0127 (0.028%, 2.0%/yr) | 0.028% | 2.0% | $45.00 (0.000%) | Hypercore reports 15.7% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0252 (0.056%, 4.0%/yr) | 0.056% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0274 (0.061%, 4.4%/yr) | 0.061% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0272 (0.060%, 4.3%/yr) | 0.060% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
