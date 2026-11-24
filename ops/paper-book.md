# Paper book, junior strategies

Marked 2026-11-24T16:55:52Z, 3.00 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.06 | $0.1483 (0.328%, 39.9%/yr) | -2.438% | -296.3% | $45.37 (0.467%) | in range -235830..-233810, 2 ranges, HYPE 60.97 |
| Nest ±20%, own rule | $45.29 | $0.0868 (0.193%, 23.4%/yr) | 0.644% | 78.3% | $45.21 (0.461%) | in range -237550..-233480, 1 range, HYPE 60.97 |
| Project X 0.05% ±10%, own rule | $44.44 | $0.5880 (1.307%, 158.8%/yr) | -1.237% | -150.3% | $45.04 (0.085%) | in range -235570..-233550, 2 ranges, HYPE 60.75 |
| Project X 0.05% ±20%, own rule | $45.32 | $0.2845 (0.632%, 76.8%/yr) | 0.717% | 87.1% | $45.04 (0.085%) | in range -237510..-233440, 1 range, HYPE 60.75 |
| Project X 0.3% ±10%, own rule | $44.61 | $0.6898 (1.533%, 186.3%/yr) | -0.871% | -105.8% | $45.11 (0.255%) | in range -235560..-233520, 2 ranges, HYPE 60.83 |
| HLP (Hypercore vault) | $45.01 | $0.0138 (0.031%, 3.7%/yr) | 0.031% | 3.7% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0152 (0.034%, 4.1%/yr) | 0.034% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0173 (0.038%, 4.7%/yr) | 0.038% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0171 (0.038%, 4.6%/yr) | 0.038% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.92% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
