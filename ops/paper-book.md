# Paper book, junior strategies

Marked 2026-11-24T01:12:30Z, 2.35 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.71 | $0.1223 (0.271%, 42.1%/yr) | 1.203% | 187.0% | $46.64 (3.257%) | in range -235830..-233810, 2 ranges, HYPE 64.35 |
| Nest ±20%, own rule | $46.32 | $0.0693 (0.154%, 24.0%/yr) | 2.926% | 454.8% | $46.47 (3.256%) | in range -237550..-233480, 1 range, HYPE 64.35 |
| Project X 0.05% ±10%, own rule | $46.12 | $0.4273 (0.950%, 147.6%/yr) | 2.478% | 385.2% | $46.36 (3.030%) | in range -235570..-233550, 2 ranges, HYPE 64.32 |
| Project X 0.05% ±20%, own rule | $46.38 | $0.2083 (0.463%, 71.9%/yr) | 3.072% | 477.5% | $46.36 (3.030%) | in range -237510..-233440, 1 range, HYPE 64.32 |
| Project X 0.3% ±10%, own rule | $46.15 | $0.5004 (1.112%, 172.8%/yr) | 2.549% | 396.2% | $46.35 (3.009%) | in range -235560..-233520, 2 ranges, HYPE 64.16 |
| HLP (Hypercore vault) | $45.01 | $0.0134 (0.030%, 4.6%/yr) | 0.030% | 4.6% | $45.00 (0.000%) | Hypercore reports 16.3% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0120 (0.027%, 4.1%/yr) | 0.027% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0142 (0.031%, 4.9%/yr) | 0.031% | 4.9% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0140 (0.031%, 4.8%/yr) | 0.031% | 4.8% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.05% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
