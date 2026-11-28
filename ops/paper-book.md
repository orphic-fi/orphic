# Paper book, junior strategies

Marked 2026-11-28T13:52:57Z, 6.88 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.14 | $0.6604 (1.462%, 77.6%/yr) | -2.272% | -120.6% | $45.94 (1.716%) | in range -235650..-233640, 4 ranges, HYPE 62.48 |
| Nest ±20%, own rule | $46.06 | $0.3549 (0.789%, 41.9%/yr) | 2.366% | 125.6% | $45.77 (1.713%) | in range -237550..-233480, 1 range, HYPE 62.48 |
| Project X 0.05% ±10%, own rule | $44.91 | $1.3815 (3.070%, 163.0%/yr) | -0.200% | -10.6% | $45.65 (1.451%) | in range -235680..-233660, 4 ranges, HYPE 62.41 |
| Project X 0.05% ±20%, own rule | $46.29 | $0.6780 (1.507%, 80.0%/yr) | 2.859% | 151.8% | $45.65 (1.451%) | in range -237510..-233440, 1 range, HYPE 62.41 |
| Project X 0.3% ±10%, own rule | $45.00 | $1.5483 (3.441%, 182.6%/yr) | -0.010% | -0.5% | $45.70 (1.551%) | in range -235620..-233580, 4 ranges, HYPE 62.40 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.92 | $0.5530 (1.229%, 65.2%/yr) | -0.175% | -9.3% | $45.00 (0.000%) | LP fees $0.5650 + funding $0.0268 − hedge fees $0.0388 (50 trades); short 0.2663 vs LP 0.2722 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.95 | $1.2177 (2.706%, 143.6%/yr) | -0.107% | -5.7% | $45.00 (0.000%) | LP fees $1.2832 + funding $0.0295 − hedge fees $0.0950 (87 trades); short 0.4057 vs LP 0.4107 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.00 | $0.0021 (0.005%, 0.2%/yr) | 0.005% | 0.2% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0346 (0.077%, 4.1%/yr) | 0.077% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.04 | $0.0360 (0.080%, 4.2%/yr) | 0.080% | 4.2% | $45.00 (0.000%) | liquidity index; supply APY now 3.91% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.04 | $0.0358 (0.080%, 4.2%/yr) | 0.080% | 4.2% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.25% realised 24h, HyperLend 3.91% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
