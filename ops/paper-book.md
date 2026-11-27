# Paper book, junior strategies

Marked 2026-11-27T09:01:38Z, 5.67 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.30 | $0.5017 (1.111%, 71.5%/yr) | 0.291% | 18.7% | $47.17 (4.435%) | in range -235650..-233640, 4 ranges, HYPE 65.77 |
| Nest ±20%, own rule | $46.87 | $0.2703 (0.601%, 38.6%/yr) | 4.147% | 266.8% | $47.00 (4.436%) | in range -237550..-233480, 1 range, HYPE 65.77 |
| Project X 0.05% ±10%, own rule | $45.99 | $1.1844 (2.632%, 169.3%/yr) | 2.210% | 142.2% | $46.88 (4.171%) | in range -235680..-233660, 4 ranges, HYPE 65.71 |
| Project X 0.05% ±20%, own rule | $47.12 | $0.5944 (1.321%, 85.0%/yr) | 4.703% | 302.6% | $46.88 (4.171%) | in range -237510..-233440, 1 range, HYPE 65.71 |
| Project X 0.3% ±10%, own rule | $46.09 | $1.3204 (2.934%, 188.8%/yr) | 2.426% | 156.1% | $46.89 (4.208%) | in range -235620..-233580, 4 ranges, HYPE 65.61 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.97 | $0.4865 (1.081%, 69.6%/yr) | -0.063% | -4.1% | $45.00 (0.000%) | LP fees $0.4954 + funding $0.0243 − hedge fees $0.0332 (41 trades); short 0.2061 vs LP 0.1984 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.06 | $1.0397 (2.310%, 148.6%/yr) | 0.139% | 9.0% | $45.00 (0.000%) | LP fees $1.0967 + funding $0.0260 − hedge fees $0.0830 (77 trades); short 0.2766 vs LP 0.2675 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0094 (0.021%, 1.3%/yr) | 0.021% | 1.3% | $45.00 (0.000%) | Hypercore reports 14.3% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0282 (0.063%, 4.0%/yr) | 0.063% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0303 (0.067%, 4.3%/yr) | 0.067% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.93% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0301 (0.067%, 4.3%/yr) | 0.067% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.93% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
