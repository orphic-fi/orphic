# Paper book, junior strategies

Marked 2026-11-26T12:18:12Z, 4.81 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.92 | $0.2757 (0.610%, 46.3%/yr) | -2.755% | -209.0% | $45.27 (0.230%) | in range -236420..-234400, 3 ranges, HYPE 60.69 |
| Nest ±20%, own rule | $45.25 | $0.1537 (0.341%, 25.9%/yr) | 0.564% | 42.8% | $45.10 (0.225%) | in range -237550..-233480, 1 range, HYPE 60.69 |
| Project X 0.05% ±10%, own rule | $44.58 | $0.9921 (2.205%, 167.3%/yr) | -0.924% | -70.1% | $44.98 (-0.052%) | in range -236430..-234420, 3 ranges, HYPE 60.58 |
| Project X 0.05% ±20%, own rule | $45.46 | $0.4849 (1.078%, 81.8%/yr) | 1.025% | 77.8% | $44.98 (-0.052%) | in range -237510..-233440, 1 range, HYPE 60.58 |
| Project X 0.3% ±10%, own rule | $44.74 | $1.1037 (2.453%, 186.1%/yr) | -0.582% | -44.1% | $45.03 (0.077%) | in range -236460..-234360, 3 ranges, HYPE 60.61 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.00 | $0.3946 (0.877%, 66.5%/yr) | -0.006% | -0.4% | $45.00 (0.000%) | LP fees $0.4041 + funding $0.0189 − hedge fees $0.0283 (34 trades); short 0.3036 vs LP 0.3140 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.13 | $0.8696 (1.932%, 146.6%/yr) | 0.286% | 21.7% | $45.00 (0.000%) | LP fees $0.9143 + funding $0.0204 − hedge fees $0.0651 (64 trades); short 0.2969 vs LP 0.2903 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0127 (0.028%, 2.1%/yr) | 0.028% | 2.1% | $45.00 (0.000%) | Hypercore reports 15.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0239 (0.053%, 4.0%/yr) | 0.053% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0261 (0.058%, 4.4%/yr) | 0.058% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0259 (0.058%, 4.4%/yr) | 0.058% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.91% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
