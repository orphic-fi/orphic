# Paper book, junior strategies

Marked 2026-11-26T14:33:01Z, 4.90 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.13 | $0.2904 (0.643%, 47.9%/yr) | -2.300% | -171.2% | $45.49 (0.723%) | in range -236420..-234400, 3 ranges, HYPE 61.28 |
| Nest ±20%, own rule | $45.47 | $0.1612 (0.358%, 26.7%/yr) | 1.052% | 78.3% | $45.32 (0.718%) | in range -237550..-233480, 1 range, HYPE 61.28 |
| Project X 0.05% ±10%, own rule | $44.76 | $1.0024 (2.228%, 165.8%/yr) | -0.540% | -40.2% | $45.17 (0.368%) | in range -236430..-234420, 3 ranges, HYPE 61.09 |
| Project X 0.05% ±20%, own rule | $45.65 | $0.4913 (1.092%, 81.3%/yr) | 1.453% | 108.2% | $45.17 (0.368%) | in range -237510..-233440, 1 range, HYPE 61.09 |
| Project X 0.3% ±10%, own rule | $44.90 | $1.1141 (2.476%, 184.3%/yr) | -0.229% | -17.0% | $45.20 (0.454%) | in range -236460..-234360, 3 ranges, HYPE 61.07 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.00 | $0.4004 (0.890%, 66.2%/yr) | 0.008% | 0.6% | $45.00 (0.000%) | LP fees $0.4094 + funding $0.0193 − hedge fees $0.0283 (34 trades); short 0.3036 vs LP 0.3018 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.12 | $0.8779 (1.951%, 145.2%/yr) | 0.275% | 20.4% | $45.00 (0.000%) | LP fees $0.9231 + funding $0.0208 − hedge fees $0.0660 (65 trades); short 0.2624 vs LP 0.2685 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0133 (0.030%, 2.2%/yr) | 0.030% | 2.2% | $45.00 (0.000%) | Hypercore reports 15.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0244 (0.054%, 4.0%/yr) | 0.054% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0266 (0.059%, 4.4%/yr) | 0.059% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0264 (0.059%, 4.4%/yr) | 0.059% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.91% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
