# Paper book, junior strategies

Marked 2026-11-28T08:39:11Z, 6.66 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.62 | $0.6458 (1.430%, 78.4%/yr) | -1.206% | -66.1% | $46.35 (2.615%) | in range -235650..-233640, 4 ranges, HYPE 63.57 |
| Nest ±20%, own rule | $46.38 | $0.3471 (0.771%, 42.3%/yr) | 3.070% | 168.3% | $46.18 (2.613%) | in range -237550..-233480, 1 range, HYPE 63.57 |
| Project X 0.05% ±10%, own rule | $45.37 | $1.3621 (3.027%, 165.9%/yr) | 0.822% | 45.1% | $46.05 (2.332%) | in range -235680..-233660, 4 ranges, HYPE 63.48 |
| Project X 0.05% ±20%, own rule | $46.61 | $0.6730 (1.495%, 82.0%/yr) | 3.577% | 196.1% | $46.05 (2.332%) | in range -237510..-233440, 1 range, HYPE 63.48 |
| Project X 0.3% ±10%, own rule | $45.51 | $1.5257 (3.391%, 185.9%/yr) | 1.129% | 61.9% | $46.12 (2.496%) | in range -235620..-233580, 4 ranges, HYPE 63.54 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.92 | $0.5498 (1.222%, 67.0%/yr) | -0.169% | -9.3% | $45.00 (0.000%) | LP fees $0.5608 + funding $0.0271 − hedge fees $0.0382 (49 trades); short 0.2447 vs LP 0.2478 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.96 | $1.2010 (2.669%, 146.3%/yr) | -0.092% | -5.1% | $45.00 (0.000%) | LP fees $1.2648 + funding $0.0300 − hedge fees $0.0937 (86 trades); short 0.3579 vs LP 0.3589 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.00 | $0.0040 (0.009%, 0.5%/yr) | 0.009% | 0.5% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0334 (0.074%, 4.1%/yr) | 0.074% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0350 (0.078%, 4.3%/yr) | 0.078% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.91% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0348 (0.077%, 4.2%/yr) | 0.077% | 4.2% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.29% realised 24h, HyperLend 3.91% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
