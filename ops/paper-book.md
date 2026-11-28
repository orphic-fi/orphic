# Paper book, junior strategies

Marked 2026-11-28T00:27:48Z, 6.32 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.65 | $0.6166 (1.365%, 78.9%/yr) | -1.140% | -65.9% | $46.40 (2.730%) | in range -235650..-233640, 4 ranges, HYPE 63.71 |
| Nest ±20%, own rule | $46.41 | $0.3316 (0.737%, 42.6%/yr) | 3.123% | 180.4% | $46.23 (2.728%) | in range -237550..-233480, 1 range, HYPE 63.71 |
| Project X 0.05% ±10%, own rule | $45.39 | $1.3222 (2.938%, 169.8%/yr) | 0.866% | 50.0% | $46.10 (2.450%) | in range -235680..-233660, 4 ranges, HYPE 63.62 |
| Project X 0.05% ±20%, own rule | $46.63 | $0.6538 (1.453%, 83.9%/yr) | 3.627% | 209.5% | $46.10 (2.450%) | in range -237510..-233440, 1 range, HYPE 63.62 |
| Project X 0.3% ±10%, own rule | $45.50 | $1.4843 (3.298%, 190.6%/yr) | 1.121% | 64.8% | $46.16 (2.568%) | in range -235620..-233580, 4 ranges, HYPE 63.63 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.94 | $0.5350 (1.189%, 68.7%/yr) | -0.140% | -8.1% | $45.00 (0.000%) | LP fees $0.5448 + funding $0.0264 − hedge fees $0.0362 (45 trades); short 0.2415 vs LP 0.2445 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.00 | $1.1698 (2.599%, 150.2%/yr) | 0.009% | 0.5% | $45.00 (0.000%) | LP fees $1.2308 + funding $0.0288 − hedge fees $0.0899 (83 trades); short 0.3497 vs LP 0.3547 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0057 (0.013%, 0.7%/yr) | 0.013% | 0.7% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0316 (0.070%, 4.1%/yr) | 0.070% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0333 (0.074%, 4.3%/yr) | 0.074% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.92% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0331 (0.074%, 4.3%/yr) | 0.074% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.19% realised 24h, HyperLend 3.92% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
