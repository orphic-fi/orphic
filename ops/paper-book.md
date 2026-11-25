# Paper book, junior strategies

Marked 2026-11-25T23:55:39Z, 4.29 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.17 | $0.2584 (0.572%, 48.6%/yr) | -2.211% | -187.9% | $45.58 (0.924%) | in range -236420..-234400, 3 ranges, HYPE 61.53 |
| Nest ±20%, own rule | $45.54 | $0.1448 (0.322%, 27.3%/yr) | 1.202% | 102.1% | $45.41 (0.920%) | in range -237550..-233480, 1 range, HYPE 61.53 |
| Project X 0.05% ±10%, own rule | $44.83 | $0.9325 (2.072%, 176.1%/yr) | -0.385% | -32.7% | $45.34 (0.764%) | in range -236430..-234420, 3 ranges, HYPE 61.58 |
| Project X 0.05% ±20%, own rule | $45.79 | $0.4579 (1.017%, 86.5%/yr) | 1.755% | 149.1% | $45.34 (0.764%) | in range -237510..-233440, 1 range, HYPE 61.58 |
| Project X 0.3% ±10%, own rule | $44.93 | $1.0448 (2.322%, 197.3%/yr) | -0.147% | -12.5% | $45.33 (0.744%) | in range -236460..-234360, 3 ranges, HYPE 61.42 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.98 | $0.3697 (0.822%, 69.8%/yr) | -0.048% | -4.1% | $45.00 (0.000%) | LP fees $0.3816 + funding $0.0159 − hedge fees $0.0278 (33 trades); short 0.2845 vs LP 0.2902 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.13 | $0.8206 (1.823%, 155.0%/yr) | 0.289% | 24.5% | $45.00 (0.000%) | LP fees $0.8641 + funding $0.0179 − hedge fees $0.0615 (60 trades); short 0.2509 vs LP 0.2514 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0128 (0.028%, 2.4%/yr) | 0.028% | 2.4% | $45.00 (0.000%) | Hypercore reports 15.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0214 (0.048%, 4.0%/yr) | 0.048% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0237 (0.053%, 4.5%/yr) | 0.053% | 4.5% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0235 (0.052%, 4.4%/yr) | 0.052% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.88% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
