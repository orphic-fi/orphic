# Paper book, junior strategies

Marked 2026-11-26T19:34:26Z, 5.11 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.47 | $0.3573 (0.791%, 56.5%/yr) | -1.542% | -110.1% | $45.86 (1.549%) | in range -236420..-234400, 3 ranges, HYPE 62.28 |
| Nest ±20%, own rule | $45.84 | $0.1955 (0.435%, 31.0%/yr) | 1.869% | 133.4% | $45.70 (1.545%) | in range -237550..-233480, 1 range, HYPE 62.28 |
| Project X 0.05% ±10%, own rule | $45.11 | $1.0544 (2.343%, 167.3%/yr) | 0.237% | 16.9% | $45.57 (1.266%) | in range -236430..-234420, 3 ranges, HYPE 62.18 |
| Project X 0.05% ±20%, own rule | $46.06 | $0.5196 (1.155%, 82.4%/yr) | 2.346% | 167.5% | $45.57 (1.266%) | in range -237510..-233440, 1 range, HYPE 62.18 |
| Project X 0.3% ±10%, own rule | $45.25 | $1.1771 (2.616%, 186.7%/yr) | 0.559% | 39.9% | $45.59 (1.303%) | in range -236460..-234360, 3 ranges, HYPE 62.10 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.01 | $0.4251 (0.945%, 67.4%/yr) | 0.019% | 1.4% | $45.00 (0.000%) | LP fees $0.4330 + funding $0.0204 − hedge fees $0.0283 (34 trades); short 0.3036 vs LP 0.2764 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.13 | $0.9299 (2.067%, 147.5%/yr) | 0.279% | 19.9% | $45.00 (0.000%) | LP fees $0.9768 + funding $0.0218 − hedge fees $0.0686 (68 trades); short 0.2430 vs LP 0.2206 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0128 (0.028%, 2.0%/yr) | 0.028% | 2.0% | $45.00 (0.000%) | Hypercore reports 15.7% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0254 (0.057%, 4.0%/yr) | 0.057% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0276 (0.061%, 4.4%/yr) | 0.061% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0274 (0.061%, 4.3%/yr) | 0.061% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
