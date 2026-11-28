# Paper book, junior strategies

Marked 2026-11-28T05:41:44Z, 6.54 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.52 | $0.6357 (1.408%, 78.6%/yr) | -1.427% | -79.7% | $46.27 (2.444%) | in range -235650..-233640, 4 ranges, HYPE 63.37 |
| Nest ±20%, own rule | $46.32 | $0.3418 (0.759%, 42.4%/yr) | 2.927% | 163.5% | $46.10 (2.442%) | in range -237550..-233480, 1 range, HYPE 63.37 |
| Project X 0.05% ±10%, own rule | $45.25 | $1.3441 (2.987%, 166.8%/yr) | 0.555% | 31.0% | $45.96 (2.134%) | in range -235680..-233660, 4 ranges, HYPE 63.24 |
| Project X 0.05% ±20%, own rule | $46.53 | $0.6630 (1.473%, 82.3%/yr) | 3.397% | 189.7% | $45.96 (2.134%) | in range -237510..-233440, 1 range, HYPE 63.24 |
| Project X 0.3% ±10%, own rule | $45.40 | $1.5063 (3.347%, 187.0%/yr) | 0.886% | 49.5% | $46.05 (2.328%) | in range -235620..-233580, 4 ranges, HYPE 63.34 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5423 (1.205%, 67.3%/yr) | -0.160% | -8.9% | $45.00 (0.000%) | LP fees $0.5525 + funding $0.0269 − hedge fees $0.0371 (47 trades); short 0.2361 vs LP 0.2532 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.98 | $1.1875 (2.639%, 147.4%/yr) | -0.045% | -2.5% | $45.00 (0.000%) | LP fees $1.2488 + funding $0.0296 − hedge fees $0.0909 (84 trades); short 0.3163 vs LP 0.3679 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.00 | $0.0050 (0.011%, 0.6%/yr) | 0.011% | 0.6% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0328 (0.073%, 4.1%/yr) | 0.073% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0344 (0.076%, 4.3%/yr) | 0.076% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.91% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0342 (0.076%, 4.2%/yr) | 0.076% | 4.2% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.25% realised 24h, HyperLend 3.91% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
