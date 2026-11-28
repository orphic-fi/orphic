# Paper book, junior strategies

Marked 2026-11-28T09:09:46Z, 6.68 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.56 | $0.6472 (1.433%, 78.3%/yr) | -1.347% | -73.6% | $46.29 (2.490%) | in range -235650..-233640, 4 ranges, HYPE 63.42 |
| Nest ±20%, own rule | $46.34 | $0.3479 (0.773%, 42.2%/yr) | 2.976% | 162.6% | $46.12 (2.488%) | in range -237550..-233480, 1 range, HYPE 63.42 |
| Project X 0.05% ±10%, own rule | $45.30 | $1.3637 (3.030%, 165.6%/yr) | 0.667% | 36.5% | $45.99 (2.193%) | in range -235680..-233660, 4 ranges, HYPE 63.31 |
| Project X 0.05% ±20%, own rule | $46.56 | $0.6730 (1.496%, 81.7%/yr) | 3.467% | 189.4% | $45.99 (2.193%) | in range -237510..-233440, 1 range, HYPE 63.31 |
| Project X 0.3% ±10%, own rule | $45.48 | $1.5279 (3.395%, 185.5%/yr) | 1.063% | 58.1% | $46.10 (2.436%) | in range -235620..-233580, 4 ranges, HYPE 63.47 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.92 | $0.5500 (1.222%, 66.8%/yr) | -0.169% | -9.2% | $45.00 (0.000%) | LP fees $0.5609 + funding $0.0273 − hedge fees $0.0382 (49 trades); short 0.2447 vs LP 0.2516 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.96 | $1.2031 (2.673%, 146.1%/yr) | -0.088% | -4.8% | $45.00 (0.000%) | LP fees $1.2665 + funding $0.0303 − hedge fees $0.0937 (86 trades); short 0.3579 vs LP 0.3622 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.00 | $0.0024 (0.005%, 0.3%/yr) | 0.005% | 0.3% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0335 (0.075%, 4.1%/yr) | 0.075% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.04 | $0.0351 (0.078%, 4.3%/yr) | 0.078% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.91% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0349 (0.077%, 4.2%/yr) | 0.077% | 4.2% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.29% realised 24h, HyperLend 3.91% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
