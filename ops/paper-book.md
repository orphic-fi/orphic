# Paper book, junior strategies

Marked 2026-11-28T17:15:01Z, 7.02 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.29 | $0.6758 (1.496%, 77.8%/yr) | -1.943% | -101.1% | $46.04 (1.947%) | in range -235650..-233640, 4 ranges, HYPE 62.76 |
| Nest ±20%, own rule | $46.16 | $0.3631 (0.807%, 42.0%/yr) | 2.576% | 134.0% | $45.87 (1.943%) | in range -237550..-233480, 1 range, HYPE 62.76 |
| Project X 0.05% ±10%, own rule | $45.04 | $1.3963 (3.103%, 161.4%/yr) | 0.078% | 4.1% | $45.74 (1.644%) | in range -235680..-233660, 4 ranges, HYPE 62.64 |
| Project X 0.05% ±20%, own rule | $46.37 | $0.6863 (1.525%, 79.3%/yr) | 3.043% | 158.3% | $45.74 (1.644%) | in range -237510..-233440, 1 range, HYPE 62.64 |
| Project X 0.3% ±10%, own rule | $45.15 | $1.5608 (3.468%, 180.4%/yr) | 0.341% | 17.7% | $45.81 (1.795%) | in range -235620..-233580, 4 ranges, HYPE 62.69 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5607 (1.246%, 64.8%/yr) | -0.159% | -8.3% | $45.00 (0.000%) | LP fees $0.5719 + funding $0.0276 − hedge fees $0.0388 (50 trades); short 0.2663 vs LP 0.2669 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.96 | $1.2291 (2.731%, 142.1%/yr) | -0.084% | -4.4% | $45.00 (0.000%) | LP fees $1.2935 + funding $0.0307 − hedge fees $0.0950 (87 trades); short 0.4057 vs LP 0.3973 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.00 | $0.0011 (0.002%, 0.1%/yr) | 0.002% | 0.1% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.04 | $0.0353 (0.078%, 4.1%/yr) | 0.078% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.04 | $0.0367 (0.081%, 4.2%/yr) | 0.081% | 4.2% | $45.00 (0.000%) | liquidity index; supply APY now 3.86% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.04 | $0.0365 (0.081%, 4.2%/yr) | 0.081% | 4.2% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.22% realised 24h, HyperLend 3.86% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
