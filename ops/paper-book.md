# Paper book, junior strategies

Marked 2026-11-27T03:49:18Z, 5.46 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.29 | $0.4729 (1.047%, 70.0%/yr) | 0.274% | 18.4% | $47.19 (4.491%) | in range -235650..-233640, 4 ranges, HYPE 65.84 |
| Nest ±20%, own rule | $46.87 | $0.2550 (0.567%, 37.9%/yr) | 4.147% | 277.4% | $47.02 (4.492%) | in range -237550..-233480, 1 range, HYPE 65.84 |
| Project X 0.05% ±10%, own rule | $45.98 | $1.1442 (2.543%, 170.1%/yr) | 2.183% | 146.0% | $46.91 (4.248%) | in range -235680..-233660, 4 ranges, HYPE 65.80 |
| Project X 0.05% ±20%, own rule | $47.12 | $0.5749 (1.278%, 85.4%/yr) | 4.708% | 314.9% | $46.91 (4.248%) | in range -237510..-233440, 1 range, HYPE 65.80 |
| Project X 0.3% ±10%, own rule | $46.17 | $1.2841 (2.854%, 190.9%/yr) | 2.594% | 173.5% | $47.02 (4.499%) | in range -235620..-233580, 4 ranges, HYPE 65.97 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.96 | $0.4692 (1.043%, 69.7%/yr) | -0.079% | -5.3% | $45.00 (0.000%) | LP fees $0.4791 + funding $0.0221 − hedge fees $0.0320 (39 trades); short 0.2167 vs LP 0.1963 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.05 | $1.0094 (2.243%, 150.0%/yr) | 0.101% | 6.8% | $45.00 (0.000%) | LP fees $1.0670 + funding $0.0231 − hedge fees $0.0807 (74 trades); short 0.2882 vs LP 0.2523 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0103 (0.023%, 1.5%/yr) | 0.023% | 1.5% | $45.00 (0.000%) | Hypercore reports 14.3% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0272 (0.060%, 4.0%/yr) | 0.060% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0292 (0.065%, 4.3%/yr) | 0.065% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 4.10% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0290 (0.064%, 4.3%/yr) | 0.064% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 4.10% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
