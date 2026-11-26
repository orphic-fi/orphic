# Paper book, junior strategies

Marked 2026-11-26T23:49:21Z, 5.29 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.54 | $0.4257 (0.942%, 65.0%/yr) | -1.384% | -95.4% | $45.87 (1.559%) | in range -236420..-234400, 3 ranges, HYPE 62.29 |
| Nest ±20%, own rule | $45.88 | $0.2306 (0.512%, 35.4%/yr) | 1.955% | 134.9% | $45.70 (1.555%) | in range -237550..-233480, 1 range, HYPE 62.29 |
| Project X 0.05% ±10%, own rule | $45.13 | $1.0847 (2.411%, 166.3%/yr) | 0.280% | 19.3% | $45.55 (1.229%) | in range -236430..-234420, 3 ranges, HYPE 62.14 |
| Project X 0.05% ±20%, own rule | $46.06 | $0.5345 (1.188%, 81.9%/yr) | 2.346% | 161.9% | $45.55 (1.229%) | in range -237510..-233440, 1 range, HYPE 62.14 |
| Project X 0.3% ±10%, own rule | $45.27 | $1.2067 (2.682%, 185.0%/yr) | 0.593% | 40.9% | $45.57 (1.257%) | in range -236460..-234360, 3 ranges, HYPE 62.04 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.00 | $0.4364 (0.970%, 66.9%/yr) | 0.001% | 0.1% | $45.00 (0.000%) | LP fees $0.4454 + funding $0.0212 − hedge fees $0.0303 (37 trades); short 0.2761 vs LP 0.2775 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.11 | $0.9527 (2.117%, 146.1%/yr) | 0.243% | 16.8% | $45.00 (0.000%) | LP fees $1.0020 + funding $0.0224 − hedge fees $0.0717 (71 trades); short 0.2132 vs LP 0.2234 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0098 (0.022%, 1.5%/yr) | 0.022% | 1.5% | $45.00 (0.000%) | Hypercore reports 15.0% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0263 (0.058%, 4.0%/yr) | 0.058% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0284 (0.063%, 4.4%/yr) | 0.063% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0282 (0.063%, 4.3%/yr) | 0.063% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
