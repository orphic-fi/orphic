# Paper book, junior strategies

Marked 2026-11-28T01:44:17Z, 6.37 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.94 | $0.6201 (1.373%, 78.7%/yr) | -0.501% | -28.7% | $46.66 (3.314%) | in range -235650..-233640, 4 ranges, HYPE 64.42 |
| Nest ±20%, own rule | $46.60 | $0.3335 (0.741%, 42.5%/yr) | 3.553% | 203.6% | $46.49 (3.313%) | in range -237550..-233480, 1 range, HYPE 64.42 |
| Project X 0.05% ±10%, own rule | $45.70 | $1.3295 (2.954%, 169.3%/yr) | 1.546% | 88.6% | $46.39 (3.080%) | in range -235680..-233660, 4 ranges, HYPE 64.38 |
| Project X 0.05% ±20%, own rule | $46.85 | $0.6608 (1.468%, 84.1%/yr) | 4.114% | 235.7% | $46.39 (3.080%) | in range -237510..-233440, 1 range, HYPE 64.38 |
| Project X 0.3% ±10%, own rule | $45.79 | $1.4928 (3.317%, 190.1%/yr) | 1.764% | 101.1% | $46.41 (3.130%) | in range -235620..-233580, 4 ranges, HYPE 64.31 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5406 (1.201%, 68.8%/yr) | -0.145% | -8.3% | $45.00 (0.000%) | LP fees $0.5506 + funding $0.0261 − hedge fees $0.0362 (45 trades); short 0.2415 vs LP 0.2275 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.00 | $1.1764 (2.614%, 149.8%/yr) | 0.006% | 0.4% | $45.00 (0.000%) | LP fees $1.2378 + funding $0.0285 − hedge fees $0.0899 (83 trades); short 0.3497 vs LP 0.3248 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0063 (0.014%, 0.8%/yr) | 0.014% | 0.8% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0319 (0.071%, 4.1%/yr) | 0.071% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0336 (0.075%, 4.3%/yr) | 0.075% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.91% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0334 (0.074%, 4.2%/yr) | 0.074% | 4.2% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.19% realised 24h, HyperLend 3.91% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
