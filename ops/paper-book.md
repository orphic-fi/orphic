# Paper book, junior strategies

Marked 2026-11-24T08:58:54Z, 2.67 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.46 | $0.1324 (0.293%, 40.0%/yr) | 0.662% | 90.4% | $46.42 (2.777%) | in range -235830..-233810, 2 ranges, HYPE 63.77 |
| Nest ±20%, own rule | $46.17 | $0.0761 (0.169%, 23.1%/yr) | 2.591% | 353.9% | $46.25 (2.775%) | in range -237550..-233480, 1 range, HYPE 63.77 |
| Project X 0.05% ±10%, own rule | $45.89 | $0.4846 (1.077%, 147.1%/yr) | 1.979% | 270.3% | $46.12 (2.492%) | in range -235570..-233550, 2 ranges, HYPE 63.67 |
| Project X 0.05% ±20%, own rule | $46.23 | $0.2360 (0.524%, 71.6%/yr) | 2.731% | 373.0% | $46.12 (2.492%) | in range -237510..-233440, 1 range, HYPE 63.67 |
| Project X 0.3% ±10%, own rule | $46.08 | $0.5745 (1.277%, 174.4%/yr) | 2.398% | 327.5% | $46.23 (2.738%) | in range -235560..-233520, 2 ranges, HYPE 63.83 |
| HLP (Hypercore vault) | $45.01 | $0.0130 (0.029%, 4.0%/yr) | 0.029% | 4.0% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0136 (0.030%, 4.1%/yr) | 0.030% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0157 (0.035%, 4.8%/yr) | 0.035% | 4.8% | $45.00 (0.000%) | liquidity index; supply APY now 3.93% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0155 (0.034%, 4.7%/yr) | 0.034% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.93% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
