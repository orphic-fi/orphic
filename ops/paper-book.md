# Paper book, junior strategies

Marked 2026-11-27T16:45:12Z, 6.00 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.03 | $0.5836 (1.292%, 78.7%/yr) | -0.299% | -18.2% | $46.79 (3.595%) | in range -235650..-233640, 4 ranges, HYPE 64.76 |
| Nest ±20%, own rule | $46.67 | $0.3140 (0.698%, 42.5%/yr) | 3.704% | 225.5% | $46.62 (3.595%) | in range -237550..-233480, 1 range, HYPE 64.76 |
| Project X 0.05% ±10%, own rule | $45.78 | $1.2795 (2.843%, 173.1%/yr) | 1.730% | 105.3% | $46.52 (3.384%) | in range -235680..-233660, 4 ranges, HYPE 64.75 |
| Project X 0.05% ±20%, own rule | $46.92 | $0.6375 (1.417%, 86.2%/yr) | 4.278% | 260.4% | $46.52 (3.384%) | in range -237510..-233440, 1 range, HYPE 64.75 |
| Project X 0.3% ±10%, own rule | $45.88 | $1.4220 (3.160%, 192.4%/yr) | 1.947% | 118.5% | $46.56 (3.459%) | in range -235620..-233580, 4 ranges, HYPE 64.71 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.92 | $0.5207 (1.157%, 70.4%/yr) | -0.180% | -11.0% | $45.00 (0.000%) | LP fees $0.5312 + funding $0.0253 − hedge fees $0.0358 (44 trades); short 0.2295 vs LP 0.2193 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.97 | $1.1190 (2.487%, 151.4%/yr) | -0.066% | -4.0% | $45.00 (0.000%) | LP fees $1.1798 + funding $0.0274 − hedge fees $0.0882 (81 trades); short 0.3273 vs LP 0.3070 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0098 (0.022%, 1.3%/yr) | 0.022% | 1.3% | $45.00 (0.000%) | Hypercore reports 14.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0299 (0.067%, 4.0%/yr) | 0.067% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0318 (0.071%, 4.3%/yr) | 0.071% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.92% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0316 (0.070%, 4.3%/yr) | 0.070% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.12% realised 24h, HyperLend 3.92% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
