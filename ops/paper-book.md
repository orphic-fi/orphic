# Paper book, junior strategies

Marked 2026-11-28T02:03:08Z, 6.38 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.04 | $0.6208 (1.375%, 78.6%/yr) | -0.276% | -15.8% | $46.76 (3.534%) | in range -235650..-233640, 4 ranges, HYPE 64.68 |
| Nest ±20%, own rule | $46.67 | $0.3338 (0.742%, 42.4%/yr) | 3.706% | 211.9% | $46.59 (3.534%) | in range -237550..-233480, 1 range, HYPE 64.68 |
| Project X 0.05% ±10%, own rule | $45.78 | $1.3313 (2.958%, 169.2%/yr) | 1.738% | 99.4% | $46.47 (3.272%) | in range -235680..-233660, 4 ranges, HYPE 64.62 |
| Project X 0.05% ±20%, own rule | $46.91 | $0.6627 (1.473%, 84.2%/yr) | 4.255% | 243.3% | $46.47 (3.272%) | in range -237510..-233440, 1 range, HYPE 64.62 |
| Project X 0.3% ±10%, own rule | $45.88 | $1.4954 (3.323%, 190.0%/yr) | 1.954% | 111.7% | $46.49 (3.306%) | in range -235620..-233580, 4 ranges, HYPE 64.52 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5418 (1.204%, 68.8%/yr) | -0.152% | -8.7% | $45.00 (0.000%) | LP fees $0.5522 + funding $0.0263 − hedge fees $0.0367 (46 trades); short 0.2231 vs LP 0.2224 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.00 | $1.1778 (2.617%, 149.7%/yr) | -0.004% | -0.2% | $45.00 (0.000%) | LP fees $1.2399 + funding $0.0288 − hedge fees $0.0909 (84 trades); short 0.3163 vs LP 0.3155 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0063 (0.014%, 0.8%/yr) | 0.014% | 0.8% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0320 (0.071%, 4.1%/yr) | 0.071% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0337 (0.075%, 4.3%/yr) | 0.075% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.91% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0335 (0.074%, 4.3%/yr) | 0.074% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.22% realised 24h, HyperLend 3.91% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
