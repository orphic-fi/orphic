# Paper book, junior strategies

Marked 2026-11-25T03:22:24Z, 3.44 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.38 | $0.1673 (0.371%, 39.3%/yr) | -3.953% | -419.6% | $44.83 (-0.736%) | in range -236420..-234400, 3 ranges, HYPE 59.52 |
| Nest ±20%, own rule | $44.75 | $0.0978 (0.217%, 23.1%/yr) | -0.553% | -58.7% | $44.67 (-0.744%) | in range -237550..-233480, 1 range, HYPE 59.52 |
| Project X 0.05% ±10%, own rule | $43.85 | $0.6672 (1.483%, 157.4%/yr) | -2.562% | -272.0% | $44.56 (-0.978%) | in range -236430..-234420, 3 ranges, HYPE 59.46 |
| Project X 0.05% ±20%, own rule | $44.86 | $0.3216 (0.715%, 75.9%/yr) | -0.308% | -32.7% | $44.56 (-0.978%) | in range -237510..-233440, 1 range, HYPE 59.46 |
| Project X 0.3% ±10%, own rule | $43.94 | $0.7720 (1.716%, 182.1%/yr) | -2.360% | -250.5% | $44.57 (-0.959%) | in range -236460..-234360, 3 ranges, HYPE 59.36 |
| HLP (Hypercore vault) | $45.01 | $0.0116 (0.026%, 2.7%/yr) | 0.026% | 2.7% | $45.00 (0.000%) | Hypercore reports 15.9% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0173 (0.038%, 4.1%/yr) | 0.038% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0196 (0.044%, 4.6%/yr) | 0.044% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 3.94% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0194 (0.043%, 4.6%/yr) | 0.043% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.94% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
