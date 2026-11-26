# Paper book, junior strategies

Marked 2026-11-26T23:34:03Z, 5.28 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.49 | $0.4240 (0.939%, 64.9%/yr) | -1.482% | -102.5% | $45.80 (1.418%) | in range -236420..-234400, 3 ranges, HYPE 62.12 |
| Nest ±20%, own rule | $45.82 | $0.2297 (0.511%, 35.3%/yr) | 1.832% | 126.6% | $45.64 (1.414%) | in range -237550..-233480, 1 range, HYPE 62.12 |
| Project X 0.05% ±10%, own rule | $45.09 | $1.0836 (2.408%, 166.5%/yr) | 0.199% | 13.8% | $45.50 (1.113%) | in range -236430..-234420, 3 ranges, HYPE 62.00 |
| Project X 0.05% ±20%, own rule | $46.01 | $0.5336 (1.186%, 82.0%/yr) | 2.241% | 154.9% | $45.50 (1.113%) | in range -237510..-233440, 1 range, HYPE 62.00 |
| Project X 0.3% ±10%, own rule | $45.25 | $1.2060 (2.680%, 185.3%/yr) | 0.562% | 38.8% | $45.55 (1.214%) | in range -236460..-234360, 3 ranges, HYPE 61.99 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.00 | $0.4356 (0.968%, 66.9%/yr) | -0.000% | -0.0% | $45.00 (0.000%) | LP fees $0.4447 + funding $0.0212 − hedge fees $0.0303 (37 trades); short 0.2761 vs LP 0.2808 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.11 | $0.9521 (2.116%, 146.3%/yr) | 0.241% | 16.6% | $45.00 (0.000%) | LP fees $1.0013 + funding $0.0224 − hedge fees $0.0717 (71 trades); short 0.2132 vs LP 0.2258 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0111 (0.025%, 1.7%/yr) | 0.025% | 1.7% | $45.00 (0.000%) | Hypercore reports 15.0% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0263 (0.058%, 4.0%/yr) | 0.058% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0284 (0.063%, 4.4%/yr) | 0.063% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0282 (0.063%, 4.3%/yr) | 0.063% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
