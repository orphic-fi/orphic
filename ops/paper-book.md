# Paper book, junior strategies

Marked 2026-11-24T13:55:38Z, 2.88 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.85 | $0.1405 (0.311%, 39.5%/yr) | -0.693% | -87.9% | $45.93 (1.700%) | in range -235830..-233810, 2 ranges, HYPE 62.46 |
| Nest ±20%, own rule | $45.78 | $0.0816 (0.181%, 23.0%/yr) | 1.744% | 221.2% | $45.76 (1.696%) | in range -237550..-233480, 1 range, HYPE 62.46 |
| Project X 0.05% ±10%, own rule | $45.28 | $0.5346 (1.188%, 150.6%/yr) | 0.615% | 78.0% | $45.62 (1.369%) | in range -235570..-233550, 2 ranges, HYPE 62.31 |
| Project X 0.05% ±20%, own rule | $45.84 | $0.2595 (0.577%, 73.1%/yr) | 1.858% | 235.6% | $45.62 (1.369%) | in range -237510..-233440, 1 range, HYPE 62.31 |
| Project X 0.3% ±10%, own rule | $45.43 | $0.6299 (1.400%, 177.5%/yr) | 0.955% | 121.1% | $45.69 (1.536%) | in range -235560..-233520, 2 ranges, HYPE 62.38 |
| HLP (Hypercore vault) | $45.02 | $0.0162 (0.036%, 4.6%/yr) | 0.036% | 4.6% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0145 (0.032%, 4.1%/yr) | 0.032% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0167 (0.037%, 4.7%/yr) | 0.037% | 4.7% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0165 (0.037%, 4.7%/yr) | 0.037% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
