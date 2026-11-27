# Paper book, junior strategies

Marked 2026-11-27T21:15:20Z, 6.18 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.80 | $0.6034 (1.336%, 78.9%/yr) | -0.799% | -47.2% | $46.55 (3.066%) | in range -235650..-233640, 4 ranges, HYPE 64.12 |
| Nest ±20%, own rule | $46.51 | $0.3245 (0.721%, 42.6%/yr) | 3.356% | 198.1% | $46.38 (3.065%) | in range -237550..-233480, 1 range, HYPE 64.12 |
| Project X 0.05% ±10%, own rule | $45.54 | $1.3094 (2.910%, 171.8%/yr) | 1.197% | 70.7% | $46.25 (2.783%) | in range -235680..-233660, 4 ranges, HYPE 64.02 |
| Project X 0.05% ±20%, own rule | $46.74 | $0.6492 (1.443%, 85.2%/yr) | 3.870% | 228.4% | $46.25 (2.783%) | in range -237510..-233440, 1 range, HYPE 64.02 |
| Project X 0.3% ±10%, own rule | $45.65 | $1.4638 (3.253%, 192.0%/yr) | 1.450% | 85.6% | $46.30 (2.899%) | in range -235620..-233580, 4 ranges, HYPE 64.03 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5311 (1.180%, 69.7%/yr) | -0.154% | -9.1% | $45.00 (0.000%) | LP fees $0.5410 + funding $0.0263 − hedge fees $0.0362 (45 trades); short 0.2415 vs LP 0.2354 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.99 | $1.1529 (2.562%, 151.2%/yr) | -0.033% | -2.0% | $45.00 (0.000%) | LP fees $1.2140 + funding $0.0287 − hedge fees $0.0899 (83 trades); short 0.3497 vs LP 0.3369 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0062 (0.014%, 0.8%/yr) | 0.014% | 0.8% | $45.00 (0.000%) | Hypercore reports 14.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0309 (0.069%, 4.1%/yr) | 0.069% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0326 (0.073%, 4.3%/yr) | 0.073% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0324 (0.072%, 4.3%/yr) | 0.072% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.19% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
