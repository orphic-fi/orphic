# Paper book, junior strategies

Marked 2026-11-26T17:03:49Z, 5.01 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.04 | $0.3337 (0.739%, 53.8%/yr) | -2.491% | -181.5% | $45.34 (0.382%) | in range -236420..-234400, 3 ranges, HYPE 60.87 |
| Nest ±20%, own rule | $45.35 | $0.1834 (0.408%, 29.7%/yr) | 0.777% | 56.6% | $45.17 (0.376%) | in range -237550..-233480, 1 range, HYPE 60.87 |
| Project X 0.05% ±10%, own rule | $44.64 | $1.0279 (2.284%, 166.5%/yr) | -0.802% | -58.5% | $45.00 (-0.005%) | in range -236430..-234420, 3 ranges, HYPE 60.64 |
| Project X 0.05% ±20%, own rule | $45.50 | $0.5028 (1.117%, 81.4%/yr) | 1.112% | 81.1% | $45.00 (-0.005%) | in range -237510..-233440, 1 range, HYPE 60.64 |
| Project X 0.3% ±10%, own rule | $44.75 | $1.1461 (2.547%, 185.6%/yr) | -0.554% | -40.4% | $45.00 (0.004%) | in range -236460..-234360, 3 ranges, HYPE 60.52 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.01 | $0.4107 (0.913%, 66.5%/yr) | 0.031% | 2.2% | $45.00 (0.000%) | LP fees $0.4190 + funding $0.0200 − hedge fees $0.0283 (34 trades); short 0.3036 vs LP 0.3127 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.14 | $0.9047 (2.011%, 146.5%/yr) | 0.321% | 23.4% | $45.00 (0.000%) | LP fees $0.9504 + funding $0.0214 − hedge fees $0.0671 (67 trades); short 0.2998 vs LP 0.2949 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0131 (0.029%, 2.1%/yr) | 0.029% | 2.1% | $45.00 (0.000%) | Hypercore reports 15.7% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0249 (0.055%, 4.0%/yr) | 0.055% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0271 (0.060%, 4.4%/yr) | 0.060% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0269 (0.060%, 4.4%/yr) | 0.060% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
