# Paper book, junior strategies

Marked 2026-11-27T07:32:36Z, 5.61 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.38 | $0.4938 (1.093%, 71.1%/yr) | 0.467% | 30.4% | $47.27 (4.667%) | in range -235650..-233640, 4 ranges, HYPE 66.06 |
| Nest ±20%, own rule | $46.92 | $0.2661 (0.591%, 38.5%/yr) | 4.277% | 278.2% | $47.10 (4.669%) | in range -237550..-233480, 1 range, HYPE 66.06 |
| Project X 0.05% ±10%, own rule | $46.08 | $1.1741 (2.609%, 169.7%/yr) | 2.408% | 156.6% | $47.00 (4.452%) | in range -235680..-233660, 4 ranges, HYPE 66.05 |
| Project X 0.05% ±20%, own rule | $47.19 | $0.5908 (1.313%, 85.4%/yr) | 4.868% | 316.6% | $47.00 (4.452%) | in range -237510..-233440, 1 range, HYPE 66.05 |
| Project X 0.3% ±10%, own rule | $46.25 | $1.3057 (2.901%, 188.7%/yr) | 2.788% | 181.3% | $47.11 (4.679%) | in range -235620..-233580, 4 ranges, HYPE 66.18 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.97 | $0.4836 (1.075%, 69.9%/yr) | -0.059% | -3.8% | $45.00 (0.000%) | LP fees $0.4923 + funding $0.0240 − hedge fees $0.0328 (40 trades); short 0.1918 vs LP 0.1911 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.07 | $1.0282 (2.285%, 148.6%/yr) | 0.145% | 9.4% | $45.00 (0.000%) | LP fees $1.0846 + funding $0.0256 − hedge fees $0.0820 (76 trades); short 0.2431 vs LP 0.2433 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0098 (0.022%, 1.4%/yr) | 0.022% | 1.4% | $45.00 (0.000%) | Hypercore reports 14.3% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0279 (0.062%, 4.0%/yr) | 0.062% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0299 (0.067%, 4.3%/yr) | 0.067% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 4.13% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0297 (0.066%, 4.3%/yr) | 0.066% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 4.13% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
