# Paper book, junior strategies

Marked 2026-11-27T02:17:16Z, 5.39 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.87 | $0.4541 (1.005%, 68.0%/yr) | -0.652% | -44.1% | $46.41 (2.755%) | in range -236420..-234400, 3 ranges, HYPE 63.74 |
| Nest ±20%, own rule | $46.33 | $0.2452 (0.545%, 36.9%/yr) | 2.950% | 199.7% | $46.24 (2.753%) | in range -237550..-233480, 1 range, HYPE 63.74 |
| Project X 0.05% ±10%, own rule | $45.45 | $1.1054 (2.456%, 166.2%/yr) | 1.006% | 68.1% | $46.11 (2.474%) | in range -236430..-234420, 3 ranges, HYPE 63.65 |
| Project X 0.05% ±20%, own rule | $46.53 | $0.5483 (1.218%, 82.5%/yr) | 3.411% | 230.8% | $46.11 (2.474%) | in range -237510..-233440, 1 range, HYPE 63.65 |
| Project X 0.3% ±10%, own rule | $45.65 | $1.2332 (2.740%, 185.5%/yr) | 1.441% | 97.5% | $46.18 (2.630%) | in range -236460..-234360, 3 ranges, HYPE 63.70 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.99 | $0.4480 (0.996%, 67.4%/yr) | -0.012% | -0.8% | $45.00 (0.000%) | LP fees $0.4569 + funding $0.0219 − hedge fees $0.0308 (38 trades); short 0.2578 vs LP 0.2431 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.10 | $0.9749 (2.166%, 146.6%/yr) | 0.229% | 15.5% | $45.00 (0.000%) | LP fees $1.0245 + funding $0.0229 − hedge fees $0.0725 (72 trades); short 0.1833 vs LP 0.1477 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0105 (0.023%, 1.6%/yr) | 0.023% | 1.6% | $45.00 (0.000%) | Hypercore reports 15.0% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0268 (0.060%, 4.0%/yr) | 0.060% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0289 (0.064%, 4.3%/yr) | 0.064% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0287 (0.064%, 4.3%/yr) | 0.064% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
