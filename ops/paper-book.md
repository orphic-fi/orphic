# Paper book, junior strategies

Marked 2026-11-27T01:34:21Z, 5.36 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.69 | $0.4457 (0.987%, 67.2%/yr) | -1.040% | -70.8% | $46.09 (2.040%) | in range -236420..-234400, 3 ranges, HYPE 62.88 |
| Nest ±20%, own rule | $46.07 | $0.2409 (0.535%, 36.4%/yr) | 2.380% | 162.0% | $45.92 (2.037%) | in range -237550..-233480, 1 range, HYPE 62.88 |
| Project X 0.05% ±10%, own rule | $45.27 | $1.0952 (2.434%, 165.6%/yr) | 0.605% | 41.2% | $45.77 (1.721%) | in range -236430..-234420, 3 ranges, HYPE 62.74 |
| Project X 0.05% ±20%, own rule | $46.25 | $0.5411 (1.202%, 81.8%/yr) | 2.786% | 189.6% | $45.77 (1.721%) | in range -237510..-233440, 1 range, HYPE 62.74 |
| Project X 0.3% ±10%, own rule | $45.48 | $1.2200 (2.711%, 184.5%/yr) | 1.059% | 72.1% | $45.88 (1.945%) | in range -236460..-234360, 3 ranges, HYPE 62.87 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.00 | $0.4418 (0.982%, 66.8%/yr) | -0.009% | -0.6% | $45.00 (0.000%) | LP fees $0.4509 + funding $0.0217 − hedge fees $0.0308 (38 trades); short 0.2578 vs LP 0.2638 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.11 | $0.9635 (2.141%, 145.7%/yr) | 0.241% | 16.4% | $45.00 (0.000%) | LP fees $1.0133 + funding $0.0228 − hedge fees $0.0725 (72 trades); short 0.1833 vs LP 0.1851 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0100 (0.022%, 1.5%/yr) | 0.022% | 1.5% | $45.00 (0.000%) | Hypercore reports 15.0% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0267 (0.059%, 4.0%/yr) | 0.059% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0288 (0.064%, 4.4%/yr) | 0.064% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0286 (0.063%, 4.3%/yr) | 0.063% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
