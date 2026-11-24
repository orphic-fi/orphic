# Paper book, junior strategies

Marked 2026-11-24T00:57:17Z, 2.34 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.49 | $0.1217 (0.269%, 42.1%/yr) | 0.712% | 111.1% | $46.45 (2.838%) | in range -235830..-233810, 2 ranges, HYPE 63.84 |
| Nest ±20%, own rule | $46.18 | $0.0689 (0.153%, 23.9%/yr) | 2.620% | 409.1% | $46.28 (2.836%) | in range -237550..-233480, 1 range, HYPE 63.84 |
| Project X 0.05% ±10%, own rule | $45.87 | $0.4247 (0.944%, 147.4%/yr) | 1.940% | 302.9% | $46.16 (2.570%) | in range -235570..-233550, 2 ranges, HYPE 63.77 |
| Project X 0.05% ±20%, own rule | $46.23 | $0.2066 (0.459%, 71.7%/yr) | 2.725% | 425.5% | $46.16 (2.570%) | in range -237510..-233440, 1 range, HYPE 63.77 |
| Project X 0.3% ±10%, own rule | $45.89 | $0.4935 (1.097%, 171.2%/yr) | 1.989% | 310.5% | $46.15 (2.549%) | in range -235560..-233520, 2 ranges, HYPE 63.61 |
| HLP (Hypercore vault) | $45.01 | $0.0132 (0.029%, 4.6%/yr) | 0.029% | 4.6% | $45.00 (0.000%) | Hypercore reports 16.3% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0119 (0.026%, 4.1%/yr) | 0.026% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0141 (0.031%, 4.9%/yr) | 0.031% | 4.9% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0139 (0.031%, 4.8%/yr) | 0.031% | 4.8% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.05% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
