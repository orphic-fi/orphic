# Paper book, junior strategies

Marked 2026-11-26T21:34:10Z, 5.20 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.79 | $0.3844 (0.851%, 59.8%/yr) | -0.821% | -57.7% | $46.39 (2.724%) | in range -236420..-234400, 3 ranges, HYPE 63.70 |
| Nest ±20%, own rule | $46.28 | $0.2094 (0.465%, 32.7%/yr) | 2.847% | 200.0% | $46.23 (2.722%) | in range -237550..-233480, 1 range, HYPE 63.70 |
| Project X 0.05% ±10%, own rule | $45.39 | $1.0786 (2.397%, 168.4%/yr) | 0.867% | 60.9% | $46.03 (2.298%) | in range -236430..-234420, 3 ranges, HYPE 63.44 |
| Project X 0.05% ±20%, own rule | $46.46 | $0.5346 (1.188%, 83.4%/yr) | 3.243% | 227.7% | $46.03 (2.298%) | in range -237510..-233440, 1 range, HYPE 63.44 |
| Project X 0.3% ±10%, own rule | $45.54 | $1.1977 (2.662%, 186.9%/yr) | 1.198% | 84.1% | $46.03 (2.290%) | in range -236460..-234360, 3 ranges, HYPE 63.29 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.00 | $0.4366 (0.970%, 68.2%/yr) | 0.011% | 0.8% | $45.00 (0.000%) | LP fees $0.4455 + funding $0.0208 − hedge fees $0.0297 (36 trades); short 0.2549 vs LP 0.2478 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.12 | $0.9459 (2.102%, 147.6%/yr) | 0.257% | 18.1% | $45.00 (0.000%) | LP fees $0.9943 + funding $0.0222 − hedge fees $0.0706 (70 trades); short 0.1737 vs LP 0.1659 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0108 (0.024%, 1.7%/yr) | 0.024% | 1.7% | $45.00 (0.000%) | Hypercore reports 15.7% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0259 (0.057%, 4.0%/yr) | 0.057% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0280 (0.062%, 4.4%/yr) | 0.062% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0278 (0.062%, 4.3%/yr) | 0.062% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
