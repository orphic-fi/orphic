# Paper book, junior strategies

Marked 2026-11-24T10:12:09Z, 2.72 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.20 | $0.1345 (0.298%, 39.9%/yr) | 0.075% | 10.0% | $46.20 (2.298%) | in range -235830..-233810, 2 ranges, HYPE 63.19 |
| Nest ±20%, own rule | $46.00 | $0.0776 (0.172%, 23.1%/yr) | 2.225% | 298.2% | $46.03 (2.295%) | in range -237550..-233480, 1 range, HYPE 63.19 |
| Project X 0.05% ±10%, own rule | $45.66 | $0.4972 (1.105%, 148.1%/yr) | 1.470% | 197.1% | $45.93 (2.063%) | in range -235570..-233550, 2 ranges, HYPE 63.15 |
| Project X 0.05% ±20%, own rule | $46.08 | $0.2418 (0.537%, 72.0%/yr) | 2.403% | 322.1% | $45.93 (2.063%) | in range -237510..-233440, 1 range, HYPE 63.15 |
| Project X 0.3% ±10%, own rule | $45.71 | $0.5917 (1.315%, 176.2%/yr) | 1.577% | 211.4% | $45.92 (2.054%) | in range -235560..-233520, 2 ranges, HYPE 63.01 |
| HLP (Hypercore vault) | $45.01 | $0.0131 (0.029%, 3.9%/yr) | 0.029% | 3.9% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0138 (0.031%, 4.1%/yr) | 0.031% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0160 (0.035%, 4.8%/yr) | 0.035% | 4.8% | $45.00 (0.000%) | liquidity index; supply APY now 3.93% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0158 (0.035%, 4.7%/yr) | 0.035% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.93% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
