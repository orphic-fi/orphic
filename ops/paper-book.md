# Paper book, junior strategies

Marked 2026-11-24T07:57:45Z, 2.63 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.50 | $0.1306 (0.289%, 40.1%/yr) | 0.749% | 104.0% | $46.45 (2.853%) | in range -235830..-233810, 2 ranges, HYPE 63.86 |
| Nest ±20%, own rule | $46.19 | $0.0749 (0.166%, 23.1%/yr) | 2.645% | 367.1% | $46.28 (2.851%) | in range -237550..-233480, 1 range, HYPE 63.86 |
| Project X 0.05% ±10%, own rule | $45.96 | $0.4752 (1.056%, 146.6%/yr) | 2.128% | 295.3% | $46.19 (2.633%) | in range -235570..-233550, 2 ranges, HYPE 63.84 |
| Project X 0.05% ±20%, own rule | $46.27 | $0.2315 (0.514%, 71.4%/yr) | 2.829% | 392.6% | $46.19 (2.633%) | in range -237510..-233440, 1 range, HYPE 63.84 |
| Project X 0.3% ±10%, own rule | $46.10 | $0.5597 (1.244%, 172.6%/yr) | 2.435% | 338.0% | $46.26 (2.798%) | in range -235560..-233520, 2 ranges, HYPE 63.91 |
| HLP (Hypercore vault) | $45.01 | $0.0133 (0.030%, 4.1%/yr) | 0.030% | 4.1% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0134 (0.030%, 4.1%/yr) | 0.030% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0155 (0.034%, 4.8%/yr) | 0.034% | 4.8% | $45.00 (0.000%) | liquidity index; supply APY now 3.94% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0153 (0.034%, 4.7%/yr) | 0.034% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.94% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
