# Paper book, junior strategies

Marked 2026-11-27T23:57:12Z, 6.30 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.57 | $0.6149 (1.361%, 78.9%/yr) | -1.310% | -75.9% | $46.33 (2.585%) | in range -235650..-233640, 4 ranges, HYPE 63.54 |
| Nest ±20%, own rule | $46.35 | $0.3306 (0.735%, 42.6%/yr) | 3.011% | 174.5% | $46.16 (2.583%) | in range -237550..-233480, 1 range, HYPE 63.54 |
| Project X 0.05% ±10%, own rule | $45.32 | $1.3203 (2.934%, 170.1%/yr) | 0.715% | 41.4% | $46.04 (2.319%) | in range -235680..-233660, 4 ranges, HYPE 63.46 |
| Project X 0.05% ±20%, own rule | $46.58 | $0.6521 (1.449%, 84.0%/yr) | 3.520% | 204.1% | $46.04 (2.319%) | in range -237510..-233440, 1 range, HYPE 63.46 |
| Project X 0.3% ±10%, own rule | $45.36 | $1.4803 (3.290%, 190.7%/yr) | 0.794% | 46.0% | $46.03 (2.299%) | in range -235620..-233580, 4 ranges, HYPE 63.30 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.94 | $0.5338 (1.186%, 68.8%/yr) | -0.143% | -8.3% | $45.00 (0.000%) | LP fees $0.5434 + funding $0.0266 − hedge fees $0.0362 (45 trades); short 0.2415 vs LP 0.2480 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.00 | $1.1668 (2.593%, 150.3%/yr) | -0.005% | -0.3% | $45.00 (0.000%) | LP fees $1.2276 + funding $0.0291 − hedge fees $0.0899 (83 trades); short 0.3497 vs LP 0.3692 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0056 (0.012%, 0.7%/yr) | 0.012% | 0.7% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0315 (0.070%, 4.1%/yr) | 0.070% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0332 (0.074%, 4.3%/yr) | 0.074% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.92% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0330 (0.073%, 4.3%/yr) | 0.073% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.19% realised 24h, HyperLend 3.92% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
