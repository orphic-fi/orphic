# Paper book, junior strategies

Marked 2026-11-25T00:10:58Z, 3.31 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.40 | $0.1622 (0.359%, 39.7%/yr) | -3.916% | -432.4% | $44.85 (-0.691%) | in range -236420..-234400, 3 ranges, HYPE 59.57 |
| Nest ±20%, own rule | $44.77 | $0.0951 (0.211%, 23.3%/yr) | -0.510% | -56.3% | $44.69 (-0.698%) | in range -237550..-233480, 1 range, HYPE 59.57 |
| Project X 0.05% ±10%, own rule | $43.80 | $0.6423 (1.427%, 157.6%/yr) | -2.665% | -294.3% | $44.54 (-1.022%) | in range -236430..-234420, 3 ranges, HYPE 59.41 |
| Project X 0.05% ±20%, own rule | $44.83 | $0.3092 (0.687%, 75.9%/yr) | -0.385% | -42.5% | $44.54 (-1.022%) | in range -237510..-233440, 1 range, HYPE 59.41 |
| Project X 0.3% ±10%, own rule | $44.00 | $0.7520 (1.671%, 184.5%/yr) | -2.227% | -245.9% | $44.64 (-0.795%) | in range -236460..-234360, 3 ranges, HYPE 59.56 |
| HLP (Hypercore vault) | $45.01 | $0.0114 (0.025%, 2.8%/yr) | 0.025% | 2.8% | $45.00 (0.000%) | Hypercore reports 15.8% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0167 (0.037%, 4.1%/yr) | 0.037% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0189 (0.042%, 4.6%/yr) | 0.042% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 4.64% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0187 (0.042%, 4.6%/yr) | 0.042% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 4.64% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
