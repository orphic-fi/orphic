# Paper book, junior strategies

Marked 2026-11-24T20:08:00Z, 3.14 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $43.49 | $0.1562 (0.346%, 40.2%/yr) | -3.706% | -431.2% | $44.95 (-0.479%) | in range -236420..-234400, 3 ranges, HYPE 59.83 |
| Nest ±20%, own rule | $44.87 | $0.0920 (0.205%, 23.8%/yr) | -0.293% | -34.1% | $44.78 (-0.486%) | in range -237550..-233480, 1 range, HYPE 59.83 |
| Project X 0.05% ±10%, own rule | $43.87 | $0.6179 (1.373%, 159.8%/yr) | -2.500% | -290.9% | $44.63 (-0.817%) | in range -236430..-234420, 3 ranges, HYPE 59.66 |
| Project X 0.05% ±20%, own rule | $44.92 | $0.2978 (0.662%, 77.0%/yr) | -0.187% | -21.7% | $44.63 (-0.817%) | in range -237510..-233440, 1 range, HYPE 59.66 |
| Project X 0.3% ±10%, own rule | $44.05 | $0.7190 (1.598%, 185.9%/yr) | -2.106% | -245.0% | $44.73 (-0.611%) | in range -236460..-234360, 3 ranges, HYPE 59.78 |
| HLP (Hypercore vault) | $45.01 | $0.0125 (0.028%, 3.2%/yr) | 0.028% | 3.2% | $45.00 (0.000%) | Hypercore reports 16.5% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0158 (0.035%, 4.1%/yr) | 0.035% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0180 (0.040%, 4.6%/yr) | 0.040% | 4.6% | $45.00 (0.000%) | liquidity index; supply APY now 4.56% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0178 (0.039%, 4.6%/yr) | 0.039% | 4.6% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.95% realised 24h, HyperLend 4.56% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
