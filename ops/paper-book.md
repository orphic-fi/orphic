# Paper book, junior strategies

Marked 2026-11-26T22:48:10Z, 5.25 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.60 | $0.4165 (0.922%, 64.1%/yr) | -1.247% | -86.7% | $45.98 (1.803%) | in range -236420..-234400, 3 ranges, HYPE 62.59 |
| Nest ±20%, own rule | $45.97 | $0.2259 (0.502%, 34.9%/yr) | 2.152% | 149.7% | $45.81 (1.800%) | in range -237550..-233480, 1 range, HYPE 62.59 |
| Project X 0.05% ±10%, own rule | $45.19 | $1.0809 (2.402%, 167.1%/yr) | 0.425% | 29.5% | $45.66 (1.470%) | in range -236430..-234420, 3 ranges, HYPE 62.43 |
| Project X 0.05% ±20%, own rule | $46.15 | $0.5333 (1.185%, 82.4%/yr) | 2.554% | 177.6% | $45.66 (1.470%) | in range -237510..-233440, 1 range, HYPE 62.43 |
| Project X 0.3% ±10%, own rule | $45.37 | $1.2029 (2.673%, 185.9%/yr) | 0.820% | 57.0% | $45.72 (1.611%) | in range -236460..-234360, 3 ranges, HYPE 62.47 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.00 | $0.4358 (0.968%, 67.3%/yr) | 0.007% | 0.5% | $45.00 (0.000%) | LP fees $0.4444 + funding $0.0210 − hedge fees $0.0297 (36 trades); short 0.2549 vs LP 0.2708 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.11 | $0.9505 (2.112%, 146.9%/yr) | 0.253% | 17.6% | $45.00 (0.000%) | LP fees $0.9987 + funding $0.0223 − hedge fees $0.0706 (70 trades); short 0.1737 vs LP 0.2035 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0111 (0.025%, 1.7%/yr) | 0.025% | 1.7% | $45.00 (0.000%) | Hypercore reports 15.7% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0261 (0.058%, 4.0%/yr) | 0.058% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0282 (0.063%, 4.4%/yr) | 0.063% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0280 (0.062%, 4.3%/yr) | 0.062% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
