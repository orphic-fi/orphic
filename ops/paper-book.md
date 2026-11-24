# Paper book, junior strategies

Marked 2026-11-24T08:43:37Z, 2.66 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.41 | $0.1317 (0.292%, 40.0%/yr) | 0.545% | 74.7% | $46.38 (2.681%) | in range -235830..-233810, 2 ranges, HYPE 63.65 |
| Nest ±20%, own rule | $46.13 | $0.0757 (0.168%, 23.1%/yr) | 2.518% | 345.3% | $46.21 (2.680%) | in range -237550..-233480, 1 range, HYPE 63.65 |
| Project X 0.05% ±10%, own rule | $45.88 | $0.4816 (1.070%, 146.8%/yr) | 1.966% | 269.6% | $46.12 (2.487%) | in range -235570..-233550, 2 ranges, HYPE 63.66 |
| Project X 0.05% ±20%, own rule | $46.23 | $0.2345 (0.521%, 71.5%/yr) | 2.723% | 373.4% | $46.12 (2.487%) | in range -237510..-233440, 1 range, HYPE 63.66 |
| Project X 0.3% ±10%, own rule | $45.93 | $0.5667 (1.259%, 172.7%/yr) | 2.075% | 284.6% | $46.12 (2.488%) | in range -235560..-233520, 2 ranges, HYPE 63.53 |
| HLP (Hypercore vault) | $45.01 | $0.0134 (0.030%, 4.1%/yr) | 0.030% | 4.1% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0135 (0.030%, 4.1%/yr) | 0.030% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0156 (0.035%, 4.8%/yr) | 0.035% | 4.8% | $45.00 (0.000%) | liquidity index; supply APY now 3.94% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0154 (0.034%, 4.7%/yr) | 0.034% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.94% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
