# Paper book, junior strategies

Marked 2026-11-26T07:23:03Z, 4.61 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.03 | $0.2703 (0.599%, 47.4%/yr) | -2.517% | -199.5% | $45.40 (0.515%) | in range -236420..-234400, 3 ranges, HYPE 61.03 |
| Nest ±20%, own rule | $45.37 | $0.1509 (0.335%, 26.6%/yr) | 0.833% | 66.0% | $45.23 (0.510%) | in range -237550..-233480, 1 range, HYPE 61.03 |
| Project X 0.05% ±10%, own rule | $44.72 | $0.9705 (2.157%, 170.9%/yr) | -0.616% | -48.8% | $45.16 (0.362%) | in range -236430..-234420, 3 ranges, HYPE 61.09 |
| Project X 0.05% ±20%, own rule | $45.64 | $0.4755 (1.057%, 83.7%/yr) | 1.412% | 111.9% | $45.16 (0.362%) | in range -237510..-233440, 1 range, HYPE 61.09 |
| Project X 0.3% ±10%, own rule | $44.84 | $1.0841 (2.409%, 190.9%/yr) | -0.346% | -27.4% | $45.18 (0.394%) | in range -236460..-234360, 3 ranges, HYPE 61.00 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.99 | $0.3856 (0.857%, 67.9%/yr) | -0.025% | -1.9% | $45.00 (0.000%) | LP fees $0.3963 + funding $0.0177 − hedge fees $0.0283 (34 trades); short 0.3036 vs LP 0.3019 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.15 | $0.8540 (1.898%, 150.4%/yr) | 0.325% | 25.8% | $45.00 (0.000%) | LP fees $0.8976 + funding $0.0194 − hedge fees $0.0630 (62 trades); short 0.2718 vs LP 0.2718 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0139 (0.031%, 2.4%/yr) | 0.031% | 2.4% | $45.00 (0.000%) | Hypercore reports 15.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0229 (0.051%, 4.0%/yr) | 0.051% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0251 (0.056%, 4.4%/yr) | 0.056% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0249 (0.055%, 4.4%/yr) | 0.055% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.88% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
