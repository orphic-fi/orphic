# Paper book, junior strategies

Marked 2026-11-27T20:14:08Z, 6.14 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.67 | $0.5994 (1.327%, 78.9%/yr) | -1.086% | -64.5% | $46.43 (2.813%) | in range -235650..-233640, 4 ranges, HYPE 63.81 |
| Nest ±20%, own rule | $46.42 | $0.3224 (0.717%, 42.6%/yr) | 3.165% | 188.1% | $46.26 (2.811%) | in range -237550..-233480, 1 range, HYPE 63.81 |
| Project X 0.05% ±10%, own rule | $45.41 | $1.3050 (2.900%, 172.4%/yr) | 0.909% | 54.0% | $46.14 (2.524%) | in range -235680..-233660, 4 ranges, HYPE 63.71 |
| Project X 0.05% ±20%, own rule | $46.65 | $0.6456 (1.435%, 85.3%/yr) | 3.666% | 217.9% | $46.14 (2.524%) | in range -237510..-233440, 1 range, HYPE 63.71 |
| Project X 0.3% ±10%, own rule | $45.56 | $1.4608 (3.246%, 192.9%/yr) | 1.245% | 74.0% | $46.22 (2.721%) | in range -235620..-233580, 4 ranges, HYPE 63.81 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5279 (1.173%, 69.7%/yr) | -0.157% | -9.3% | $45.00 (0.000%) | LP fees $0.5380 + funding $0.0261 − hedge fees $0.0362 (45 trades); short 0.2415 vs LP 0.2424 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.98 | $1.1502 (2.556%, 151.9%/yr) | -0.035% | -2.1% | $45.00 (0.000%) | LP fees $1.2116 + funding $0.0285 − hedge fees $0.0899 (83 trades); short 0.3497 vs LP 0.3464 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0082 (0.018%, 1.1%/yr) | 0.018% | 1.1% | $45.00 (0.000%) | Hypercore reports 14.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0307 (0.068%, 4.1%/yr) | 0.068% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0325 (0.072%, 4.3%/yr) | 0.072% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.94% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0323 (0.072%, 4.3%/yr) | 0.072% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.15% realised 24h, HyperLend 3.94% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
