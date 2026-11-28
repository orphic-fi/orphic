# Paper book, junior strategies

Marked 2026-11-28T03:50:15Z, 6.46 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.90 | $0.6261 (1.386%, 78.4%/yr) | -0.591% | -33.4% | $46.62 (3.214%) | in range -235650..-233640, 4 ranges, HYPE 64.30 |
| Nest ±20%, own rule | $46.57 | $0.3366 (0.748%, 42.3%/yr) | 3.489% | 197.2% | $46.45 (3.213%) | in range -237550..-233480, 1 range, HYPE 64.30 |
| Project X 0.05% ±10%, own rule | $45.63 | $1.3366 (2.970%, 167.9%/yr) | 1.390% | 78.5% | $46.31 (2.911%) | in range -235680..-233660, 4 ranges, HYPE 64.18 |
| Project X 0.05% ±20%, own rule | $46.80 | $0.6634 (1.474%, 83.3%/yr) | 3.996% | 225.9% | $46.31 (2.911%) | in range -237510..-233440, 1 range, HYPE 64.18 |
| Project X 0.3% ±10%, own rule | $45.76 | $1.4981 (3.329%, 188.2%/yr) | 1.679% | 94.9% | $46.37 (3.040%) | in range -235620..-233580, 4 ranges, HYPE 64.20 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5426 (1.206%, 68.1%/yr) | -0.150% | -8.5% | $45.00 (0.000%) | LP fees $0.5528 + funding $0.0265 − hedge fees $0.0367 (46 trades); short 0.2231 vs LP 0.2321 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.00 | $1.1803 (2.623%, 148.3%/yr) | -0.002% | -0.1% | $45.00 (0.000%) | LP fees $1.2422 + funding $0.0290 − hedge fees $0.0909 (84 trades); short 0.3163 vs LP 0.3296 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0054 (0.012%, 0.7%/yr) | 0.012% | 0.7% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0324 (0.072%, 4.1%/yr) | 0.072% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0340 (0.076%, 4.3%/yr) | 0.076% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.91% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0338 (0.075%, 4.2%/yr) | 0.075% | 4.2% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.22% realised 24h, HyperLend 3.91% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
