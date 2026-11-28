# Paper book, junior strategies

Marked 2026-11-28T04:09:58Z, 6.47 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.93 | $0.6283 (1.391%, 78.5%/yr) | -0.508% | -28.6% | $46.65 (3.290%) | in range -235650..-233640, 4 ranges, HYPE 64.39 |
| Nest ±20%, own rule | $46.60 | $0.3378 (0.751%, 42.3%/yr) | 3.545% | 200.0% | $46.48 (3.289%) | in range -237550..-233480, 1 range, HYPE 64.39 |
| Project X 0.05% ±10%, own rule | $45.64 | $1.3376 (2.972%, 167.7%/yr) | 1.421% | 80.1% | $46.32 (2.939%) | in range -235680..-233660, 4 ranges, HYPE 64.21 |
| Project X 0.05% ±20%, own rule | $46.81 | $0.6640 (1.476%, 83.2%/yr) | 4.018% | 226.6% | $46.32 (2.939%) | in range -237510..-233440, 1 range, HYPE 64.21 |
| Project X 0.3% ±10%, own rule | $45.77 | $1.4987 (3.330%, 187.8%/yr) | 1.722% | 97.1% | $46.39 (3.078%) | in range -235620..-233580, 4 ranges, HYPE 64.25 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5433 (1.207%, 68.1%/yr) | -0.148% | -8.3% | $45.00 (0.000%) | LP fees $0.5534 + funding $0.0267 − hedge fees $0.0367 (46 trades); short 0.2231 vs LP 0.2313 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.00 | $1.1811 (2.625%, 148.0%/yr) | 0.001% | 0.1% | $45.00 (0.000%) | LP fees $1.2426 + funding $0.0293 − hedge fees $0.0909 (84 trades); short 0.3163 vs LP 0.3276 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0055 (0.012%, 0.7%/yr) | 0.012% | 0.7% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0325 (0.072%, 4.1%/yr) | 0.072% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0341 (0.076%, 4.3%/yr) | 0.076% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.91% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0339 (0.075%, 4.2%/yr) | 0.075% | 4.2% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.22% realised 24h, HyperLend 3.91% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
