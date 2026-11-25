# Paper book, junior strategies

Marked 2026-11-25T02:51:53Z, 3.42 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.12 | $0.1660 (0.368%, 39.3%/yr) | -4.529% | -483.7% | $44.60 (-1.243%) | in range -236420..-234400, 3 ranges, HYPE 58.90 |
| Nest ±20%, own rule | $44.50 | $0.0971 (0.216%, 23.0%/yr) | -1.110% | -118.6% | $44.44 (-1.251%) | in range -237550..-233480, 1 range, HYPE 58.90 |
| Project X 0.05% ±10%, own rule | $43.61 | $0.6628 (1.473%, 157.3%/yr) | -3.096% | -330.7% | $44.35 (-1.443%) | in range -236430..-234420, 3 ranges, HYPE 58.90 |
| Project X 0.05% ±20%, own rule | $44.62 | $0.3181 (0.707%, 75.5%/yr) | -0.836% | -89.3% | $44.35 (-1.443%) | in range -237510..-233440, 1 range, HYPE 58.90 |
| Project X 0.3% ±10%, own rule | $43.67 | $0.7652 (1.701%, 181.6%/yr) | -2.954% | -315.5% | $44.34 (-1.462%) | in range -236460..-234360, 3 ranges, HYPE 58.75 |
| HLP (Hypercore vault) | $45.01 | $0.0114 (0.025%, 2.7%/yr) | 0.025% | 2.7% | $45.00 (0.000%) | Hypercore reports 15.9% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0172 (0.038%, 4.1%/yr) | 0.038% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0195 (0.043%, 4.6%/yr) | 0.043% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 3.94% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0193 (0.043%, 4.6%/yr) | 0.043% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.94% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
