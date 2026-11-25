# Paper book, junior strategies

Marked 2026-11-25T03:37:40Z, 3.45 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.29 | $0.1676 (0.371%, 39.3%/yr) | -4.152% | -439.4% | $44.75 (-0.918%) | in range -236420..-234400, 3 ranges, HYPE 59.30 |
| Nest ±20%, own rule | $44.66 | $0.0979 (0.218%, 23.0%/yr) | -0.748% | -79.2% | $44.58 (-0.925%) | in range -237550..-233480, 1 range, HYPE 59.30 |
| Project X 0.05% ±10%, own rule | $43.76 | $0.6689 (1.486%, 157.3%/yr) | -2.760% | -292.1% | $44.48 (-1.162%) | in range -236430..-234420, 3 ranges, HYPE 59.24 |
| Project X 0.05% ±20%, own rule | $44.77 | $0.3220 (0.715%, 75.7%/yr) | -0.511% | -54.0% | $44.48 (-1.162%) | in range -237510..-233440, 1 range, HYPE 59.24 |
| Project X 0.3% ±10%, own rule | $43.89 | $0.7732 (1.718%, 181.8%/yr) | -2.467% | -261.1% | $44.52 (-1.058%) | in range -236460..-234360, 3 ranges, HYPE 59.24 |
| HLP (Hypercore vault) | $45.01 | $0.0115 (0.026%, 2.7%/yr) | 0.026% | 2.7% | $45.00 (0.000%) | Hypercore reports 15.9% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0173 (0.039%, 4.1%/yr) | 0.039% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0196 (0.044%, 4.6%/yr) | 0.044% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 3.94% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0194 (0.043%, 4.6%/yr) | 0.043% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 3.94% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
