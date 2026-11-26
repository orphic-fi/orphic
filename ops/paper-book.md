# Paper book, junior strategies

Marked 2026-11-26T00:08:22Z, 4.30 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.23 | $0.2590 (0.574%, 48.6%/yr) | -2.068% | -175.4% | $45.67 (1.111%) | in range -236420..-234400, 3 ranges, HYPE 61.75 |
| Nest ±20%, own rule | $45.62 | $0.1451 (0.322%, 27.4%/yr) | 1.372% | 116.4% | $45.50 (1.107%) | in range -237550..-233480, 1 range, HYPE 61.75 |
| Project X 0.05% ±10%, own rule | $44.88 | $0.9343 (2.076%, 176.1%/yr) | -0.256% | -21.7% | $45.42 (0.936%) | in range -236430..-234420, 3 ranges, HYPE 61.78 |
| Project X 0.05% ±20%, own rule | $45.86 | $0.4593 (1.021%, 86.6%/yr) | 1.916% | 162.5% | $45.42 (0.936%) | in range -237510..-233440, 1 range, HYPE 61.78 |
| Project X 0.3% ±10%, own rule | $45.01 | $1.0479 (2.329%, 197.5%/yr) | 0.015% | 1.3% | $45.43 (0.946%) | in range -236460..-234360, 3 ranges, HYPE 61.66 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.98 | $0.3711 (0.825%, 69.9%/yr) | -0.045% | -3.8% | $45.00 (0.000%) | LP fees $0.3827 + funding $0.0162 − hedge fees $0.0278 (33 trades); short 0.2845 vs LP 0.2853 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.13 | $0.8234 (1.830%, 155.2%/yr) | 0.291% | 24.7% | $45.00 (0.000%) | LP fees $0.8668 + funding $0.0181 − hedge fees $0.0615 (60 trades); short 0.2509 vs LP 0.2399 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0123 (0.027%, 2.3%/yr) | 0.027% | 2.3% | $45.00 (0.000%) | Hypercore reports 15.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0215 (0.048%, 4.0%/yr) | 0.048% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0237 (0.053%, 4.5%/yr) | 0.053% | 4.5% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0235 (0.052%, 4.4%/yr) | 0.052% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.88% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
