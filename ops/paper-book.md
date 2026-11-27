# Paper book, junior strategies

Marked 2026-11-27T18:14:31Z, 6.06 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.59 | $0.5911 (1.309%, 78.9%/yr) | -1.278% | -77.0% | $46.37 (2.659%) | in range -235650..-233640, 4 ranges, HYPE 63.63 |
| Nest ±20%, own rule | $46.37 | $0.3180 (0.707%, 42.6%/yr) | 3.039% | 183.1% | $46.20 (2.657%) | in range -237550..-233480, 1 range, HYPE 63.63 |
| Project X 0.05% ±10%, own rule | $45.36 | $1.2963 (2.881%, 173.6%/yr) | 0.801% | 48.3% | $46.10 (2.444%) | in range -235680..-233660, 4 ranges, HYPE 63.61 |
| Project X 0.05% ±20%, own rule | $46.62 | $0.6409 (1.424%, 85.8%/yr) | 3.593% | 216.5% | $46.10 (2.444%) | in range -237510..-233440, 1 range, HYPE 63.61 |
| Project X 0.3% ±10%, own rule | $45.49 | $1.4494 (3.221%, 194.1%/yr) | 1.086% | 65.4% | $46.17 (2.605%) | in range -235620..-233580, 4 ranges, HYPE 63.67 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.92 | $0.5239 (1.164%, 70.2%/yr) | -0.169% | -10.2% | $45.00 (0.000%) | LP fees $0.5341 + funding $0.0257 − hedge fees $0.0358 (44 trades); short 0.2295 vs LP 0.2446 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $44.97 | $1.1403 (2.534%, 152.7%/yr) | -0.056% | -3.4% | $45.00 (0.000%) | LP fees $1.2023 + funding $0.0279 − hedge fees $0.0899 (83 trades); short 0.3497 vs LP 0.3525 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0080 (0.018%, 1.1%/yr) | 0.018% | 1.1% | $45.00 (0.000%) | Hypercore reports 14.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0303 (0.067%, 4.1%/yr) | 0.067% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0321 (0.071%, 4.3%/yr) | 0.071% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0319 (0.071%, 4.3%/yr) | 0.071% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.12% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
