# Paper book, junior strategies

Marked 2026-11-26T20:48:16Z, 5.16 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.70 | $0.3707 (0.821%, 58.0%/yr) | -1.021% | -72.1% | $46.24 (2.379%) | in range -236420..-234400, 3 ranges, HYPE 63.29 |
| Nest ±20%, own rule | $46.15 | $0.2024 (0.450%, 31.8%/yr) | 2.566% | 181.4% | $46.07 (2.377%) | in range -237550..-233480, 1 range, HYPE 63.29 |
| Project X 0.05% ±10%, own rule | $45.32 | $1.0720 (2.382%, 168.4%/yr) | 0.711% | 50.3% | $45.90 (2.011%) | in range -236430..-234420, 3 ranges, HYPE 63.09 |
| Project X 0.05% ±20%, own rule | $46.35 | $0.5305 (1.179%, 83.3%/yr) | 3.003% | 212.2% | $45.90 (2.011%) | in range -237510..-233440, 1 range, HYPE 63.09 |
| Project X 0.3% ±10%, own rule | $45.50 | $1.1953 (2.656%, 187.7%/yr) | 1.117% | 79.0% | $45.97 (2.148%) | in range -236460..-234360, 3 ranges, HYPE 63.12 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $45.01 | $0.4337 (0.964%, 68.1%/yr) | 0.012% | 0.8% | $45.00 (0.000%) | LP fees $0.4421 + funding $0.0206 − hedge fees $0.0290 (35 trades); short 0.2805 vs LP 0.2557 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.12 | $0.9448 (2.100%, 148.4%/yr) | 0.258% | 18.2% | $45.00 (0.000%) | LP fees $0.9923 + funding $0.0220 − hedge fees $0.0694 (69 trades); short 0.2143 vs LP 0.1737 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0106 (0.023%, 1.7%/yr) | 0.023% | 1.7% | $45.00 (0.000%) | Hypercore reports 15.7% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0257 (0.057%, 4.0%/yr) | 0.057% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0278 (0.062%, 4.4%/yr) | 0.062% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0276 (0.061%, 4.3%/yr) | 0.061% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.98% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
