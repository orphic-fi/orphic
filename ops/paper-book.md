# Paper book, junior strategies

Marked 2026-11-28T07:33:00Z, 6.61 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.76 | $0.6436 (1.425%, 78.7%/yr) | -0.886% | -48.9% | $46.48 (2.904%) | in range -235650..-233640, 4 ranges, HYPE 63.92 |
| Nest ±20%, own rule | $46.48 | $0.3460 (0.769%, 42.4%/yr) | 3.285% | 181.3% | $46.31 (2.902%) | in range -237550..-233480, 1 range, HYPE 63.92 |
| Project X 0.05% ±10%, own rule | $45.49 | $1.3586 (3.019%, 166.7%/yr) | 1.097% | 60.6% | $46.16 (2.587%) | in range -235680..-233660, 4 ranges, HYPE 63.79 |
| Project X 0.05% ±20%, own rule | $46.70 | $0.6726 (1.495%, 82.5%/yr) | 3.774% | 208.3% | $46.16 (2.587%) | in range -237510..-233440, 1 range, HYPE 63.79 |
| Project X 0.3% ±10%, own rule | $45.59 | $1.5219 (3.382%, 186.7%/yr) | 1.317% | 72.7% | $46.20 (2.665%) | in range -235620..-233580, 4 ranges, HYPE 63.75 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.92 | $0.5493 (1.221%, 67.4%/yr) | -0.174% | -9.6% | $45.00 (0.000%) | LP fees $0.5605 + funding $0.0270 − hedge fees $0.0382 (49 trades); short 0.2447 vs LP 0.2409 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.95 | $1.1976 (2.661%, 146.9%/yr) | -0.102% | -5.6% | $45.00 (0.000%) | LP fees $1.2616 + funding $0.0297 − hedge fees $0.0937 (86 trades); short 0.3579 vs LP 0.3497 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.00 | $0.0037 (0.008%, 0.5%/yr) | 0.008% | 0.5% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0332 (0.074%, 4.1%/yr) | 0.074% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0347 (0.077%, 4.3%/yr) | 0.077% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.91% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0345 (0.077%, 4.2%/yr) | 0.077% | 4.2% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.25% realised 24h, HyperLend 3.91% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
