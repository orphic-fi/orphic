# Paper book, junior strategies

Marked 2026-11-24T07:29:59Z, 2.61 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.63 | $0.1303 (0.289%, 40.3%/yr) | 1.040% | 145.4% | $46.56 (3.100%) | in range -235830..-233810, 2 ranges, HYPE 64.16 |
| Nest ±20%, own rule | $46.27 | $0.0747 (0.166%, 23.2%/yr) | 2.825% | 395.0% | $46.39 (3.099%) | in range -237550..-233480, 1 range, HYPE 64.16 |
| Project X 0.05% ±10%, own rule | $46.07 | $0.4730 (1.051%, 147.0%/yr) | 2.371% | 331.5% | $46.28 (2.846%) | in range -235570..-233550, 2 ranges, HYPE 64.10 |
| Project X 0.05% ±20%, own rule | $46.34 | $0.2307 (0.513%, 71.7%/yr) | 2.987% | 417.6% | $46.28 (2.846%) | in range -237510..-233440, 1 range, HYPE 64.10 |
| Project X 0.3% ±10%, own rule | $46.23 | $0.5572 (1.238%, 173.1%/yr) | 2.729% | 381.5% | $46.37 (3.055%) | in range -235560..-233520, 2 ranges, HYPE 64.22 |
| HLP (Hypercore vault) | $45.01 | $0.0132 (0.029%, 4.1%/yr) | 0.029% | 4.1% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0133 (0.029%, 4.1%/yr) | 0.029% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0154 (0.034%, 4.8%/yr) | 0.034% | 4.8% | $45.00 (0.000%) | liquidity index; supply APY now 3.94% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0152 (0.034%, 4.7%/yr) | 0.034% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.94% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
