# Paper book, junior strategies

Marked 2026-11-28T18:00:57Z, 7.05 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.99 | $0.6783 (1.502%, 77.8%/yr) | -2.598% | -134.5% | $45.81 (1.439%) | in range -235650..-233640, 4 ranges, HYPE 62.15 |
| Nest ±20%, own rule | $45.97 | $0.3645 (0.810%, 41.9%/yr) | 2.150% | 111.3% | $45.65 (1.436%) | in range -237550..-233480, 1 range, HYPE 62.15 |
| Project X 0.05% ±10%, own rule | $44.75 | $1.3981 (3.107%, 160.9%/yr) | -0.545% | -28.2% | $45.52 (1.160%) | in range -235680..-233660, 4 ranges, HYPE 62.06 |
| Project X 0.05% ±20%, own rule | $46.18 | $0.6847 (1.521%, 78.8%/yr) | 2.619% | 135.6% | $45.52 (1.160%) | in range -237510..-233440, 1 range, HYPE 62.06 |
| Project X 0.3% ±10%, own rule | $44.86 | $1.5655 (3.479%, 180.1%/yr) | -0.303% | -15.7% | $45.59 (1.308%) | in range -235620..-233580, 4 ranges, HYPE 62.10 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5592 (1.243%, 64.4%/yr) | -0.166% | -8.6% | $45.00 (0.000%) | LP fees $0.5706 + funding $0.0275 − hedge fees $0.0388 (50 trades); short 0.2663 vs LP 0.2804 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.96 | $1.2327 (2.739%, 141.9%/yr) | -0.080% | -4.1% | $45.00 (0.000%) | LP fees $1.2973 + funding $0.0305 − hedge fees $0.0950 (87 trades); short 0.4057 vs LP 0.4243 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.00 | $0.0005 (0.001%, 0.1%/yr) | 0.001% | 0.1% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.04 | $0.0354 (0.079%, 4.1%/yr) | 0.079% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.04 | $0.0368 (0.082%, 4.2%/yr) | 0.082% | 4.2% | $45.00 (0.000%) | liquidity index; supply APY now 3.86% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.04 | $0.0366 (0.081%, 4.2%/yr) | 0.081% | 4.2% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.22% realised 24h, HyperLend 3.86% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
