# Paper book, junior strategies

Marked 2026-11-28T10:30:07Z, 6.74 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.39 | $0.6512 (1.442%, 78.1%/yr) | -1.708% | -92.6% | $46.15 (2.180%) | in range -235650..-233640, 4 ranges, HYPE 63.05 |
| Nest ±20%, own rule | $46.23 | $0.3500 (0.778%, 42.1%/yr) | 2.736% | 148.3% | $45.98 (2.178%) | in range -237550..-233480, 1 range, HYPE 63.05 |
| Project X 0.05% ±10%, own rule | $45.14 | $1.3671 (3.038%, 164.6%/yr) | 0.307% | 16.6% | $45.85 (1.882%) | in range -235680..-233660, 4 ranges, HYPE 62.93 |
| Project X 0.05% ±20%, own rule | $46.45 | $0.6731 (1.496%, 81.1%/yr) | 3.214% | 174.2% | $45.85 (1.882%) | in range -237510..-233440, 1 range, HYPE 62.93 |
| Project X 0.3% ±10%, own rule | $45.29 | $1.5314 (3.403%, 184.4%/yr) | 0.635% | 34.4% | $45.94 (2.078%) | in range -235620..-233580, 4 ranges, HYPE 63.04 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.92 | $0.5500 (1.222%, 66.2%/yr) | -0.175% | -9.5% | $45.00 (0.000%) | LP fees $0.5609 + funding $0.0272 − hedge fees $0.0382 (49 trades); short 0.2447 vs LP 0.2602 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.96 | $1.2058 (2.679%, 145.2%/yr) | -0.094% | -5.1% | $45.00 (0.000%) | LP fees $1.2694 + funding $0.0301 − hedge fees $0.0937 (86 trades); short 0.3579 vs LP 0.3816 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.00 | $0.0027 (0.006%, 0.3%/yr) | 0.006% | 0.3% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0338 (0.075%, 4.1%/yr) | 0.075% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.04 | $0.0353 (0.078%, 4.3%/yr) | 0.078% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.91% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.04 | $0.0351 (0.078%, 4.2%/yr) | 0.078% | 4.2% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.29% realised 24h, HyperLend 3.91% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
