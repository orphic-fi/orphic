# Paper book, junior strategies

Marked 2026-11-28T19:22:00Z, 7.10 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.17 | $0.6832 (1.513%, 77.7%/yr) | -2.192% | -112.6% | $45.95 (1.739%) | in range -235650..-233640, 4 ranges, HYPE 62.51 |
| Nest ±20%, own rule | $46.09 | $0.3670 (0.816%, 41.9%/yr) | 2.411% | 123.9% | $45.78 (1.735%) | in range -237550..-233480, 1 range, HYPE 62.51 |
| Project X 0.05% ±10%, own rule | $44.94 | $1.4033 (3.118%, 160.2%/yr) | -0.140% | -7.2% | $45.66 (1.459%) | in range -235680..-233660, 4 ranges, HYPE 62.42 |
| Project X 0.05% ±20%, own rule | $46.30 | $0.6888 (1.531%, 78.6%/yr) | 2.891% | 148.5% | $45.66 (1.459%) | in range -237510..-233440, 1 range, HYPE 62.42 |
| Project X 0.3% ±10%, own rule | $45.02 | $1.5704 (3.490%, 179.3%/yr) | 0.040% | 2.1% | $45.70 (1.552%) | in range -235620..-233580, 4 ranges, HYPE 62.40 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5627 (1.251%, 64.2%/yr) | -0.154% | -7.9% | $45.00 (0.000%) | LP fees $0.5740 + funding $0.0275 − hedge fees $0.0388 (50 trades); short 0.2663 vs LP 0.2721 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.97 | $1.2368 (2.748%, 141.2%/yr) | -0.065% | -3.3% | $45.00 (0.000%) | LP fees $1.3013 + funding $0.0305 − hedge fees $0.0950 (87 trades); short 0.4057 vs LP 0.4108 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.00 | $0.0008 (0.002%, 0.1%/yr) | 0.002% | 0.1% | $45.00 (0.000%) | Hypercore reports 14.7% APR trailing; 4-day exit |
| Felix USDC, hold | $45.04 | $0.0357 (0.079%, 4.1%/yr) | 0.079% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.04 | $0.0371 (0.082%, 4.2%/yr) | 0.082% | 4.2% | $45.00 (0.000%) | liquidity index; supply APY now 3.86% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.04 | $0.0369 (0.082%, 4.2%/yr) | 0.082% | 4.2% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.22% realised 24h, HyperLend 3.86% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
