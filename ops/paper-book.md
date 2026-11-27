# Paper book, junior strategies

Marked 2026-11-27T06:31:22Z, 5.57 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.39 | $0.4882 (1.081%, 70.8%/yr) | 0.498% | 32.6% | $47.30 (4.720%) | in range -235650..-233640, 4 ranges, HYPE 66.12 |
| Nest ±20%, own rule | $46.94 | $0.2632 (0.585%, 38.3%/yr) | 4.301% | 281.9% | $47.12 (4.722%) | in range -237550..-233480, 1 range, HYPE 66.12 |
| Project X 0.05% ±10%, own rule | $46.08 | $1.1676 (2.595%, 170.0%/yr) | 2.402% | 157.4% | $47.01 (4.462%) | in range -235680..-233660, 4 ranges, HYPE 66.06 |
| Project X 0.05% ±20%, own rule | $47.19 | $0.5876 (1.306%, 85.6%/yr) | 4.868% | 319.0% | $47.01 (4.462%) | in range -237510..-233440, 1 range, HYPE 66.06 |
| Project X 0.3% ±10%, own rule | $46.25 | $1.3005 (2.890%, 189.4%/yr) | 2.767% | 181.3% | $47.10 (4.666%) | in range -235620..-233580, 4 ranges, HYPE 66.17 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.97 | $0.4808 (1.068%, 70.0%/yr) | -0.066% | -4.3% | $45.00 (0.000%) | LP fees $0.4897 + funding $0.0239 − hedge fees $0.0328 (40 trades); short 0.1918 vs LP 0.1908 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.06 | $1.0241 (2.276%, 149.1%/yr) | 0.137% | 9.0% | $45.00 (0.000%) | LP fees $1.0804 + funding $0.0254 − hedge fees $0.0816 (75 trades); short 0.2563 vs LP 0.2439 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0097 (0.021%, 1.4%/yr) | 0.021% | 1.4% | $45.00 (0.000%) | Hypercore reports 14.3% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0277 (0.062%, 4.0%/yr) | 0.062% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0298 (0.066%, 4.3%/yr) | 0.066% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.99% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0296 (0.066%, 4.3%/yr) | 0.066% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.99% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
