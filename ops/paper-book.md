# Paper book, junior strategies

Marked 2026-11-28T10:10:56Z, 6.72 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.38 | $0.6503 (1.440%, 78.2%/yr) | -1.731% | -94.0% | $46.14 (2.163%) | in range -235650..-233640, 4 ranges, HYPE 63.03 |
| Nest ±20%, own rule | $46.22 | $0.3495 (0.777%, 42.2%/yr) | 2.721% | 147.8% | $45.97 (2.160%) | in range -237550..-233480, 1 range, HYPE 63.03 |
| Project X 0.05% ±10%, own rule | $45.12 | $1.3663 (3.036%, 164.9%/yr) | 0.271% | 14.7% | $45.83 (1.854%) | in range -235680..-233660, 4 ranges, HYPE 62.90 |
| Project X 0.05% ±20%, own rule | $46.44 | $0.6725 (1.494%, 81.1%/yr) | 3.189% | 173.2% | $45.83 (1.854%) | in range -237510..-233440, 1 range, HYPE 62.90 |
| Project X 0.3% ±10%, own rule | $45.29 | $1.5312 (3.403%, 184.8%/yr) | 0.654% | 35.5% | $45.94 (2.093%) | in range -235620..-233580, 4 ranges, HYPE 63.05 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.92 | $0.5495 (1.221%, 66.3%/yr) | -0.177% | -9.6% | $45.00 (0.000%) | LP fees $0.5604 + funding $0.0272 − hedge fees $0.0382 (49 trades); short 0.2447 vs LP 0.2610 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.96 | $1.2056 (2.679%, 145.5%/yr) | -0.093% | -5.0% | $45.00 (0.000%) | LP fees $1.2692 + funding $0.0301 − hedge fees $0.0937 (86 trades); short 0.3579 vs LP 0.3808 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.00 | $0.0027 (0.006%, 0.3%/yr) | 0.006% | 0.3% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0338 (0.075%, 4.1%/yr) | 0.075% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.04 | $0.0353 (0.078%, 4.3%/yr) | 0.078% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.91% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.04 | $0.0351 (0.078%, 4.2%/yr) | 0.078% | 4.2% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.29% realised 24h, HyperLend 3.91% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
