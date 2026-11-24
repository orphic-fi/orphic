# Paper book, junior strategies

Marked 2026-11-24T02:00:37Z, 2.38 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.45 | $0.1228 (0.272%, 41.7%/yr) | 0.624% | 95.6% | $46.41 (2.763%) | in range -235830..-233810, 2 ranges, HYPE 63.75 |
| Nest ±20%, own rule | $46.15 | $0.0697 (0.155%, 23.7%/yr) | 2.566% | 393.2% | $46.24 (2.761%) | in range -237550..-233480, 1 range, HYPE 63.75 |
| Project X 0.05% ±10%, own rule | $45.78 | $0.4310 (0.958%, 146.8%/yr) | 1.743% | 267.1% | $46.08 (2.396%) | in range -235570..-233550, 2 ranges, HYPE 63.55 |
| Project X 0.05% ±20%, own rule | $46.17 | $0.2095 (0.466%, 71.3%/yr) | 2.597% | 398.0% | $46.08 (2.396%) | in range -237510..-233440, 1 range, HYPE 63.55 |
| Project X 0.3% ±10%, own rule | $45.93 | $0.5065 (1.125%, 172.5%/yr) | 2.074% | 317.9% | $46.17 (2.596%) | in range -235560..-233520, 2 ranges, HYPE 63.66 |
| HLP (Hypercore vault) | $45.01 | $0.0135 (0.030%, 4.6%/yr) | 0.030% | 4.6% | $45.00 (0.000%) | Hypercore reports 16.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.01 | $0.0121 (0.027%, 4.1%/yr) | 0.027% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.01 | $0.0143 (0.032%, 4.9%/yr) | 0.032% | 4.9% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.01 | $0.0141 (0.031%, 4.8%/yr) | 0.031% | 4.8% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
