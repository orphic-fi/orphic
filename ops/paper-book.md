# Paper book, junior strategies

Marked 2026-11-26T05:31:21Z, 4.53 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.30 | $0.2690 (0.596%, 48.0%/yr) | -1.915% | -154.4% | $45.75 (1.291%) | in range -236420..-234400, 3 ranges, HYPE 61.97 |
| Nest ±20%, own rule | $45.69 | $0.1502 (0.334%, 26.9%/yr) | 1.544% | 124.4% | $45.58 (1.287%) | in range -237550..-233480, 1 range, HYPE 61.97 |
| Project X 0.05% ±10%, own rule | $44.96 | $0.9664 (2.147%, 173.1%/yr) | -0.095% | -7.6% | $45.48 (1.064%) | in range -236430..-234420, 3 ranges, HYPE 61.94 |
| Project X 0.05% ±20%, own rule | $45.93 | $0.4755 (1.057%, 85.2%/yr) | 2.067% | 166.7% | $45.48 (1.064%) | in range -237510..-233440, 1 range, HYPE 61.94 |
| Project X 0.3% ±10%, own rule | $45.10 | $1.0775 (2.394%, 193.0%/yr) | 0.222% | 17.9% | $45.51 (1.139%) | in range -236460..-234360, 3 ranges, HYPE 61.90 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.99 | $0.3857 (0.857%, 69.1%/yr) | -0.013% | -1.1% | $45.00 (0.000%) | LP fees $0.3962 + funding $0.0173 − hedge fees $0.0278 (33 trades); short 0.2845 vs LP 0.2818 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.15 | $0.8490 (1.887%, 152.1%/yr) | 0.342% | 27.6% | $45.00 (0.000%) | LP fees $0.8920 + funding $0.0190 − hedge fees $0.0620 (61 trades); short 0.2339 vs LP 0.2292 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0138 (0.031%, 2.5%/yr) | 0.031% | 2.5% | $45.00 (0.000%) | Hypercore reports 15.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0225 (0.050%, 4.0%/yr) | 0.050% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0248 (0.055%, 4.4%/yr) | 0.055% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0246 (0.055%, 4.4%/yr) | 0.055% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.88% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
