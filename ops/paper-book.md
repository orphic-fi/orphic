# Paper book, junior strategies

Marked 2026-11-27T22:13:22Z, 6.22 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.62 | $0.6091 (1.349%, 79.1%/yr) | -1.201% | -70.4% | $46.38 (2.691%) | in range -235650..-233640, 4 ranges, HYPE 63.66 |
| Nest ±20%, own rule | $46.39 | $0.3275 (0.728%, 42.7%/yr) | 3.085% | 180.9% | $46.21 (2.689%) | in range -237550..-233480, 1 range, HYPE 63.66 |
| Project X 0.05% ±10%, own rule | $45.32 | $1.3113 (2.914%, 170.9%/yr) | 0.703% | 41.3% | $46.05 (2.327%) | in range -235680..-233660, 4 ranges, HYPE 63.47 |
| Project X 0.05% ±20%, own rule | $46.58 | $0.6477 (1.439%, 84.4%/yr) | 3.516% | 206.2% | $46.05 (2.327%) | in range -237510..-233440, 1 range, HYPE 63.47 |
| Project X 0.3% ±10%, own rule | $45.48 | $1.4673 (3.261%, 191.2%/yr) | 1.073% | 62.9% | $46.15 (2.559%) | in range -235620..-233580, 4 ranges, HYPE 63.62 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5300 (1.178%, 69.1%/yr) | -0.152% | -8.9% | $45.00 (0.000%) | LP fees $0.5397 + funding $0.0265 − hedge fees $0.0362 (45 trades); short 0.2415 vs LP 0.2478 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.99 | $1.1561 (2.569%, 150.7%/yr) | -0.022% | -1.3% | $45.00 (0.000%) | LP fees $1.2170 + funding $0.0290 − hedge fees $0.0899 (83 trades); short 0.3497 vs LP 0.3551 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0065 (0.014%, 0.8%/yr) | 0.014% | 0.8% | $45.00 (0.000%) | Hypercore reports 14.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0312 (0.069%, 4.1%/yr) | 0.069% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0329 (0.073%, 4.3%/yr) | 0.073% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.91% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0327 (0.073%, 4.3%/yr) | 0.073% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.19% realised 24h, HyperLend 3.91% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
