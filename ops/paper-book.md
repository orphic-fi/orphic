# Paper book, junior strategies

Marked 2026-11-27T02:47:51Z, 5.41 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.02 | $0.4620 (1.023%, 69.0%/yr) | -0.309% | -20.8% | $46.79 (3.604%) | in range -236420..-234400, 3 ranges, HYPE 64.77 |
| Nest ±20%, own rule | $46.60 | $0.2492 (0.554%, 37.3%/yr) | 3.566% | 240.4% | $46.62 (3.604%) | in range -237550..-233480, 1 range, HYPE 64.77 |
| Project X 0.05% ±10%, own rule | $45.59 | $1.1220 (2.493%, 168.1%/yr) | 1.305% | 88.0% | $46.49 (3.306%) | in range -235680..-233660, 4 ranges, HYPE 64.66 |
| Project X 0.05% ±20%, own rule | $46.82 | $0.5588 (1.242%, 83.7%/yr) | 4.048% | 272.9% | $46.49 (3.306%) | in range -237510..-233440, 1 range, HYPE 64.66 |
| Project X 0.3% ±10%, own rule | $45.82 | $1.2525 (2.783%, 187.6%/yr) | 1.833% | 123.6% | $46.60 (3.553%) | in range -236460..-234360, 3 ranges, HYPE 64.82 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.97 | $0.4568 (1.015%, 68.4%/yr) | -0.058% | -3.9% | $45.00 (0.000%) | LP fees $0.4657 + funding $0.0219 − hedge fees $0.0308 (38 trades); short 0.2578 vs LP 0.2209 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.05 | $0.9913 (2.203%, 148.5%/yr) | 0.108% | 7.3% | $45.00 (0.000%) | LP fees $1.0409 + funding $0.0229 − hedge fees $0.0725 (72 trades); short 0.1833 vs LP 0.0984 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0100 (0.022%, 1.5%/yr) | 0.022% | 1.5% | $45.00 (0.000%) | Hypercore reports 15.0% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0270 (0.060%, 4.0%/yr) | 0.060% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0290 (0.064%, 4.3%/yr) | 0.064% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0288 (0.064%, 4.3%/yr) | 0.064% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
