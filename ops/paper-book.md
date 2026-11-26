# Paper book, junior strategies

Marked 2026-11-26T02:08:07Z, 4.39 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.21 | $0.2650 (0.587%, 48.8%/yr) | -2.109% | -175.5% | $45.63 (1.038%) | in range -236420..-234400, 3 ranges, HYPE 61.66 |
| Nest ±20%, own rule | $45.59 | $0.1482 (0.329%, 27.4%/yr) | 1.313% | 109.2% | $45.47 (1.033%) | in range -237550..-233480, 1 range, HYPE 61.66 |
| Project X 0.05% ±10%, own rule | $44.89 | $0.9536 (2.119%, 176.3%/yr) | -0.246% | -20.5% | $45.40 (0.890%) | in range -236430..-234420, 3 ranges, HYPE 61.73 |
| Project X 0.05% ±20%, own rule | $45.85 | $0.4687 (1.041%, 86.7%/yr) | 1.894% | 157.6% | $45.40 (0.890%) | in range -237510..-233440, 1 range, HYPE 61.73 |
| Project X 0.3% ±10%, own rule | $45.04 | $1.0710 (2.380%, 198.0%/yr) | 0.092% | 7.6% | $45.44 (0.980%) | in range -236460..-234360, 3 ranges, HYPE 61.71 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.99 | $0.3793 (0.843%, 70.1%/yr) | -0.026% | -2.2% | $45.00 (0.000%) | LP fees $0.3905 + funding $0.0166 − hedge fees $0.0278 (33 trades); short 0.2845 vs LP 0.2867 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.15 | $0.8429 (1.873%, 155.9%/yr) | 0.330% | 27.4% | $45.00 (0.000%) | LP fees $0.8864 + funding $0.0185 − hedge fees $0.0620 (61 trades); short 0.2339 vs LP 0.2381 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0136 (0.030%, 2.5%/yr) | 0.030% | 2.5% | $45.00 (0.000%) | Hypercore reports 15.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0219 (0.049%, 4.0%/yr) | 0.049% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0241 (0.054%, 4.5%/yr) | 0.054% | 4.5% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0239 (0.053%, 4.4%/yr) | 0.053% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.91% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
