# Paper book, junior strategies

Marked 2026-11-27T15:46:39Z, 5.96 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.96 | $0.5754 (1.274%, 78.1%/yr) | -0.455% | -27.9% | $46.73 (3.457%) | in range -235650..-233640, 4 ranges, HYPE 64.59 |
| Nest ±20%, own rule | $46.62 | $0.3096 (0.688%, 42.2%/yr) | 3.599% | 220.6% | $46.56 (3.456%) | in range -237550..-233480, 1 range, HYPE 64.59 |
| Project X 0.05% ±10%, own rule | $45.72 | $1.2647 (2.810%, 172.3%/yr) | 1.589% | 97.4% | $46.47 (3.271%) | in range -235680..-233660, 4 ranges, HYPE 64.62 |
| Project X 0.05% ±20%, own rule | $46.88 | $0.6296 (1.399%, 85.7%/yr) | 4.181% | 256.2% | $46.47 (3.271%) | in range -237510..-233440, 1 range, HYPE 64.62 |
| Project X 0.3% ±10%, own rule | $45.81 | $1.4087 (3.130%, 191.9%/yr) | 1.797% | 110.1% | $46.50 (3.340%) | in range -235620..-233580, 4 ranges, HYPE 64.56 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.91 | $0.5144 (1.143%, 70.1%/yr) | -0.203% | -12.4% | $45.00 (0.000%) | LP fees $0.5246 + funding $0.0251 − hedge fees $0.0353 (43 trades); short 0.2463 vs LP 0.2222 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.95 | $1.1086 (2.464%, 151.0%/yr) | -0.102% | -6.2% | $45.00 (0.000%) | LP fees $1.1689 + funding $0.0271 − hedge fees $0.0874 (80 trades); short 0.3531 vs LP 0.3131 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0094 (0.021%, 1.3%/yr) | 0.021% | 1.3% | $45.00 (0.000%) | Hypercore reports 14.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0297 (0.066%, 4.0%/yr) | 0.066% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0316 (0.070%, 4.3%/yr) | 0.070% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.92% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0314 (0.070%, 4.3%/yr) | 0.070% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.12% realised 24h, HyperLend 3.92% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
