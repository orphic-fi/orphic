# Paper book, junior strategies

Marked 2026-11-26T09:51:52Z, 4.71 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.14 | $0.2729 (0.604%, 46.8%/yr) | -2.257% | -175.0% | $45.54 (0.824%) | in range -236420..-234400, 3 ranges, HYPE 61.41 |
| Nest ±20%, own rule | $45.51 | $0.1522 (0.338%, 26.2%/yr) | 1.126% | 87.3% | $45.37 (0.820%) | in range -237550..-233480, 1 range, HYPE 61.41 |
| Project X 0.05% ±10%, own rule | $44.84 | $0.9800 (2.178%, 168.8%/yr) | -0.360% | -27.9% | $45.30 (0.658%) | in range -236430..-234420, 3 ranges, HYPE 61.45 |
| Project X 0.05% ±20%, own rule | $45.77 | $0.4811 (1.069%, 82.9%/yr) | 1.706% | 132.3% | $45.30 (0.658%) | in range -237510..-233440, 1 range, HYPE 61.45 |
| Project X 0.3% ±10%, own rule | $44.98 | $1.0927 (2.428%, 188.2%/yr) | -0.050% | -3.9% | $45.33 (0.732%) | in range -236460..-234360, 3 ranges, HYPE 61.41 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.99 | $0.3907 (0.868%, 67.3%/yr) | -0.021% | -1.6% | $45.00 (0.000%) | LP fees $0.4009 + funding $0.0182 − hedge fees $0.0283 (34 trades); short 0.3036 vs LP 0.2934 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.15 | $0.8610 (1.913%, 148.3%/yr) | 0.322% | 25.0% | $45.00 (0.000%) | LP fees $0.9049 + funding $0.0198 − hedge fees $0.0637 (63 trades); short 0.2462 vs LP 0.2524 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0127 (0.028%, 2.2%/yr) | 0.028% | 2.2% | $45.00 (0.000%) | Hypercore reports 15.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0234 (0.052%, 4.0%/yr) | 0.052% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0256 (0.057%, 4.4%/yr) | 0.057% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0254 (0.057%, 4.4%/yr) | 0.057% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.88% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
