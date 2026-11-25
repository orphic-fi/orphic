# Paper book, junior strategies

Marked 2026-11-25T22:39:09Z, 4.24 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.11 | $0.2559 (0.567%, 48.7%/yr) | -2.333% | -200.8% | $45.51 (0.776%) | in range -236420..-234400, 3 ranges, HYPE 61.35 |
| Nest ±20%, own rule | $45.48 | $0.1435 (0.319%, 27.4%/yr) | 1.063% | 91.4% | $45.35 (0.772%) | in range -237550..-233480, 1 range, HYPE 61.35 |
| Project X 0.05% ±10%, own rule | $44.78 | $0.9270 (2.060%, 177.3%/yr) | -0.490% | -42.2% | $45.29 (0.641%) | in range -236430..-234420, 3 ranges, HYPE 61.43 |
| Project X 0.05% ±20%, own rule | $45.73 | $0.4548 (1.011%, 87.0%/yr) | 1.633% | 140.5% | $45.29 (0.641%) | in range -237510..-233440, 1 range, HYPE 61.43 |
| Project X 0.3% ±10%, own rule | $44.93 | $1.0412 (2.314%, 199.1%/yr) | -0.148% | -12.7% | $45.34 (0.753%) | in range -236460..-234360, 3 ranges, HYPE 61.43 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.98 | $0.3669 (0.815%, 70.2%/yr) | -0.055% | -4.8% | $45.00 (0.000%) | LP fees $0.3790 + funding $0.0157 − hedge fees $0.0278 (33 trades); short 0.2845 vs LP 0.2937 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0126 (0.028%, 2.4%/yr) | 0.028% | 2.4% | $45.00 (0.000%) | Hypercore reports 15.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0212 (0.047%, 4.0%/yr) | 0.047% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0233 (0.052%, 4.5%/yr) | 0.052% | 4.5% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0231 (0.051%, 4.4%/yr) | 0.051% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.91% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged line: same range and rule as Project X 0.05% ±20%, with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; its fees column is LP fees plus funding minus hedge fees, and its hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
