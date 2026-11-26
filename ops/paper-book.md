# Paper book, junior strategies

Marked 2026-11-26T15:18:55Z, 4.94 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.74 | $0.3029 (0.671%, 49.6%/yr) | -3.156% | -233.4% | $45.05 (-0.258%) | in range -236420..-234400, 3 ranges, HYPE 60.10 |
| Nest ±20%, own rule | $45.05 | $0.1676 (0.372%, 27.5%/yr) | 0.105% | 7.7% | $44.88 (-0.265%) | in range -237550..-233480, 1 range, HYPE 60.10 |
| Project X 0.05% ±10%, own rule | $44.33 | $1.0103 (2.245%, 166.0%/yr) | -1.495% | -110.6% | $44.69 (-0.688%) | in range -236430..-234420, 3 ranges, HYPE 59.81 |
| Project X 0.05% ±20%, own rule | $45.17 | $0.4921 (1.094%, 80.9%/yr) | 0.383% | 28.3% | $44.69 (-0.688%) | in range -237510..-233440, 1 range, HYPE 59.81 |
| Project X 0.3% ±10%, own rule | $44.46 | $1.1267 (2.504%, 185.1%/yr) | -1.191% | -88.0% | $44.73 (-0.602%) | in range -236460..-234360, 3 ranges, HYPE 59.79 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.99 | $0.4013 (0.892%, 65.9%/yr) | -0.019% | -1.4% | $45.00 (0.000%) | LP fees $0.4101 + funding $0.0196 − hedge fees $0.0283 (34 trades); short 0.3036 vs LP 0.3328 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.11 | $0.8882 (1.974%, 146.0%/yr) | 0.247% | 18.3% | $45.00 (0.000%) | LP fees $0.9339 + funding $0.0210 − hedge fees $0.0666 (66 trades); short 0.2845 vs LP 0.3306 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0126 (0.028%, 2.1%/yr) | 0.028% | 2.1% | $45.00 (0.000%) | Hypercore reports 15.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0246 (0.055%, 4.0%/yr) | 0.055% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0267 (0.059%, 4.4%/yr) | 0.059% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0265 (0.059%, 4.4%/yr) | 0.059% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
