# Paper book, junior strategies

Marked 2026-11-27T00:02:33Z, 5.30 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.59 | $0.4278 (0.947%, 65.2%/yr) | -1.276% | -87.9% | $45.94 (1.717%) | in range -236420..-234400, 3 ranges, HYPE 62.49 |
| Nest ±20%, own rule | $45.94 | $0.2317 (0.515%, 35.5%/yr) | 2.092% | 144.1% | $45.77 (1.713%) | in range -237550..-233480, 1 range, HYPE 62.49 |
| Project X 0.05% ±10%, own rule | $45.18 | $1.0863 (2.414%, 166.2%/yr) | 0.392% | 27.0% | $45.63 (1.398%) | in range -236430..-234420, 3 ranges, HYPE 62.34 |
| Project X 0.05% ±20%, own rule | $46.12 | $0.5357 (1.191%, 82.0%/yr) | 2.498% | 172.0% | $45.63 (1.398%) | in range -237510..-233440, 1 range, HYPE 62.34 |
| Project X 0.3% ±10%, own rule | $45.31 | $1.2088 (2.686%, 185.0%/yr) | 0.680% | 46.8% | $45.62 (1.377%) | in range -236460..-234360, 3 ranges, HYPE 62.19 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.00 | $0.4376 (0.972%, 67.0%/yr) | 0.002% | 0.1% | $45.00 (0.000%) | LP fees $0.4464 + funding $0.0215 − hedge fees $0.0303 (37 trades); short 0.2761 vs LP 0.2728 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.11 | $0.9546 (2.121%, 146.1%/yr) | 0.248% | 17.1% | $45.00 (0.000%) | LP fees $1.0037 + funding $0.0226 − hedge fees $0.0717 (71 trades); short 0.2132 vs LP 0.2166 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0099 (0.022%, 1.5%/yr) | 0.022% | 1.5% | $45.00 (0.000%) | Hypercore reports 15.0% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0264 (0.059%, 4.0%/yr) | 0.059% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0285 (0.063%, 4.4%/yr) | 0.063% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0283 (0.063%, 4.3%/yr) | 0.063% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
