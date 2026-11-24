# Paper book, junior strategies

Marked 2026-11-24T23:38:58Z, 3.28 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.56 | $0.1619 (0.358%, 39.8%/yr) | -3.546% | -394.2% | $45.01 (-0.334%) | in range -236420..-234400, 3 ranges, HYPE 60.00 |
| Nest ±20%, own rule | $44.94 | $0.0950 (0.211%, 23.5%/yr) | -0.135% | -15.1% | $44.85 (-0.341%) | in range -237550..-233480, 1 range, HYPE 60.00 |
| Project X 0.05% ±10%, own rule | $43.98 | $0.6400 (1.422%, 158.1%/yr) | -2.268% | -252.1% | $44.71 (-0.638%) | in range -236430..-234420, 3 ranges, HYPE 59.87 |
| Project X 0.05% ±20%, own rule | $45.01 | $0.3092 (0.687%, 76.4%/yr) | 0.029% | 3.3% | $44.71 (-0.638%) | in range -237510..-233440, 1 range, HYPE 59.87 |
| Project X 0.3% ±10%, own rule | $44.16 | $0.7476 (1.661%, 184.7%/yr) | -1.866% | -207.5% | $44.80 (-0.439%) | in range -236460..-234360, 3 ranges, HYPE 59.99 |
| HLP (Hypercore vault) | $45.01 | $0.0124 (0.028%, 3.1%/yr) | 0.028% | 3.1% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0165 (0.037%, 4.1%/yr) | 0.037% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0188 (0.042%, 4.6%/yr) | 0.042% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 4.64% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0186 (0.041%, 4.6%/yr) | 0.041% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 4.64% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
