# Paper book, junior strategies

Marked 2026-11-26T04:45:31Z, 4.50 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.29 | $0.2684 (0.594%, 48.2%/yr) | -1.940% | -157.5% | $45.73 (1.258%) | in range -236420..-234400, 3 ranges, HYPE 61.93 |
| Nest ±20%, own rule | $45.68 | $0.1499 (0.333%, 27.0%/yr) | 1.513% | 122.9% | $45.56 (1.254%) | in range -237550..-233480, 1 range, HYPE 61.93 |
| Project X 0.05% ±10%, own rule | $44.96 | $0.9646 (2.144%, 174.0%/yr) | -0.085% | -6.9% | $45.49 (1.083%) | in range -236430..-234420, 3 ranges, HYPE 61.96 |
| Project X 0.05% ±20%, own rule | $45.94 | $0.4747 (1.055%, 85.6%/yr) | 2.083% | 169.1% | $45.49 (1.083%) | in range -237510..-233440, 1 range, HYPE 61.96 |
| Project X 0.3% ±10%, own rule | $45.09 | $1.0772 (2.394%, 194.3%/yr) | 0.211% | 17.1% | $45.51 (1.124%) | in range -236460..-234360, 3 ranges, HYPE 61.88 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.99 | $0.3848 (0.855%, 69.4%/yr) | -0.016% | -1.3% | $45.00 (0.000%) | LP fees $0.3956 + funding $0.0170 − hedge fees $0.0278 (33 trades); short 0.2845 vs LP 0.2812 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.15 | $0.8486 (1.886%, 153.1%/yr) | 0.342% | 27.7% | $45.00 (0.000%) | LP fees $0.8918 + funding $0.0188 − hedge fees $0.0620 (61 trades); short 0.2339 vs LP 0.2300 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0127 (0.028%, 2.3%/yr) | 0.028% | 2.3% | $45.00 (0.000%) | Hypercore reports 15.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0224 (0.050%, 4.0%/yr) | 0.050% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0246 (0.055%, 4.4%/yr) | 0.055% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0244 (0.054%, 4.4%/yr) | 0.054% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.91% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
