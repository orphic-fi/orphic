# Paper book, junior strategies

Marked 2026-11-27T04:32:02Z, 5.49 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.35 | $0.4772 (1.056%, 70.3%/yr) | 0.416% | 27.7% | $47.26 (4.650%) | in range -235650..-233640, 4 ranges, HYPE 66.03 |
| Nest ±20%, own rule | $46.91 | $0.2573 (0.572%, 38.0%/yr) | 4.247% | 282.5% | $47.09 (4.651%) | in range -237550..-233480, 1 range, HYPE 66.03 |
| Project X 0.05% ±10%, own rule | $46.08 | $1.1524 (2.561%, 170.4%/yr) | 2.389% | 159.0% | $47.02 (4.491%) | in range -235680..-233660, 4 ranges, HYPE 66.10 |
| Project X 0.05% ±20%, own rule | $47.19 | $0.5802 (1.289%, 85.8%/yr) | 4.868% | 323.9% | $47.02 (4.491%) | in range -237510..-233440, 1 range, HYPE 66.10 |
| Project X 0.3% ±10%, own rule | $46.21 | $1.2926 (2.872%, 191.1%/yr) | 2.696% | 179.4% | $47.07 (4.601%) | in range -235620..-233580, 4 ranges, HYPE 66.09 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.96 | $0.4737 (1.053%, 70.0%/yr) | -0.082% | -5.4% | $45.00 (0.000%) | LP fees $0.4835 + funding $0.0229 − hedge fees $0.0328 (40 trades); short 0.1918 vs LP 0.1900 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.05 | $1.0164 (2.259%, 150.3%/yr) | 0.121% | 8.1% | $45.00 (0.000%) | LP fees $1.0739 + funding $0.0241 − hedge fees $0.0816 (75 trades); short 0.2563 vs LP 0.2472 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0101 (0.022%, 1.5%/yr) | 0.022% | 1.5% | $45.00 (0.000%) | Hypercore reports 14.3% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0273 (0.061%, 4.0%/yr) | 0.061% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0294 (0.065%, 4.3%/yr) | 0.065% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0292 (0.065%, 4.3%/yr) | 0.065% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
