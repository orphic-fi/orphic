# Paper book, junior strategies

Marked 2026-11-26T20:32:58Z, 5.15 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.71 | $0.3671 (0.813%, 57.6%/yr) | -1.013% | -71.7% | $46.25 (2.410%) | in range -236420..-234400, 3 ranges, HYPE 63.32 |
| Nest ±20%, own rule | $46.16 | $0.2005 (0.446%, 31.6%/yr) | 2.586% | 183.1% | $46.08 (2.407%) | in range -237550..-233480, 1 range, HYPE 63.32 |
| Project X 0.05% ±10%, own rule | $45.33 | $1.0684 (2.374%, 168.1%/yr) | 0.728% | 51.6% | $45.93 (2.060%) | in range -236430..-234420, 3 ranges, HYPE 63.15 |
| Project X 0.05% ±20%, own rule | $46.37 | $0.5288 (1.175%, 83.2%/yr) | 3.039% | 215.2% | $45.93 (2.060%) | in range -237510..-233440, 1 range, HYPE 63.15 |
| Project X 0.3% ±10%, own rule | $45.47 | $1.1912 (2.647%, 187.5%/yr) | 1.055% | 74.7% | $45.92 (2.051%) | in range -236460..-234360, 3 ranges, HYPE 63.00 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.00 | $0.4323 (0.961%, 68.0%/yr) | 0.005% | 0.3% | $45.00 (0.000%) | LP fees $0.4407 + funding $0.0206 − hedge fees $0.0290 (35 trades); short 0.2805 vs LP 0.2543 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.12 | $0.9414 (2.092%, 148.1%/yr) | 0.261% | 18.5% | $45.00 (0.000%) | LP fees $0.9888 + funding $0.0220 − hedge fees $0.0694 (69 trades); short 0.2143 vs LP 0.1790 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0129 (0.029%, 2.0%/yr) | 0.029% | 2.0% | $45.00 (0.000%) | Hypercore reports 15.7% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0257 (0.057%, 4.0%/yr) | 0.057% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0278 (0.062%, 4.4%/yr) | 0.062% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0276 (0.061%, 4.3%/yr) | 0.061% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
