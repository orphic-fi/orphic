# Paper book, junior strategies

Marked 2026-11-26T12:48:46Z, 4.83 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.13 | $0.2780 (0.615%, 46.5%/yr) | -2.299% | -173.7% | $45.51 (0.758%) | in range -236420..-234400, 3 ranges, HYPE 61.33 |
| Nest ±20%, own rule | $45.48 | $0.1548 (0.344%, 26.0%/yr) | 1.071% | 80.9% | $45.34 (0.753%) | in range -237550..-233480, 1 range, HYPE 61.33 |
| Project X 0.05% ±10%, own rule | $44.79 | $0.9970 (2.216%, 167.4%/yr) | -0.460% | -34.7% | $45.22 (0.482%) | in range -236430..-234420, 3 ranges, HYPE 61.23 |
| Project X 0.05% ±20%, own rule | $45.70 | $0.4890 (1.087%, 82.1%/yr) | 1.557% | 117.7% | $45.22 (0.482%) | in range -237510..-233440, 1 range, HYPE 61.23 |
| Project X 0.3% ±10%, own rule | $44.94 | $1.1116 (2.470%, 186.6%/yr) | -0.144% | -10.9% | $45.25 (0.563%) | in range -236460..-234360, 3 ranges, HYPE 61.20 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.00 | $0.3980 (0.884%, 66.8%/yr) | 0.001% | 0.1% | $45.00 (0.000%) | LP fees $0.4075 + funding $0.0189 − hedge fees $0.0283 (34 trades); short 0.3036 vs LP 0.2985 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.12 | $0.8763 (1.947%, 147.1%/yr) | 0.271% | 20.5% | $45.00 (0.000%) | LP fees $0.9210 + funding $0.0204 − hedge fees $0.0651 (64 trades); short 0.2969 vs LP 0.2622 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0128 (0.029%, 2.2%/yr) | 0.029% | 2.2% | $45.00 (0.000%) | Hypercore reports 15.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0241 (0.053%, 4.0%/yr) | 0.053% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0262 (0.058%, 4.4%/yr) | 0.058% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0260 (0.058%, 4.4%/yr) | 0.058% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.91% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
