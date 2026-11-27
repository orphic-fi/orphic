# Paper book, junior strategies

Marked 2026-11-27T20:29:26Z, 6.15 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.78 | $0.6007 (1.330%, 78.9%/yr) | -0.861% | -51.1% | $46.53 (3.015%) | in range -235650..-233640, 4 ranges, HYPE 64.06 |
| Nest ±20%, own rule | $46.49 | $0.3231 (0.718%, 42.6%/yr) | 3.315% | 196.7% | $46.36 (3.013%) | in range -237550..-233480, 1 range, HYPE 64.06 |
| Project X 0.05% ±10%, own rule | $45.51 | $1.3068 (2.904%, 172.3%/yr) | 1.142% | 67.8% | $46.23 (2.737%) | in range -235680..-233660, 4 ranges, HYPE 63.97 |
| Project X 0.05% ±20%, own rule | $46.72 | $0.6476 (1.439%, 85.4%/yr) | 3.832% | 227.4% | $46.23 (2.737%) | in range -237510..-233440, 1 range, HYPE 63.97 |
| Project X 0.3% ±10%, own rule | $45.59 | $1.4617 (3.248%, 192.7%/yr) | 1.315% | 78.0% | $46.25 (2.782%) | in range -235620..-233580, 4 ranges, HYPE 63.89 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5296 (1.177%, 69.8%/yr) | -0.156% | -9.3% | $45.00 (0.000%) | LP fees $0.5397 + funding $0.0261 − hedge fees $0.0362 (45 trades); short 0.2415 vs LP 0.2367 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.98 | $1.1509 (2.558%, 151.7%/yr) | -0.034% | -2.0% | $45.00 (0.000%) | LP fees $1.2123 + funding $0.0285 − hedge fees $0.0899 (83 trades); short 0.3497 vs LP 0.3431 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0086 (0.019%, 1.1%/yr) | 0.019% | 1.1% | $45.00 (0.000%) | Hypercore reports 14.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0308 (0.068%, 4.1%/yr) | 0.068% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0325 (0.072%, 4.3%/yr) | 0.072% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.94% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0323 (0.072%, 4.3%/yr) | 0.072% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.15% realised 24h, HyperLend 3.94% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
