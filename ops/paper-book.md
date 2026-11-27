# Paper book, junior strategies

Marked 2026-11-27T01:19:03Z, 5.35 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.72 | $0.4437 (0.982%, 67.0%/yr) | -0.994% | -67.8% | $46.13 (2.129%) | in range -236420..-234400, 3 ranges, HYPE 62.98 |
| Nest ±20%, own rule | $46.10 | $0.2399 (0.533%, 36.3%/yr) | 2.451% | 167.1% | $45.96 (2.127%) | in range -237550..-233480, 1 range, HYPE 62.98 |
| Project X 0.05% ±10%, own rule | $45.30 | $1.0942 (2.432%, 165.8%/yr) | 0.666% | 45.4% | $45.82 (1.833%) | in range -236430..-234420, 3 ranges, HYPE 62.87 |
| Project X 0.05% ±20%, own rule | $46.30 | $0.5409 (1.202%, 82.0%/yr) | 2.879% | 196.3% | $45.82 (1.833%) | in range -237510..-233440, 1 range, HYPE 62.87 |
| Project X 0.3% ±10%, own rule | $45.49 | $1.2195 (2.710%, 184.8%/yr) | 1.096% | 74.7% | $45.91 (2.011%) | in range -236460..-234360, 3 ranges, HYPE 62.95 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.00 | $0.4416 (0.981%, 66.9%/yr) | -0.009% | -0.6% | $45.00 (0.000%) | LP fees $0.4508 + funding $0.0217 − hedge fees $0.0308 (38 trades); short 0.2578 vs LP 0.2607 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.11 | $0.9631 (2.140%, 145.9%/yr) | 0.240% | 16.4% | $45.00 (0.000%) | LP fees $1.0129 + funding $0.0228 − hedge fees $0.0725 (72 trades); short 0.1833 vs LP 0.1814 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0099 (0.022%, 1.5%/yr) | 0.022% | 1.5% | $45.00 (0.000%) | Hypercore reports 15.0% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0266 (0.059%, 4.0%/yr) | 0.059% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0287 (0.064%, 4.4%/yr) | 0.064% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0285 (0.063%, 4.3%/yr) | 0.063% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
