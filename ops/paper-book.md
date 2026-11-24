# Paper book, junior strategies

Marked 2026-11-24T17:41:37Z, 3.04 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.25 | $0.1501 (0.332%, 40.0%/yr) | -2.033% | -244.5% | $45.50 (0.735%) | in range -235830..-233810, 2 ranges, HYPE 61.30 |
| Nest ±20%, own rule | $45.41 | $0.0880 (0.196%, 23.5%/yr) | 0.900% | 108.3% | $45.33 (0.730%) | in range -237550..-233480, 1 range, HYPE 61.30 |
| Project X 0.05% ±10%, own rule | $44.74 | $0.5994 (1.332%, 160.2%/yr) | -0.569% | -68.4% | $45.22 (0.482%) | in range -235570..-233550, 2 ranges, HYPE 61.23 |
| Project X 0.05% ±20%, own rule | $45.50 | $0.2905 (0.646%, 77.6%/yr) | 1.117% | 134.3% | $45.22 (0.482%) | in range -237510..-233440, 1 range, HYPE 61.23 |
| Project X 0.3% ±10%, own rule | $44.84 | $0.7020 (1.560%, 187.6%/yr) | -0.352% | -42.4% | $45.25 (0.558%) | in range -235560..-233520, 2 ranges, HYPE 61.20 |
| HLP (Hypercore vault) | $45.01 | $0.0144 (0.032%, 3.9%/yr) | 0.032% | 3.9% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0153 (0.034%, 4.1%/yr) | 0.034% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0175 (0.039%, 4.7%/yr) | 0.039% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 4.00% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0173 (0.038%, 4.6%/yr) | 0.038% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 4.00% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
