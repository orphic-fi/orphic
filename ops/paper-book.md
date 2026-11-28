# Paper book, junior strategies

Marked 2026-11-28T16:31:18Z, 6.99 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.23 | $0.6723 (1.489%, 77.8%/yr) | -2.072% | -108.2% | $46.00 (1.851%) | in range -235650..-233640, 4 ranges, HYPE 62.65 |
| Nest ±20%, own rule | $46.12 | $0.3613 (0.803%, 41.9%/yr) | 2.493% | 130.2% | $45.83 (1.848%) | in range -237550..-233480, 1 range, HYPE 62.65 |
| Project X 0.05% ±10%, own rule | $44.98 | $1.3921 (3.094%, 161.6%/yr) | -0.046% | -2.4% | $45.70 (1.553%) | in range -235680..-233660, 4 ranges, HYPE 62.53 |
| Project X 0.05% ±20%, own rule | $46.33 | $0.6837 (1.519%, 79.4%/yr) | 2.960% | 154.7% | $45.70 (1.553%) | in range -237510..-233440, 1 range, HYPE 62.53 |
| Project X 0.3% ±10%, own rule | $45.12 | $1.5574 (3.461%, 180.8%/yr) | 0.257% | 13.4% | $45.78 (1.737%) | in range -235620..-233580, 4 ranges, HYPE 62.62 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5584 (1.241%, 64.8%/yr) | -0.163% | -8.5% | $45.00 (0.000%) | LP fees $0.5698 + funding $0.0274 − hedge fees $0.0388 (50 trades); short 0.2663 vs LP 0.2694 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.96 | $1.2260 (2.725%, 142.3%/yr) | -0.090% | -4.7% | $45.00 (0.000%) | LP fees $1.2907 + funding $0.0304 − hedge fees $0.0950 (87 trades); short 0.4057 vs LP 0.4005 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.00 | $0.0010 (0.002%, 0.1%/yr) | 0.002% | 0.1% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.04 | $0.0351 (0.078%, 4.1%/yr) | 0.078% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.04 | $0.0365 (0.081%, 4.2%/yr) | 0.081% | 4.2% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.04 | $0.0363 (0.081%, 4.2%/yr) | 0.081% | 4.2% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.25% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
