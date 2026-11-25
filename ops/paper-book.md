# Paper book, junior strategies

Marked 2026-11-25T02:36:37Z, 3.41 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.12 | $0.1657 (0.367%, 39.3%/yr) | -4.532% | -485.5% | $44.60 (-1.245%) | in range -236420..-234400, 3 ranges, HYPE 58.90 |
| Nest ±20%, own rule | $44.50 | $0.0969 (0.215%, 23.1%/yr) | -1.113% | -119.2% | $44.44 (-1.253%) | in range -237550..-233480, 1 range, HYPE 58.90 |
| Project X 0.05% ±10%, own rule | $43.60 | $0.6611 (1.469%, 157.4%/yr) | -3.104% | -332.6% | $44.35 (-1.447%) | in range -236430..-234420, 3 ranges, HYPE 58.89 |
| Project X 0.05% ±20%, own rule | $44.62 | $0.3173 (0.705%, 75.5%/yr) | -0.842% | -90.2% | $44.35 (-1.447%) | in range -237510..-233440, 1 range, HYPE 58.89 |
| Project X 0.3% ±10%, own rule | $43.68 | $0.7639 (1.698%, 181.9%/yr) | -2.929% | -313.8% | $44.35 (-1.439%) | in range -236460..-234360, 3 ranges, HYPE 58.78 |
| HLP (Hypercore vault) | $45.01 | $0.0115 (0.026%, 2.7%/yr) | 0.026% | 2.7% | $45.00 (0.000%) | Hypercore reports 15.9% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0172 (0.038%, 4.1%/yr) | 0.038% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0194 (0.043%, 4.6%/yr) | 0.043% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0192 (0.043%, 4.6%/yr) | 0.043% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
