# Paper book, junior strategies

Marked 2026-11-27T00:17:51Z, 5.31 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.63 | $0.4314 (0.955%, 65.7%/yr) | -1.174% | -80.7% | $46.01 (1.869%) | in range -236420..-234400, 3 ranges, HYPE 62.67 |
| Nest ±20%, own rule | $46.00 | $0.2335 (0.519%, 35.7%/yr) | 2.223% | 152.8% | $45.84 (1.866%) | in range -237550..-233480, 1 range, HYPE 62.67 |
| Project X 0.05% ±10%, own rule | $45.23 | $1.0881 (2.418%, 166.2%/yr) | 0.500% | 34.4% | $45.71 (1.568%) | in range -236430..-234420, 3 ranges, HYPE 62.55 |
| Project X 0.05% ±20%, own rule | $46.19 | $0.5372 (1.194%, 82.0%/yr) | 2.647% | 182.0% | $45.71 (1.568%) | in range -237510..-233440, 1 range, HYPE 62.55 |
| Project X 0.3% ±10%, own rule | $45.36 | $1.2117 (2.693%, 185.1%/yr) | 0.799% | 54.9% | $45.70 (1.549%) | in range -236460..-234360, 3 ranges, HYPE 62.39 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.00 | $0.4388 (0.975%, 67.0%/yr) | 0.000% | 0.0% | $45.00 (0.000%) | LP fees $0.4476 + funding $0.0215 − hedge fees $0.0303 (37 trades); short 0.2761 vs LP 0.2680 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.11 | $0.9571 (2.127%, 146.2%/yr) | 0.252% | 17.3% | $45.00 (0.000%) | LP fees $1.0062 + funding $0.0226 − hedge fees $0.0717 (71 trades); short 0.2132 vs LP 0.2070 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0098 (0.022%, 1.5%/yr) | 0.022% | 1.5% | $45.00 (0.000%) | Hypercore reports 15.0% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0264 (0.059%, 4.0%/yr) | 0.059% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0285 (0.063%, 4.4%/yr) | 0.063% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0283 (0.063%, 4.3%/yr) | 0.063% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
