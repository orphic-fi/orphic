# Paper book, junior strategies

Marked 2026-11-24T09:44:46Z, 2.70 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.27 | $0.1340 (0.297%, 40.0%/yr) | 0.245% | 33.0% | $46.26 (2.434%) | in range -235830..-233810, 2 ranges, HYPE 63.35 |
| Nest ±20%, own rule | $46.05 | $0.0772 (0.172%, 23.2%/yr) | 2.331% | 314.6% | $46.09 (2.431%) | in range -237550..-233480, 1 range, HYPE 63.35 |
| Project X 0.05% ±10%, own rule | $45.72 | $0.4932 (1.096%, 147.9%/yr) | 1.606% | 216.8% | $45.98 (2.176%) | in range -235570..-233550, 2 ranges, HYPE 63.29 |
| Project X 0.05% ±20%, own rule | $46.12 | $0.2399 (0.533%, 72.0%/yr) | 2.490% | 336.1% | $45.98 (2.176%) | in range -237510..-233440, 1 range, HYPE 63.29 |
| Project X 0.3% ±10%, own rule | $45.80 | $0.5856 (1.301%, 175.7%/yr) | 1.780% | 240.2% | $46.00 (2.220%) | in range -235560..-233520, 2 ranges, HYPE 63.21 |
| HLP (Hypercore vault) | $45.01 | $0.0132 (0.029%, 4.0%/yr) | 0.029% | 4.0% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0137 (0.031%, 4.1%/yr) | 0.031% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0158 (0.035%, 4.8%/yr) | 0.035% | 4.8% | $45.00 (0.000%) | liquidity index; supply APY now 3.93% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0156 (0.035%, 4.7%/yr) | 0.035% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.93% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
