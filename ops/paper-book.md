# Paper book, junior strategies

Marked 2026-11-27T15:59:14Z, 5.96 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.87 | $0.5773 (1.278%, 78.2%/yr) | -0.659% | -40.3% | $46.63 (3.254%) | in range -235650..-233640, 4 ranges, HYPE 64.35 |
| Nest ±20%, own rule | $46.56 | $0.3106 (0.690%, 42.2%/yr) | 3.460% | 211.7% | $46.46 (3.253%) | in range -237550..-233480, 1 range, HYPE 64.35 |
| Project X 0.05% ±10%, own rule | $45.61 | $1.2679 (2.818%, 172.4%/yr) | 1.352% | 82.7% | $46.36 (3.024%) | in range -235680..-233660, 4 ranges, HYPE 64.32 |
| Project X 0.05% ±20%, own rule | $46.80 | $0.6298 (1.400%, 85.7%/yr) | 4.004% | 245.1% | $46.36 (3.024%) | in range -237510..-233440, 1 range, HYPE 64.32 |
| Project X 0.3% ±10%, own rule | $45.70 | $1.4128 (3.140%, 192.1%/yr) | 1.555% | 95.2% | $46.40 (3.101%) | in range -235620..-233580, 4 ranges, HYPE 64.27 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.92 | $0.5147 (1.144%, 70.0%/yr) | -0.186% | -11.4% | $45.00 (0.000%) | LP fees $0.5249 + funding $0.0251 − hedge fees $0.0353 (43 trades); short 0.2463 vs LP 0.2288 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.97 | $1.1120 (2.471%, 151.2%/yr) | -0.072% | -4.4% | $45.00 (0.000%) | LP fees $1.1724 + funding $0.0271 − hedge fees $0.0874 (80 trades); short 0.3531 vs LP 0.3258 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0095 (0.021%, 1.3%/yr) | 0.021% | 1.3% | $45.00 (0.000%) | Hypercore reports 14.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0298 (0.066%, 4.0%/yr) | 0.066% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0317 (0.070%, 4.3%/yr) | 0.070% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.92% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0315 (0.070%, 4.3%/yr) | 0.070% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.12% realised 24h, HyperLend 3.92% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
