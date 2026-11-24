# Paper book, junior strategies

Marked 2026-11-24T23:23:45Z, 3.27 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.65 | $0.1618 (0.358%, 40.0%/yr) | -3.346% | -373.1% | $45.10 (-0.131%) | in range -236420..-234400, 3 ranges, HYPE 60.25 |
| Nest ±20%, own rule | $45.03 | $0.0949 (0.211%, 23.5%/yr) | 0.072% | 8.1% | $44.94 (-0.138%) | in range -237550..-233480, 1 range, HYPE 60.25 |
| Project X 0.05% ±10%, own rule | $44.07 | $0.6392 (1.421%, 158.4%/yr) | -2.061% | -229.8% | $44.81 (-0.429%) | in range -236430..-234420, 3 ranges, HYPE 60.13 |
| Project X 0.05% ±20%, own rule | $45.11 | $0.3094 (0.688%, 76.7%/yr) | 0.250% | 27.9% | $44.81 (-0.429%) | in range -237510..-233440, 1 range, HYPE 60.13 |
| Project X 0.3% ±10%, own rule | $44.24 | $0.7454 (1.657%, 184.7%/yr) | -1.694% | -188.9% | $44.88 (-0.259%) | in range -236460..-234360, 3 ranges, HYPE 60.21 |
| HLP (Hypercore vault) | $45.01 | $0.0124 (0.028%, 3.1%/yr) | 0.028% | 3.1% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0165 (0.037%, 4.1%/yr) | 0.037% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0187 (0.041%, 4.6%/yr) | 0.041% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 4.56% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0185 (0.041%, 4.6%/yr) | 0.041% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 4.56% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
