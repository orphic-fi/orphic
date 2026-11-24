# Paper book, junior strategies

Marked 2026-11-24T20:23:15Z, 3.15 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.45 | $0.1568 (0.347%, 40.3%/yr) | -3.800% | -440.7% | $44.91 (-0.570%) | in range -236420..-234400, 3 ranges, HYPE 59.72 |
| Nest ±20%, own rule | $44.83 | $0.0923 (0.205%, 23.8%/yr) | -0.388% | -45.0% | $44.74 (-0.577%) | in range -237550..-233480, 1 range, HYPE 59.72 |
| Project X 0.05% ±10%, own rule | $43.82 | $0.6206 (1.379%, 159.9%/yr) | -2.631% | -305.2% | $44.57 (-0.946%) | in range -236430..-234420, 3 ranges, HYPE 59.50 |
| Project X 0.05% ±20%, own rule | $44.85 | $0.2987 (0.664%, 77.0%/yr) | -0.325% | -37.7% | $44.57 (-0.946%) | in range -237510..-233440, 1 range, HYPE 59.50 |
| Project X 0.3% ±10%, own rule | $44.00 | $0.7205 (1.601%, 185.7%/yr) | -2.223% | -257.8% | $44.67 (-0.726%) | in range -236460..-234360, 3 ranges, HYPE 59.64 |
| HLP (Hypercore vault) | $45.01 | $0.0126 (0.028%, 3.2%/yr) | 0.028% | 3.2% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0159 (0.035%, 4.1%/yr) | 0.035% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0180 (0.040%, 4.6%/yr) | 0.040% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 4.56% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0178 (0.039%, 4.6%/yr) | 0.039% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 4.56% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
