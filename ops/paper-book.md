# Paper book, junior strategies

Marked 2026-11-27T20:44:44Z, 6.16 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.83 | $0.6017 (1.332%, 78.9%/yr) | -0.738% | -43.7% | $46.58 (3.127%) | in range -235650..-233640, 4 ranges, HYPE 64.19 |
| Nest ±20%, own rule | $46.53 | $0.3236 (0.719%, 42.6%/yr) | 3.398% | 201.3% | $46.41 (3.126%) | in range -237550..-233480, 1 range, HYPE 64.19 |
| Project X 0.05% ±10%, own rule | $45.57 | $1.3078 (2.906%, 172.1%/yr) | 1.258% | 74.5% | $46.28 (2.846%) | in range -235680..-233660, 4 ranges, HYPE 64.10 |
| Project X 0.05% ±20%, own rule | $46.76 | $0.6487 (1.442%, 85.4%/yr) | 3.916% | 231.9% | $46.28 (2.846%) | in range -237510..-233440, 1 range, HYPE 64.10 |
| Project X 0.3% ±10%, own rule | $45.64 | $1.4629 (3.251%, 192.6%/yr) | 1.414% | 83.8% | $46.29 (2.868%) | in range -235620..-233580, 4 ranges, HYPE 63.99 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5305 (1.179%, 69.8%/yr) | -0.158% | -9.3% | $45.00 (0.000%) | LP fees $0.5406 + funding $0.0261 − hedge fees $0.0362 (45 trades); short 0.2415 vs LP 0.2337 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.98 | $1.1519 (2.560%, 151.6%/yr) | -0.034% | -2.0% | $45.00 (0.000%) | LP fees $1.2134 + funding $0.0285 − hedge fees $0.0899 (83 trades); short 0.3497 vs LP 0.3385 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0148 (0.033%, 1.9%/yr) | 0.033% | 1.9% | $45.00 (0.000%) | Hypercore reports 14.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0308 (0.068%, 4.1%/yr) | 0.068% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0326 (0.072%, 4.3%/yr) | 0.072% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0324 (0.072%, 4.3%/yr) | 0.072% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.15% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
