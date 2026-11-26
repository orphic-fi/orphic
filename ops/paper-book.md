# Paper book, junior strategies

Marked 2026-11-26T04:22:19Z, 4.48 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.27 | $0.2680 (0.593%, 48.4%/yr) | -1.982% | -161.5% | $45.71 (1.200%) | in range -236420..-234400, 3 ranges, HYPE 61.86 |
| Nest ±20%, own rule | $45.66 | $0.1497 (0.333%, 27.1%/yr) | 1.462% | 119.1% | $45.54 (1.196%) | in range -237550..-233480, 1 range, HYPE 61.86 |
| Project X 0.05% ±10%, own rule | $44.94 | $0.9635 (2.141%, 174.4%/yr) | -0.135% | -11.0% | $45.46 (1.015%) | in range -236430..-234420, 3 ranges, HYPE 61.88 |
| Project X 0.05% ±20%, own rule | $45.91 | $0.4740 (1.053%, 85.8%/yr) | 2.020% | 164.6% | $45.46 (1.015%) | in range -237510..-233440, 1 range, HYPE 61.88 |
| Project X 0.3% ±10%, own rule | $45.08 | $1.0767 (2.393%, 194.9%/yr) | 0.183% | 14.9% | $45.49 (1.087%) | in range -236460..-234360, 3 ranges, HYPE 61.84 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.99 | $0.3842 (0.854%, 69.6%/yr) | -0.016% | -1.3% | $45.00 (0.000%) | LP fees $0.3950 + funding $0.0170 − hedge fees $0.0278 (33 trades); short 0.2845 vs LP 0.2832 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.15 | $0.8481 (1.885%, 153.6%/yr) | 0.341% | 27.8% | $45.00 (0.000%) | LP fees $0.8913 + funding $0.0188 − hedge fees $0.0620 (61 trades); short 0.2339 vs LP 0.2321 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0127 (0.028%, 2.3%/yr) | 0.028% | 2.3% | $45.00 (0.000%) | Hypercore reports 15.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0223 (0.050%, 4.0%/yr) | 0.050% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0245 (0.055%, 4.4%/yr) | 0.055% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0243 (0.054%, 4.4%/yr) | 0.054% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.91% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
