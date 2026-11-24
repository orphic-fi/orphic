# Paper book, junior strategies

Marked 2026-11-24T11:13:19Z, 2.77 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.83 | $0.1352 (0.299%, 39.5%/yr) | -0.733% | -96.7% | $45.92 (1.679%) | in range -235830..-233810, 2 ranges, HYPE 62.44 |
| Nest ±20%, own rule | $45.77 | $0.0780 (0.173%, 22.9%/yr) | 1.718% | 226.8% | $45.75 (1.675%) | in range -237550..-233480, 1 range, HYPE 62.44 |
| Project X 0.05% ±10%, own rule | $45.23 | $0.5034 (1.119%, 147.6%/yr) | 0.522% | 68.9% | $45.61 (1.352%) | in range -235570..-233550, 2 ranges, HYPE 62.29 |
| Project X 0.05% ±20%, own rule | $45.81 | $0.2441 (0.542%, 71.6%/yr) | 1.809% | 238.8% | $45.61 (1.352%) | in range -237510..-233440, 1 range, HYPE 62.29 |
| Project X 0.3% ±10%, own rule | $45.43 | $0.6009 (1.335%, 176.3%/yr) | 0.950% | 125.3% | $45.71 (1.578%) | in range -235560..-233520, 2 ranges, HYPE 62.43 |
| HLP (Hypercore vault) | $45.01 | $0.0134 (0.030%, 3.9%/yr) | 0.030% | 3.9% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0140 (0.031%, 4.1%/yr) | 0.031% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0162 (0.036%, 4.7%/yr) | 0.036% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.93% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0160 (0.035%, 4.7%/yr) | 0.035% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.93% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
