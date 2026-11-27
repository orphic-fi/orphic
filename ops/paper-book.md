# Paper book, junior strategies

Marked 2026-11-27T02:32:34Z, 5.40 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.03 | $0.4601 (1.019%, 68.8%/yr) | -0.293% | -19.8% | $46.82 (3.670%) | in range -236420..-234400, 3 ranges, HYPE 64.85 |
| Nest ±20%, own rule | $46.62 | $0.2483 (0.552%, 37.3%/yr) | 3.608% | 243.7% | $46.65 (3.670%) | in range -237550..-233480, 1 range, HYPE 64.85 |
| Project X 0.05% ±10%, own rule | $45.64 | $1.1172 (2.483%, 167.7%/yr) | 1.426% | 96.3% | $46.55 (3.445%) | in range -235680..-233660, 4 ranges, HYPE 64.83 |
| Project X 0.05% ±20%, own rule | $46.86 | $0.5572 (1.238%, 83.6%/yr) | 4.141% | 279.7% | $46.55 (3.445%) | in range -237510..-233440, 1 range, HYPE 64.83 |
| Project X 0.3% ±10%, own rule | $45.82 | $1.2498 (2.777%, 187.6%/yr) | 1.817% | 122.7% | $46.58 (3.520%) | in range -236460..-234360, 3 ranges, HYPE 64.78 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.97 | $0.4554 (1.012%, 68.4%/yr) | -0.077% | -5.2% | $45.00 (0.000%) | LP fees $0.4643 + funding $0.0219 − hedge fees $0.0308 (38 trades); short 0.2578 vs LP 0.2172 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.05 | $0.9890 (2.198%, 148.5%/yr) | 0.110% | 7.5% | $45.00 (0.000%) | LP fees $1.0387 + funding $0.0229 − hedge fees $0.0725 (72 trades); short 0.1833 vs LP 0.1002 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0107 (0.024%, 1.6%/yr) | 0.024% | 1.6% | $45.00 (0.000%) | Hypercore reports 15.0% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0269 (0.060%, 4.0%/yr) | 0.060% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0290 (0.064%, 4.3%/yr) | 0.064% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0288 (0.064%, 4.3%/yr) | 0.064% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
