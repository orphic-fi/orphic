# Paper book, junior strategies

Marked 2026-11-27T15:16:01Z, 5.93 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.63 | $0.5528 (1.224%, 75.3%/yr) | -1.181% | -72.6% | $46.44 (2.821%) | in range -235650..-233640, 4 ranges, HYPE 63.82 |
| Nest ±20%, own rule | $46.40 | $0.2976 (0.661%, 40.7%/yr) | 3.116% | 191.6% | $46.27 (2.819%) | in range -237550..-233480, 1 range, HYPE 63.82 |
| Project X 0.05% ±10%, own rule | $45.37 | $1.2522 (2.783%, 171.2%/yr) | 0.833% | 51.2% | $46.15 (2.562%) | in range -235680..-233660, 4 ranges, HYPE 63.76 |
| Project X 0.05% ±20%, own rule | $46.64 | $0.6196 (1.377%, 84.7%/yr) | 3.637% | 223.7% | $46.15 (2.562%) | in range -237510..-233440, 1 range, HYPE 63.76 |
| Project X 0.3% ±10%, own rule | $45.52 | $1.3959 (3.102%, 190.8%/yr) | 1.157% | 71.2% | $46.25 (2.772%) | in range -235620..-233580, 4 ranges, HYPE 63.87 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.92 | $0.5061 (1.125%, 69.2%/yr) | -0.185% | -11.4% | $45.00 (0.000%) | LP fees $0.5163 + funding $0.0251 − hedge fees $0.0353 (43 trades); short 0.2463 vs LP 0.2412 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.96 | $1.0981 (2.440%, 150.1%/yr) | -0.085% | -5.3% | $45.00 (0.000%) | LP fees $1.1585 + funding $0.0271 − hedge fees $0.0874 (80 trades); short 0.3531 vs LP 0.3432 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0089 (0.020%, 1.2%/yr) | 0.020% | 1.2% | $45.00 (0.000%) | Hypercore reports 14.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0296 (0.066%, 4.0%/yr) | 0.066% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0315 (0.070%, 4.3%/yr) | 0.070% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.94% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0313 (0.070%, 4.3%/yr) | 0.070% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.08% realised 24h, HyperLend 3.94% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
