# Paper book, junior strategies

Marked 2026-11-26T18:48:34Z, 5.08 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.19 | $0.3504 (0.776%, 55.7%/yr) | -2.167% | -155.6% | $45.49 (0.723%) | in range -236420..-234400, 3 ranges, HYPE 61.28 |
| Nest ±20%, own rule | $45.50 | $0.1920 (0.427%, 30.6%/yr) | 1.120% | 80.5% | $45.32 (0.718%) | in range -237550..-233480, 1 range, HYPE 61.28 |
| Project X 0.05% ±10%, own rule | $44.81 | $1.0391 (2.309%, 165.9%/yr) | -0.428% | -30.7% | $45.18 (0.406%) | in range -236430..-234420, 3 ranges, HYPE 61.14 |
| Project X 0.05% ±20%, own rule | $45.69 | $0.5095 (1.132%, 81.3%/yr) | 1.530% | 109.9% | $45.18 (0.406%) | in range -237510..-233440, 1 range, HYPE 61.14 |
| Project X 0.3% ±10%, own rule | $44.92 | $1.1599 (2.578%, 185.1%/yr) | -0.185% | -13.3% | $45.17 (0.386%) | in range -236460..-234360, 3 ranges, HYPE 60.99 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.02 | $0.4164 (0.925%, 66.5%/yr) | 0.043% | 3.1% | $45.00 (0.000%) | LP fees $0.4246 + funding $0.0202 − hedge fees $0.0283 (34 trades); short 0.3036 vs LP 0.3008 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.15 | $0.9166 (2.037%, 146.3%/yr) | 0.328% | 23.6% | $45.00 (0.000%) | LP fees $0.9621 + funding $0.0216 − hedge fees $0.0671 (67 trades); short 0.2998 vs LP 0.2728 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0127 (0.028%, 2.0%/yr) | 0.028% | 2.0% | $45.00 (0.000%) | Hypercore reports 15.7% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0253 (0.056%, 4.0%/yr) | 0.056% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0274 (0.061%, 4.4%/yr) | 0.061% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0272 (0.061%, 4.3%/yr) | 0.061% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
