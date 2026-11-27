# Paper book, junior strategies

Marked 2026-11-27T22:28:41Z, 6.23 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.61 | $0.6101 (1.351%, 79.1%/yr) | -1.229% | -71.9% | $46.37 (2.664%) | in range -235650..-233640, 4 ranges, HYPE 63.63 |
| Nest ±20%, own rule | $46.38 | $0.3281 (0.729%, 42.7%/yr) | 3.066% | 179.5% | $46.20 (2.663%) | in range -237550..-233480, 1 range, HYPE 63.63 |
| Project X 0.05% ±10%, own rule | $45.34 | $1.3126 (2.917%, 170.8%/yr) | 0.756% | 44.3% | $46.07 (2.371%) | in range -235680..-233660, 4 ranges, HYPE 63.52 |
| Project X 0.05% ±20%, own rule | $46.60 | $0.6486 (1.441%, 84.4%/yr) | 3.553% | 208.0% | $46.07 (2.371%) | in range -237510..-233440, 1 range, HYPE 63.52 |
| Project X 0.3% ±10%, own rule | $45.44 | $1.4682 (3.263%, 191.0%/yr) | 0.976% | 57.2% | $46.11 (2.475%) | in range -235620..-233580, 4 ranges, HYPE 63.52 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5308 (1.180%, 69.1%/yr) | -0.150% | -8.8% | $45.00 (0.000%) | LP fees $0.5405 + funding $0.0265 − hedge fees $0.0362 (45 trades); short 0.2415 vs LP 0.2466 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.99 | $1.1568 (2.571%, 150.5%/yr) | -0.021% | -1.3% | $45.00 (0.000%) | LP fees $1.2177 + funding $0.0290 − hedge fees $0.0899 (83 trades); short 0.3497 vs LP 0.3597 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0066 (0.015%, 0.9%/yr) | 0.015% | 0.9% | $45.00 (0.000%) | Hypercore reports 14.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0312 (0.069%, 4.1%/yr) | 0.069% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0330 (0.073%, 4.3%/yr) | 0.073% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.91% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0328 (0.073%, 4.3%/yr) | 0.073% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.19% realised 24h, HyperLend 3.91% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
