# Paper book, junior strategies

Marked 2026-11-26T22:02:15Z, 5.22 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.72 | $0.4071 (0.901%, 63.1%/yr) | -0.985% | -68.9% | $46.20 (2.294%) | in range -236420..-234400, 3 ranges, HYPE 63.18 |
| Nest ±20%, own rule | $46.14 | $0.2211 (0.491%, 34.4%/yr) | 2.540% | 177.8% | $46.03 (2.291%) | in range -237550..-233480, 1 range, HYPE 63.18 |
| Project X 0.05% ±10%, own rule | $45.29 | $1.0793 (2.399%, 167.8%/yr) | 0.638% | 44.7% | $45.83 (1.843%) | in range -236430..-234420, 3 ranges, HYPE 62.88 |
| Project X 0.05% ±20%, own rule | $46.29 | $0.5336 (1.186%, 83.0%/yr) | 2.871% | 200.9% | $45.83 (1.843%) | in range -237510..-233440, 1 range, HYPE 62.88 |
| Project X 0.3% ±10%, own rule | $45.47 | $1.1999 (2.667%, 186.6%/yr) | 1.046% | 73.2% | $45.90 (2.001%) | in range -236460..-234360, 3 ranges, HYPE 62.94 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.01 | $0.4360 (0.969%, 67.8%/yr) | 0.015% | 1.1% | $45.00 (0.000%) | LP fees $0.4447 + funding $0.0210 − hedge fees $0.0297 (36 trades); short 0.2549 vs LP 0.2604 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.12 | $0.9479 (2.106%, 147.4%/yr) | 0.264% | 18.5% | $45.00 (0.000%) | LP fees $0.9962 + funding $0.0223 − hedge fees $0.0706 (70 trades); short 0.1737 vs LP 0.1819 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0109 (0.024%, 1.7%/yr) | 0.024% | 1.7% | $45.00 (0.000%) | Hypercore reports 15.7% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0259 (0.058%, 4.0%/yr) | 0.058% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0281 (0.062%, 4.4%/yr) | 0.062% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0279 (0.062%, 4.3%/yr) | 0.062% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
