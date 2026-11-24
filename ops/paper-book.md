# Paper book, junior strategies

Marked 2026-11-24T22:53:16Z, 3.25 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.75 | $0.1615 (0.358%, 40.1%/yr) | -3.126% | -350.9% | $45.21 (0.102%) | in range -236420..-234400, 3 ranges, HYPE 60.53 |
| Nest ±20%, own rule | $45.14 | $0.0947 (0.211%, 23.6%/yr) | 0.306% | 34.3% | $45.04 (0.096%) | in range -237550..-233480, 1 range, HYPE 60.53 |
| Project X 0.05% ±10%, own rule | $44.17 | $0.6375 (1.417%, 159.0%/yr) | -1.836% | -206.1% | $44.92 (-0.188%) | in range -236430..-234420, 3 ranges, HYPE 60.42 |
| Project X 0.05% ±20%, own rule | $45.22 | $0.3093 (0.687%, 77.2%/yr) | 0.498% | 55.9% | $44.92 (-0.188%) | in range -237510..-233440, 1 range, HYPE 60.42 |
| Project X 0.3% ±10%, own rule | $44.33 | $0.7428 (1.651%, 185.3%/yr) | -1.495% | -167.8% | $44.98 (-0.043%) | in range -236460..-234360, 3 ranges, HYPE 60.47 |
| HLP (Hypercore vault) | $45.01 | $0.0122 (0.027%, 3.1%/yr) | 0.027% | 3.1% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0164 (0.036%, 4.1%/yr) | 0.036% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0186 (0.041%, 4.6%/yr) | 0.041% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 4.56% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0184 (0.041%, 4.6%/yr) | 0.041% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 4.56% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
