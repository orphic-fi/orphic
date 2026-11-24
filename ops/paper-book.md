# Paper book, junior strategies

Marked 2026-11-24T22:38:02Z, 3.24 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.65 | $0.1609 (0.356%, 40.1%/yr) | -3.343% | -376.5% | $45.11 (-0.127%) | in range -236420..-234400, 3 ranges, HYPE 60.25 |
| Nest ±20%, own rule | $45.03 | $0.0944 (0.210%, 23.6%/yr) | 0.076% | 8.6% | $44.94 (-0.133%) | in range -237550..-233480, 1 range, HYPE 60.25 |
| Project X 0.05% ±10%, own rule | $44.09 | $0.6359 (1.413%, 159.2%/yr) | -2.015% | -226.9% | $44.83 (-0.373%) | in range -236430..-234420, 3 ranges, HYPE 60.20 |
| Project X 0.05% ±20%, own rule | $45.14 | $0.3080 (0.684%, 77.1%/yr) | 0.304% | 34.3% | $44.83 (-0.373%) | in range -237510..-233440, 1 range, HYPE 60.20 |
| Project X 0.3% ±10%, own rule | $44.17 | $0.7384 (1.641%, 184.8%/yr) | -1.839% | -207.1% | $44.82 (-0.390%) | in range -236460..-234360, 3 ranges, HYPE 60.05 |
| HLP (Hypercore vault) | $45.01 | $0.0122 (0.027%, 3.1%/yr) | 0.027% | 3.1% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0163 (0.036%, 4.1%/yr) | 0.036% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0185 (0.041%, 4.6%/yr) | 0.041% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 4.56% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0183 (0.041%, 4.6%/yr) | 0.041% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 4.56% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
