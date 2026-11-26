# Paper book, junior strategies

Marked 2026-11-26T08:35:28Z, 4.66 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.06 | $0.2714 (0.601%, 47.1%/yr) | -2.455% | -192.5% | $45.43 (0.586%) | in range -236420..-234400, 3 ranges, HYPE 61.12 |
| Nest ±20%, own rule | $45.41 | $0.1514 (0.337%, 26.4%/yr) | 0.901% | 70.6% | $45.26 (0.580%) | in range -237550..-233480, 1 range, HYPE 61.12 |
| Project X 0.05% ±10%, own rule | $44.75 | $0.9744 (2.165%, 169.8%/yr) | -0.544% | -42.7% | $45.20 (0.439%) | in range -236430..-234420, 3 ranges, HYPE 61.18 |
| Project X 0.05% ±20%, own rule | $45.67 | $0.4777 (1.061%, 83.2%/yr) | 1.491% | 116.9% | $45.20 (0.439%) | in range -237510..-233440, 1 range, HYPE 61.18 |
| Project X 0.3% ±10%, own rule | $44.90 | $1.0868 (2.415%, 189.3%/yr) | -0.222% | -17.4% | $45.24 (0.536%) | in range -236460..-234360, 3 ranges, HYPE 61.17 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.99 | $0.3876 (0.861%, 67.5%/yr) | -0.021% | -1.7% | $45.00 (0.000%) | LP fees $0.3980 + funding $0.0179 − hedge fees $0.0283 (34 trades); short 0.3036 vs LP 0.2997 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.15 | $0.8564 (1.903%, 149.2%/yr) | 0.328% | 25.7% | $45.00 (0.000%) | LP fees $0.8999 + funding $0.0196 − hedge fees $0.0630 (62 trades); short 0.2718 vs LP 0.2636 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0143 (0.032%, 2.5%/yr) | 0.032% | 2.5% | $45.00 (0.000%) | Hypercore reports 15.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0232 (0.051%, 4.0%/yr) | 0.051% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0254 (0.056%, 4.4%/yr) | 0.056% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0252 (0.056%, 4.4%/yr) | 0.056% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.91% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
