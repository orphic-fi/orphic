# Paper book, junior strategies

Marked 2026-11-26T17:49:42Z, 5.04 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.90 | $0.3408 (0.755%, 54.6%/yr) | -2.794% | -202.3% | $45.18 (0.030%) | in range -236420..-234400, 3 ranges, HYPE 60.44 |
| Nest ±20%, own rule | $45.20 | $0.1871 (0.416%, 30.1%/yr) | 0.440% | 31.8% | $45.01 (0.024%) | in range -237550..-233480, 1 range, HYPE 60.44 |
| Project X 0.05% ±10%, own rule | $44.52 | $1.0313 (2.292%, 166.0%/yr) | -1.058% | -76.6% | $44.87 (-0.291%) | in range -236430..-234420, 3 ranges, HYPE 60.30 |
| Project X 0.05% ±20%, own rule | $45.37 | $0.5037 (1.119%, 81.0%/yr) | 0.824% | 59.7% | $44.87 (-0.291%) | in range -237510..-233440, 1 range, HYPE 60.30 |
| Project X 0.3% ±10%, own rule | $44.63 | $1.1486 (2.552%, 184.8%/yr) | -0.823% | -59.6% | $44.87 (-0.285%) | in range -236460..-234360, 3 ranges, HYPE 60.18 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.01 | $0.4114 (0.914%, 66.2%/yr) | 0.025% | 1.8% | $45.00 (0.000%) | LP fees $0.4197 + funding $0.0200 − hedge fees $0.0283 (34 trades); short 0.3036 vs LP 0.3211 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.15 | $0.9068 (2.015%, 145.9%/yr) | 0.326% | 23.6% | $45.00 (0.000%) | LP fees $0.9525 + funding $0.0214 − hedge fees $0.0671 (67 trades); short 0.2998 vs LP 0.3119 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0125 (0.028%, 2.0%/yr) | 0.028% | 2.0% | $45.00 (0.000%) | Hypercore reports 15.7% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0251 (0.056%, 4.0%/yr) | 0.056% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0272 (0.061%, 4.4%/yr) | 0.061% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0270 (0.060%, 4.3%/yr) | 0.060% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
