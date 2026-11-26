# Paper book, junior strategies

Marked 2026-11-26T16:02:33Z, 4.97 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.04 | $0.3137 (0.695%, 51.0%/yr) | -2.500% | -183.7% | $45.36 (0.423%) | in range -236420..-234400, 3 ranges, HYPE 60.92 |
| Nest ±20%, own rule | $45.36 | $0.1732 (0.385%, 28.3%/yr) | 0.794% | 58.4% | $45.19 (0.417%) | in range -237550..-233480, 1 range, HYPE 60.92 |
| Project X 0.05% ±10%, own rule | $44.70 | $1.0206 (2.268%, 166.7%/yr) | -0.677% | -49.8% | $45.07 (0.157%) | in range -236430..-234420, 3 ranges, HYPE 60.84 |
| Project X 0.05% ±20%, own rule | $45.57 | $0.4997 (1.110%, 81.6%/yr) | 1.266% | 93.0% | $45.07 (0.157%) | in range -237510..-233440, 1 range, HYPE 60.84 |
| Project X 0.3% ±10%, own rule | $44.82 | $1.1399 (2.533%, 186.2%/yr) | -0.399% | -29.3% | $45.09 (0.191%) | in range -236460..-234360, 3 ranges, HYPE 60.75 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.01 | $0.4078 (0.906%, 66.6%/yr) | 0.026% | 1.9% | $45.00 (0.000%) | LP fees $0.4164 + funding $0.0198 − hedge fees $0.0283 (34 trades); short 0.3036 vs LP 0.3080 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.14 | $0.8997 (1.999%, 146.9%/yr) | 0.314% | 23.1% | $45.00 (0.000%) | LP fees $0.9451 + funding $0.0212 − hedge fees $0.0666 (66 trades); short 0.2845 vs LP 0.2840 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0128 (0.029%, 2.1%/yr) | 0.029% | 2.1% | $45.00 (0.000%) | Hypercore reports 15.7% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0247 (0.055%, 4.0%/yr) | 0.055% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0269 (0.060%, 4.4%/yr) | 0.060% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0267 (0.059%, 4.4%/yr) | 0.059% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
