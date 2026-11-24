# Paper book, junior strategies

Marked 2026-11-24T05:46:15Z, 2.54 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.71 | $0.1291 (0.286%, 41.1%/yr) | 1.213% | 174.5% | $46.63 (3.253%) | in range -235830..-233810, 2 ranges, HYPE 64.34 |
| Nest ±20%, own rule | $46.32 | $0.0739 (0.164%, 23.6%/yr) | 2.933% | 421.7% | $46.46 (3.252%) | in range -237550..-233480, 1 range, HYPE 64.34 |
| Project X 0.05% ±10%, own rule | $46.17 | $0.4659 (1.035%, 148.9%/yr) | 2.603% | 374.3% | $46.38 (3.066%) | in range -235570..-233550, 2 ranges, HYPE 64.37 |
| Project X 0.05% ±20%, own rule | $46.41 | $0.2273 (0.505%, 72.6%/yr) | 3.140% | 451.6% | $46.38 (3.066%) | in range -237510..-233440, 1 range, HYPE 64.37 |
| Project X 0.3% ±10%, own rule | $46.22 | $0.5544 (1.232%, 177.2%/yr) | 2.718% | 390.8% | $46.37 (3.051%) | in range -235560..-233520, 2 ranges, HYPE 64.21 |
| HLP (Hypercore vault) | $45.01 | $0.0136 (0.030%, 4.3%/yr) | 0.030% | 4.3% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0129 (0.029%, 4.1%/yr) | 0.029% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0151 (0.033%, 4.8%/yr) | 0.033% | 4.8% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0149 (0.033%, 4.7%/yr) | 0.033% | 4.7% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
