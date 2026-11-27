# Paper book, junior strategies

Marked 2026-11-27T14:30:01Z, 5.90 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.30 | $0.5345 (1.183%, 73.2%/yr) | 0.295% | 18.2% | $47.13 (4.354%) | in range -235650..-233640, 4 ranges, HYPE 65.68 |
| Nest ±20%, own rule | $46.86 | $0.2878 (0.640%, 39.6%/yr) | 4.136% | 255.8% | $46.96 (4.355%) | in range -237550..-233480, 1 range, HYPE 65.68 |
| Project X 0.05% ±10%, own rule | $45.98 | $1.2140 (2.698%, 166.8%/yr) | 2.174% | 134.5% | $46.82 (4.048%) | in range -235680..-233660, 4 ranges, HYPE 65.56 |
| Project X 0.05% ±20%, own rule | $47.10 | $0.6085 (1.352%, 83.6%/yr) | 4.656% | 288.0% | $46.82 (4.048%) | in range -237510..-233440, 1 range, HYPE 65.56 |
| Project X 0.3% ±10%, own rule | $46.16 | $1.3515 (3.003%, 185.7%/yr) | 2.572% | 159.0% | $46.93 (4.295%) | in range -235620..-233580, 4 ranges, HYPE 65.72 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.97 | $0.4985 (1.108%, 68.5%/yr) | -0.057% | -3.6% | $45.00 (0.000%) | LP fees $0.5071 + funding $0.0251 − hedge fees $0.0337 (42 trades); short 0.1885 vs LP 0.2017 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.07 | $1.0651 (2.367%, 146.4%/yr) | 0.162% | 10.0% | $45.00 (0.000%) | LP fees $1.1221 + funding $0.0271 − hedge fees $0.0842 (79 trades); short 0.2380 vs LP 0.2632 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0094 (0.021%, 1.3%/yr) | 0.021% | 1.3% | $45.00 (0.000%) | Hypercore reports 14.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0294 (0.065%, 4.0%/yr) | 0.065% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0314 (0.070%, 4.3%/yr) | 0.070% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.93% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0311 (0.069%, 4.3%/yr) | 0.069% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.08% realised 24h, HyperLend 3.93% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
