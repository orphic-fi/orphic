# Paper book, junior strategies

Marked 2026-11-27T13:31:16Z, 5.86 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.44 | $0.5265 (1.166%, 72.6%/yr) | 0.615% | 38.3% | $47.31 (4.759%) | in range -235650..-233640, 4 ranges, HYPE 66.17 |
| Nest ±20%, own rule | $46.97 | $0.2835 (0.630%, 39.2%/yr) | 4.369% | 272.1% | $47.14 (4.760%) | in range -237550..-233480, 1 range, HYPE 66.17 |
| Project X 0.05% ±10%, own rule | $46.12 | $1.2067 (2.682%, 167.0%/yr) | 2.492% | 155.2% | $47.01 (4.467%) | in range -235680..-233660, 4 ranges, HYPE 66.07 |
| Project X 0.05% ±20%, own rule | $47.21 | $0.6071 (1.349%, 84.0%/yr) | 4.914% | 306.0% | $47.01 (4.467%) | in range -237510..-233440, 1 range, HYPE 66.07 |
| Project X 0.3% ±10%, own rule | $46.22 | $1.3417 (2.981%, 185.7%/yr) | 2.708% | 168.6% | $47.02 (4.482%) | in range -235620..-233580, 4 ranges, HYPE 65.95 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.97 | $0.4972 (1.105%, 68.8%/yr) | -0.056% | -3.5% | $45.00 (0.000%) | LP fees $0.5059 + funding $0.0250 − hedge fees $0.0337 (42 trades); short 0.1885 vs LP 0.1908 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.08 | $1.0574 (2.350%, 146.3%/yr) | 0.171% | 10.6% | $45.00 (0.000%) | LP fees $1.1141 + funding $0.0269 − hedge fees $0.0836 (78 trades); short 0.2574 vs LP 0.2535 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0094 (0.021%, 1.3%/yr) | 0.021% | 1.3% | $45.00 (0.000%) | Hypercore reports 14.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0292 (0.065%, 4.0%/yr) | 0.065% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0312 (0.069%, 4.3%/yr) | 0.069% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 4.28% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0310 (0.069%, 4.3%/yr) | 0.069% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.08% realised 24h, HyperLend 4.28% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
