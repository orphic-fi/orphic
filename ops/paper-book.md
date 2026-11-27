# Paper book, junior strategies

Marked 2026-11-27T19:46:20Z, 6.12 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.77 | $0.5986 (1.325%, 79.0%/yr) | -0.870% | -51.9% | $46.52 (3.011%) | in range -235650..-233640, 4 ranges, HYPE 64.05 |
| Nest ±20%, own rule | $46.49 | $0.3220 (0.716%, 42.7%/yr) | 3.310% | 197.3% | $46.35 (3.009%) | in range -237550..-233480, 1 range, HYPE 64.05 |
| Project X 0.05% ±10%, own rule | $45.50 | $1.3034 (2.896%, 172.7%/yr) | 1.106% | 65.9% | $46.22 (2.710%) | in range -235680..-233660, 4 ranges, HYPE 63.93 |
| Project X 0.05% ±20%, own rule | $46.71 | $0.6458 (1.435%, 85.6%/yr) | 3.807% | 227.0% | $46.22 (2.710%) | in range -237510..-233440, 1 range, HYPE 63.93 |
| Project X 0.3% ±10%, own rule | $45.66 | $1.4587 (3.242%, 193.3%/yr) | 1.462% | 87.1% | $46.31 (2.920%) | in range -235620..-233580, 4 ranges, HYPE 64.05 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5279 (1.173%, 69.9%/yr) | -0.160% | -9.5% | $45.00 (0.000%) | LP fees $0.5382 + funding $0.0259 − hedge fees $0.0362 (45 trades); short 0.2415 vs LP 0.2374 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.98 | $1.1482 (2.551%, 152.1%/yr) | -0.045% | -2.7% | $45.00 (0.000%) | LP fees $1.2099 + funding $0.0282 − hedge fees $0.0899 (83 trades); short 0.3497 vs LP 0.3357 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0085 (0.019%, 1.1%/yr) | 0.019% | 1.1% | $45.00 (0.000%) | Hypercore reports 14.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0306 (0.068%, 4.1%/yr) | 0.068% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0324 (0.072%, 4.3%/yr) | 0.072% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.94% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0322 (0.071%, 4.3%/yr) | 0.071% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.15% realised 24h, HyperLend 3.94% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
