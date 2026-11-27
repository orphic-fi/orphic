# Paper book, junior strategies

Marked 2026-11-27T06:16:05Z, 5.56 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.41 | $0.4860 (1.076%, 70.7%/yr) | 0.544% | 35.7% | $47.32 (4.784%) | in range -235650..-233640, 4 ranges, HYPE 66.20 |
| Nest ±20%, own rule | $46.95 | $0.2620 (0.582%, 38.2%/yr) | 4.336% | 284.7% | $47.15 (4.785%) | in range -237550..-233480, 1 range, HYPE 66.20 |
| Project X 0.05% ±10%, own rule | $46.12 | $1.1656 (2.590%, 170.1%/yr) | 2.484% | 163.1% | $47.06 (4.577%) | in range -235680..-233660, 4 ranges, HYPE 66.20 |
| Project X 0.05% ±20%, own rule | $47.22 | $0.5873 (1.305%, 85.7%/yr) | 4.936% | 324.1% | $47.06 (4.577%) | in range -237510..-233440, 1 range, HYPE 66.20 |
| Project X 0.3% ±10%, own rule | $46.21 | $1.2986 (2.886%, 189.5%/yr) | 2.697% | 177.1% | $47.06 (4.586%) | in range -235620..-233580, 4 ranges, HYPE 66.07 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.97 | $0.4805 (1.068%, 70.1%/yr) | -0.068% | -4.5% | $45.00 (0.000%) | LP fees $0.4894 + funding $0.0239 − hedge fees $0.0328 (40 trades); short 0.1918 vs LP 0.1879 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.06 | $1.0226 (2.273%, 149.2%/yr) | 0.136% | 8.9% | $45.00 (0.000%) | LP fees $1.0789 + funding $0.0254 − hedge fees $0.0816 (75 trades); short 0.2563 vs LP 0.2480 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0095 (0.021%, 1.4%/yr) | 0.021% | 1.4% | $45.00 (0.000%) | Hypercore reports 14.3% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0277 (0.061%, 4.0%/yr) | 0.061% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0297 (0.066%, 4.3%/yr) | 0.066% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.99% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0295 (0.066%, 4.3%/yr) | 0.066% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.99% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
