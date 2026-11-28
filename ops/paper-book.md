# Paper book, junior strategies

Marked 2026-11-28T02:33:44Z, 6.40 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.92 | $0.6215 (1.376%, 78.4%/yr) | -0.549% | -31.3% | $46.64 (3.265%) | in range -235650..-233640, 4 ranges, HYPE 64.36 |
| Nest ±20%, own rule | $46.58 | $0.3342 (0.743%, 42.3%/yr) | 3.520% | 200.6% | $46.47 (3.264%) | in range -237550..-233480, 1 range, HYPE 64.36 |
| Project X 0.05% ±10%, own rule | $45.66 | $1.3327 (2.962%, 168.8%/yr) | 1.459% | 83.1% | $46.34 (2.987%) | in range -235680..-233660, 4 ranges, HYPE 64.27 |
| Project X 0.05% ±20%, own rule | $46.82 | $0.6618 (1.471%, 83.8%/yr) | 4.048% | 230.7% | $46.34 (2.987%) | in range -237510..-233440, 1 range, HYPE 64.27 |
| Project X 0.3% ±10%, own rule | $45.85 | $1.4961 (3.325%, 189.5%/yr) | 1.879% | 107.1% | $46.45 (3.232%) | in range -235620..-233580, 4 ranges, HYPE 64.43 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5411 (1.203%, 68.5%/yr) | -0.152% | -8.7% | $45.00 (0.000%) | LP fees $0.5515 + funding $0.0263 − hedge fees $0.0367 (46 trades); short 0.2231 vs LP 0.2300 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.00 | $1.1784 (2.619%, 149.2%/yr) | -0.002% | -0.1% | $45.00 (0.000%) | LP fees $1.2405 + funding $0.0288 − hedge fees $0.0909 (84 trades); short 0.3163 vs LP 0.3194 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0059 (0.013%, 0.7%/yr) | 0.013% | 0.7% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0321 (0.071%, 4.1%/yr) | 0.071% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0338 (0.075%, 4.3%/yr) | 0.075% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.91% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0336 (0.075%, 4.3%/yr) | 0.075% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.19% realised 24h, HyperLend 3.91% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
