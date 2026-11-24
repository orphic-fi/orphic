# Paper book, junior strategies

Marked 2026-11-24T23:08:31Z, 3.26 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.71 | $0.1616 (0.358%, 40.0%/yr) | -3.213% | -359.5% | $45.17 (0.008%) | in range -236420..-234400, 3 ranges, HYPE 60.42 |
| Nest ±20%, own rule | $45.10 | $0.0948 (0.211%, 23.6%/yr) | 0.213% | 23.8% | $45.00 (0.002%) | in range -237550..-233480, 1 range, HYPE 60.42 |
| Project X 0.05% ±10%, own rule | $44.12 | $0.6382 (1.418%, 158.7%/yr) | -1.952% | -218.4% | $44.86 (-0.313%) | in range -236430..-234420, 3 ranges, HYPE 60.27 |
| Project X 0.05% ±20%, own rule | $45.17 | $0.3093 (0.687%, 76.9%/yr) | 0.370% | 41.4% | $44.86 (-0.313%) | in range -237510..-233440, 1 range, HYPE 60.27 |
| Project X 0.3% ±10%, own rule | $44.31 | $0.7432 (1.652%, 184.8%/yr) | -1.529% | -171.1% | $44.96 (-0.081%) | in range -236460..-234360, 3 ranges, HYPE 60.42 |
| HLP (Hypercore vault) | $45.01 | $0.0123 (0.027%, 3.1%/yr) | 0.027% | 3.1% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0165 (0.037%, 4.1%/yr) | 0.037% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0186 (0.041%, 4.6%/yr) | 0.041% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 4.56% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0184 (0.041%, 4.6%/yr) | 0.041% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 4.56% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
