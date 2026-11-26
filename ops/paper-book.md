# Paper book, junior strategies

Marked 2026-11-26T01:40:14Z, 4.37 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.17 | $0.2643 (0.585%, 48.9%/yr) | -2.206% | -184.4% | $45.58 (0.914%) | in range -236420..-234400, 3 ranges, HYPE 61.51 |
| Nest ±20%, own rule | $45.54 | $0.1478 (0.328%, 27.4%/yr) | 1.199% | 100.2% | $45.41 (0.909%) | in range -237550..-233480, 1 range, HYPE 61.51 |
| Project X 0.05% ±10%, own rule | mark failed | | | | | |
| Project X 0.05% ±20%, own rule | mark failed | | | | | |
| Project X 0.3% ±10%, own rule | mark failed | | | | | |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | mark failed | | | | | |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | mark failed | | | | | |
| HLP (Hypercore vault) | $45.01 | $0.0133 (0.030%, 2.5%/yr) | 0.030% | 2.5% | $45.00 (0.000%) | Hypercore reports 15.5% APR trailing; 4-day exit |
| Felix USDC, hold | mark failed | | | | | |
| HyperLend USDC, hold | $45.02 | $0.0240 (0.053%, 4.5%/yr) | 0.053% | 4.5% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | mark failed | | | | | |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Errors this mark: px05_10: HTTP request failed.; px05_20: HTTP request failed.; px30_10: HTTP request failed.; px05_20h: HTTP request failed.; px30_10h: HTTP request failed.; felix: HTTP request failed.; rotation: HTTP request failed.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
