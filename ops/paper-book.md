# Paper book, junior strategies

Marked 2026-11-28T05:26:27Z, 6.52 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.57 | $0.6347 (1.405%, 78.6%/yr) | -1.310% | -73.3% | $46.31 (2.546%) | in range -235650..-233640, 4 ranges, HYPE 63.49 |
| Nest ±20%, own rule | $46.35 | $0.3412 (0.758%, 42.4%/yr) | 3.004% | 168.0% | $46.14 (2.543%) | in range -237550..-233480, 1 range, HYPE 63.49 |
| Project X 0.05% ±10%, own rule | $45.30 | $1.3428 (2.984%, 166.9%/yr) | 0.669% | 37.5% | $46.01 (2.236%) | in range -235680..-233660, 4 ranges, HYPE 63.36 |
| Project X 0.05% ±20%, own rule | $46.57 | $0.6629 (1.473%, 82.4%/yr) | 3.478% | 194.6% | $46.01 (2.236%) | in range -237510..-233440, 1 range, HYPE 63.36 |
| Project X 0.3% ±10%, own rule | $45.42 | $1.5058 (3.346%, 187.2%/yr) | 0.943% | 52.7% | $46.07 (2.376%) | in range -235620..-233580, 4 ranges, HYPE 63.40 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5422 (1.205%, 67.4%/yr) | -0.157% | -8.8% | $45.00 (0.000%) | LP fees $0.5524 + funding $0.0269 − hedge fees $0.0371 (47 trades); short 0.2361 vs LP 0.2504 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.98 | $1.1871 (2.638%, 147.6%/yr) | -0.039% | -2.2% | $45.00 (0.000%) | LP fees $1.2484 + funding $0.0296 − hedge fees $0.0909 (84 trades); short 0.3163 vs LP 0.3652 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0051 (0.011%, 0.6%/yr) | 0.011% | 0.6% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0327 (0.073%, 4.1%/yr) | 0.073% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0343 (0.076%, 4.3%/yr) | 0.076% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.91% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0341 (0.076%, 4.2%/yr) | 0.076% | 4.2% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.22% realised 24h, HyperLend 3.91% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
