# Paper book, junior strategies

Marked 2026-11-26T20:02:21Z, 5.13 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.51 | $0.3603 (0.798%, 56.7%/yr) | -1.439% | -102.4% | $45.93 (1.696%) | in range -236420..-234400, 3 ranges, HYPE 62.46 |
| Nest ±20%, own rule | $45.90 | $0.1970 (0.438%, 31.1%/yr) | 1.997% | 142.0% | $45.76 (1.692%) | in range -237550..-233480, 1 range, HYPE 62.46 |
| Project X 0.05% ±10%, own rule | $45.14 | $1.0583 (2.352%, 167.2%/yr) | 0.318% | 22.6% | $45.62 (1.379%) | in range -236430..-234420, 3 ranges, HYPE 62.32 |
| Project X 0.05% ±20%, own rule | $46.10 | $0.5218 (1.160%, 82.5%/yr) | 2.450% | 174.2% | $45.62 (1.379%) | in range -237510..-233440, 1 range, HYPE 62.32 |
| Project X 0.3% ±10%, own rule | $45.30 | $1.1814 (2.625%, 186.7%/yr) | 0.677% | 48.1% | $45.66 (1.464%) | in range -236460..-234360, 3 ranges, HYPE 62.29 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.01 | $0.4265 (0.948%, 67.4%/yr) | 0.029% | 2.1% | $45.00 (0.000%) | LP fees $0.4349 + funding $0.0206 − hedge fees $0.0290 (35 trades); short 0.2805 vs LP 0.2732 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.12 | $0.9330 (2.073%, 147.4%/yr) | 0.277% | 19.7% | $45.00 (0.000%) | LP fees $0.9804 + funding $0.0220 − hedge fees $0.0694 (69 trades); short 0.2143 vs LP 0.2116 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0129 (0.029%, 2.0%/yr) | 0.029% | 2.0% | $45.00 (0.000%) | Hypercore reports 15.7% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0255 (0.057%, 4.0%/yr) | 0.057% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0276 (0.061%, 4.4%/yr) | 0.061% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0274 (0.061%, 4.3%/yr) | 0.061% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
