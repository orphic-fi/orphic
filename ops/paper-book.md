# Paper book, junior strategies

Marked 2026-11-27T12:45:21Z, 5.83 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.33 | $0.5234 (1.159%, 72.6%/yr) | 0.375% | 23.5% | $47.19 (4.477%) | in range -235650..-233640, 4 ranges, HYPE 65.83 |
| Nest ±20%, own rule | $46.89 | $0.2819 (0.626%, 39.2%/yr) | 4.198% | 262.9% | $47.01 (4.478%) | in range -237550..-233480, 1 range, HYPE 65.83 |
| Project X 0.05% ±10%, own rule | $45.99 | $1.2026 (2.672%, 167.3%/yr) | 2.200% | 137.7% | $46.85 (4.109%) | in range -235680..-233660, 4 ranges, HYPE 65.63 |
| Project X 0.05% ±20%, own rule | $47.11 | $0.6032 (1.340%, 83.9%/yr) | 4.684% | 293.3% | $46.85 (4.109%) | in range -237510..-233440, 1 range, HYPE 65.63 |
| Project X 0.3% ±10%, own rule | $46.13 | $1.3388 (2.975%, 186.3%/yr) | 2.515% | 157.5% | $46.92 (4.263%) | in range -235620..-233580, 4 ranges, HYPE 65.68 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.97 | $0.4938 (1.097%, 68.7%/yr) | -0.067% | -4.2% | $45.00 (0.000%) | LP fees $0.5026 + funding $0.0248 − hedge fees $0.0337 (42 trades); short 0.1885 vs LP 0.2000 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.07 | $1.0549 (2.344%, 146.8%/yr) | 0.164% | 10.3% | $45.00 (0.000%) | LP fees $1.1118 + funding $0.0267 − hedge fees $0.0836 (78 trades); short 0.2574 vs LP 0.2647 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0092 (0.020%, 1.3%/yr) | 0.020% | 1.3% | $45.00 (0.000%) | Hypercore reports 14.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0291 (0.065%, 4.0%/yr) | 0.065% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0310 (0.069%, 4.3%/yr) | 0.069% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.93% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0308 (0.068%, 4.3%/yr) | 0.068% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.05% realised 24h, HyperLend 3.93% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
