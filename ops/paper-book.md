# Paper book, junior strategies

Marked 2026-11-23T22:42:05Z, 2.24 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.45 | $0.1153 (0.255%, 41.5%/yr) | 0.638% | 103.7% | $46.42 (2.788%) | in range -235830..-233810, 2 ranges, HYPE 63.78 |
| Nest ±20%, own rule | $46.16 | $0.0646 (0.144%, 23.4%/yr) | 2.573% | 418.6% | $46.25 (2.786%) | in range -237550..-233480, 1 range, HYPE 63.78 |
| Project X 0.05% ±10%, own rule | $45.81 | $0.4120 (0.916%, 148.9%/yr) | 1.801% | 293.0% | $46.12 (2.478%) | in range -235570..-233550, 2 ranges, HYPE 63.65 |
| Project X 0.05% ±20%, own rule | $46.19 | $0.2002 (0.445%, 72.4%/yr) | 2.640% | 429.5% | $46.12 (2.478%) | in range -237510..-233440, 1 range, HYPE 63.65 |
| Project X 0.3% ±10%, own rule | $45.90 | $0.4818 (1.071%, 174.2%/yr) | 1.992% | 324.1% | $46.16 (2.573%) | in range -235560..-233520, 2 ranges, HYPE 63.63 |
| HLP (Hypercore vault) | $45.01 | $0.0133 (0.030%, 4.8%/yr) | 0.030% | 4.8% | $45.00 (0.000%) | Hypercore reports 17.0% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0115 (0.025%, 4.1%/yr) | 0.025% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0137 (0.030%, 4.9%/yr) | 0.030% | 4.9% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0135 (0.030%, 4.9%/yr) | 0.030% | 4.9% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.05% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
