# Paper book, junior strategies

Marked 2026-11-28T09:25:03Z, 6.69 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.62 | $0.6484 (1.436%, 78.3%/yr) | -1.215% | -66.3% | $46.34 (2.602%) | in range -235650..-233640, 4 ranges, HYPE 63.56 |
| Nest ±20%, own rule | $46.38 | $0.3485 (0.774%, 42.3%/yr) | 3.063% | 167.1% | $46.17 (2.600%) | in range -237550..-233480, 1 range, HYPE 63.56 |
| Project X 0.05% ±10%, own rule | $45.36 | $1.3651 (3.034%, 165.5%/yr) | 0.805% | 43.9% | $46.04 (2.311%) | in range -235680..-233660, 4 ranges, HYPE 63.45 |
| Project X 0.05% ±20%, own rule | $46.60 | $0.6744 (1.499%, 81.8%/yr) | 3.563% | 194.4% | $46.04 (2.311%) | in range -237510..-233440, 1 range, HYPE 63.45 |
| Project X 0.3% ±10%, own rule | $45.45 | $1.5284 (3.397%, 185.3%/yr) | 0.995% | 54.3% | $46.07 (2.378%) | in range -235620..-233580, 4 ranges, HYPE 63.40 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5511 (1.225%, 66.8%/yr) | -0.166% | -9.1% | $45.00 (0.000%) | LP fees $0.5620 + funding $0.0273 − hedge fees $0.0382 (49 trades); short 0.2447 vs LP 0.2484 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.96 | $1.2035 (2.675%, 145.9%/yr) | -0.087% | -4.8% | $45.00 (0.000%) | LP fees $1.2670 + funding $0.0303 − hedge fees $0.0937 (86 trades); short 0.3579 vs LP 0.3653 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.00 | $0.0025 (0.005%, 0.3%/yr) | 0.005% | 0.3% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0336 (0.075%, 4.1%/yr) | 0.075% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.04 | $0.0351 (0.078%, 4.3%/yr) | 0.078% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.91% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0349 (0.078%, 4.2%/yr) | 0.078% | 4.2% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.29% realised 24h, HyperLend 3.91% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
