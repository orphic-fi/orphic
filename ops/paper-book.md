# Paper book, junior strategies

Marked 2026-11-23T22:26:50Z, 2.23 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.53 | $0.1146 (0.254%, 41.5%/yr) | 0.805% | 131.5% | $46.49 (2.929%) | in range -235830..-233810, 2 ranges, HYPE 63.95 |
| Nest ±20%, own rule | $46.20 | $0.0641 (0.143%, 23.3%/yr) | 2.677% | 437.6% | $46.32 (2.928%) | in range -237550..-233480, 1 range, HYPE 63.95 |
| Project X 0.05% ±10%, own rule | $45.85 | $0.4091 (0.909%, 148.6%/yr) | 1.884% | 307.9% | $46.15 (2.553%) | in range -235570..-233550, 2 ranges, HYPE 63.74 |
| Project X 0.05% ±20%, own rule | $46.21 | $0.1988 (0.442%, 72.2%/yr) | 2.694% | 440.4% | $46.15 (2.553%) | in range -237510..-233440, 1 range, HYPE 63.74 |
| Project X 0.3% ±10%, own rule | $45.99 | $0.4799 (1.066%, 174.3%/yr) | 2.209% | 361.1% | $46.24 (2.757%) | in range -235560..-233520, 2 ranges, HYPE 63.86 |
| HLP (Hypercore vault) | $45.01 | $0.0133 (0.030%, 4.8%/yr) | 0.030% | 4.8% | $45.00 (0.000%) | Hypercore reports 17.0% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0114 (0.025%, 4.1%/yr) | 0.025% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0136 (0.030%, 4.9%/yr) | 0.030% | 4.9% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0134 (0.030%, 4.9%/yr) | 0.030% | 4.9% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.05% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
