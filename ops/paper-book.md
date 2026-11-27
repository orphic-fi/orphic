# Paper book, junior strategies

Marked 2026-11-27T17:15:51Z, 6.02 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.85 | $0.5867 (1.299%, 78.8%/yr) | -0.704% | -42.7% | $46.61 (3.191%) | in range -235650..-233640, 4 ranges, HYPE 64.27 |
| Nest ±20%, own rule | $46.54 | $0.3156 (0.701%, 42.5%/yr) | 3.426% | 207.8% | $46.44 (3.190%) | in range -237550..-233480, 1 range, HYPE 64.27 |
| Project X 0.05% ±10%, own rule | $45.60 | $1.2833 (2.852%, 173.0%/yr) | 1.326% | 80.4% | $46.33 (2.964%) | in range -235680..-233660, 4 ranges, HYPE 64.24 |
| Project X 0.05% ±20%, own rule | $46.79 | $0.6372 (1.416%, 85.9%/yr) | 3.977% | 241.3% | $46.33 (2.964%) | in range -237510..-233440, 1 range, HYPE 64.24 |
| Project X 0.3% ±10%, own rule | $45.74 | $1.4257 (3.168%, 192.2%/yr) | 1.646% | 99.8% | $46.42 (3.159%) | in range -235620..-233580, 4 ranges, HYPE 64.34 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.92 | $0.5207 (1.157%, 70.2%/yr) | -0.171% | -10.3% | $45.00 (0.000%) | LP fees $0.5310 + funding $0.0255 − hedge fees $0.0358 (44 trades); short 0.2295 vs LP 0.2305 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.97 | $1.1218 (2.493%, 151.2%/yr) | -0.062% | -3.8% | $45.00 (0.000%) | LP fees $1.1829 + funding $0.0277 − hedge fees $0.0887 (82 trades); short 0.3088 vs LP 0.3228 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0101 (0.022%, 1.4%/yr) | 0.022% | 1.4% | $45.00 (0.000%) | Hypercore reports 14.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0301 (0.067%, 4.1%/yr) | 0.067% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0319 (0.071%, 4.3%/yr) | 0.071% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.93% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0317 (0.071%, 4.3%/yr) | 0.071% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.12% realised 24h, HyperLend 3.93% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
