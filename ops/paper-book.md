# Paper book, junior strategies

Marked 2026-11-28T03:04:20Z, 6.43 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.96 | $0.6230 (1.379%, 78.3%/yr) | -0.460% | -26.2% | $46.68 (3.347%) | in range -235650..-233640, 4 ranges, HYPE 64.46 |
| Nest ±20%, own rule | $46.61 | $0.3350 (0.744%, 42.3%/yr) | 3.579% | 203.3% | $46.51 (3.346%) | in range -237550..-233480, 1 range, HYPE 64.46 |
| Project X 0.05% ±10%, own rule | $45.71 | $1.3344 (2.965%, 168.4%/yr) | 1.581% | 89.8% | $46.40 (3.105%) | in range -235680..-233660, 4 ranges, HYPE 64.41 |
| Project X 0.05% ±20%, own rule | $46.86 | $0.6633 (1.474%, 83.7%/yr) | 4.137% | 235.0% | $46.40 (3.105%) | in range -237510..-233440, 1 range, HYPE 64.41 |
| Project X 0.3% ±10%, own rule | $45.83 | $1.4965 (3.326%, 188.9%/yr) | 1.848% | 104.9% | $46.44 (3.201%) | in range -235620..-233580, 4 ranges, HYPE 64.39 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.93 | $0.5425 (1.206%, 68.5%/yr) | -0.149% | -8.4% | $45.00 (0.000%) | LP fees $0.5527 + funding $0.0265 − hedge fees $0.0367 (46 trades); short 0.2231 vs LP 0.2269 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.00 | $1.1790 (2.620%, 148.8%/yr) | -0.001% | -0.1% | $45.00 (0.000%) | LP fees $1.2408 + funding $0.0290 − hedge fees $0.0909 (84 trades); short 0.3163 vs LP 0.3211 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0055 (0.012%, 0.7%/yr) | 0.012% | 0.7% | $45.00 (0.000%) | Hypercore reports 14.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0322 (0.072%, 4.1%/yr) | 0.072% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0339 (0.075%, 4.3%/yr) | 0.075% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.91% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0337 (0.075%, 4.2%/yr) | 0.075% | 4.2% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.22% realised 24h, HyperLend 3.91% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
