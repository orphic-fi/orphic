# Paper book, junior strategies

Marked 2026-11-26T02:38:42Z, 4.41 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.20 | $0.2656 (0.588%, 48.7%/yr) | -2.130% | -176.4% | $45.62 (1.009%) | in range -236420..-234400, 3 ranges, HYPE 61.63 |
| Nest ±20%, own rule | $45.58 | $0.1485 (0.330%, 27.3%/yr) | 1.287% | 106.6% | $45.45 (1.005%) | in range -237550..-233480, 1 range, HYPE 61.63 |
| Project X 0.05% ±10%, own rule | $44.86 | $0.9556 (2.124%, 175.8%/yr) | -0.302% | -25.0% | $45.36 (0.808%) | in range -236430..-234420, 3 ranges, HYPE 61.63 |
| Project X 0.05% ±20%, own rule | $45.82 | $0.4694 (1.043%, 86.4%/yr) | 1.820% | 150.7% | $45.36 (0.808%) | in range -237510..-233440, 1 range, HYPE 61.63 |
| Project X 0.3% ±10%, own rule | $45.06 | $1.0717 (2.382%, 197.2%/yr) | 0.128% | 10.6% | $45.46 (1.026%) | in range -236460..-234360, 3 ranges, HYPE 61.76 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.99 | $0.3800 (0.844%, 69.9%/yr) | -0.025% | -2.0% | $45.00 (0.000%) | LP fees $0.3912 + funding $0.0166 − hedge fees $0.0278 (33 trades); short 0.2845 vs LP 0.2890 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.15 | $0.8436 (1.875%, 155.2%/yr) | 0.331% | 27.4% | $45.00 (0.000%) | LP fees $0.8871 + funding $0.0185 − hedge fees $0.0620 (61 trades); short 0.2339 vs LP 0.2355 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0127 (0.028%, 2.3%/yr) | 0.028% | 2.3% | $45.00 (0.000%) | Hypercore reports 15.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0220 (0.049%, 4.0%/yr) | 0.049% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0242 (0.054%, 4.4%/yr) | 0.054% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0240 (0.053%, 4.4%/yr) | 0.053% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.88% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
