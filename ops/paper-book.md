# Paper book, junior strategies

Marked 2026-11-27T12:14:44Z, 5.81 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.36 | $0.5208 (1.153%, 72.5%/yr) | 0.435% | 27.3% | $47.22 (4.555%) | in range -235650..-233640, 4 ranges, HYPE 65.92 |
| Nest ±20%, own rule | $46.91 | $0.2805 (0.623%, 39.2%/yr) | 4.242% | 266.6% | $47.05 (4.556%) | in range -237550..-233480, 1 range, HYPE 65.92 |
| Project X 0.05% ±10%, own rule | $46.03 | $1.2008 (2.668%, 167.7%/yr) | 2.294% | 144.2% | $46.90 (4.230%) | in range -235680..-233660, 4 ranges, HYPE 65.78 |
| Project X 0.05% ±20%, own rule | $47.14 | $0.6029 (1.340%, 84.2%/yr) | 4.759% | 299.1% | $46.90 (4.230%) | in range -237510..-233440, 1 range, HYPE 65.78 |
| Project X 0.3% ±10%, own rule | $46.14 | $1.3384 (2.974%, 186.9%/yr) | 2.543% | 159.8% | $46.93 (4.296%) | in range -235620..-233580, 4 ranges, HYPE 65.72 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.97 | $0.4936 (1.097%, 68.9%/yr) | -0.065% | -4.1% | $45.00 (0.000%) | LP fees $0.5024 + funding $0.0248 − hedge fees $0.0337 (42 trades); short 0.1885 vs LP 0.1969 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.07 | $1.0546 (2.343%, 147.3%/yr) | 0.164% | 10.3% | $45.00 (0.000%) | LP fees $1.1114 + funding $0.0267 − hedge fees $0.0836 (78 trades); short 0.2574 vs LP 0.2630 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0092 (0.020%, 1.3%/yr) | 0.020% | 1.3% | $45.00 (0.000%) | Hypercore reports 14.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0289 (0.064%, 4.0%/yr) | 0.064% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0309 (0.069%, 4.3%/yr) | 0.069% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.94% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0307 (0.068%, 4.3%/yr) | 0.068% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.05% realised 24h, HyperLend 3.94% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
