# Paper book, junior strategies

Marked 2026-11-27T04:16:44Z, 5.48 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.42 | $0.4759 (1.054%, 70.2%/yr) | 0.570% | 38.0% | $47.35 (4.846%) | in range -235650..-233640, 4 ranges, HYPE 66.27 |
| Nest ±20%, own rule | $46.96 | $0.2566 (0.570%, 38.0%/yr) | 4.359% | 290.6% | $47.18 (4.847%) | in range -237550..-233480, 1 range, HYPE 66.27 |
| Project X 0.05% ±10%, own rule | $46.13 | $1.1492 (2.554%, 170.2%/yr) | 2.521% | 168.0% | $47.10 (4.677%) | in range -235680..-233660, 4 ranges, HYPE 66.32 |
| Project X 0.05% ±20%, own rule | $47.24 | $0.5796 (1.288%, 85.9%/yr) | 4.978% | 331.8% | $47.10 (4.677%) | in range -237510..-233440, 1 range, HYPE 66.32 |
| Project X 0.3% ±10%, own rule | $46.26 | $1.2890 (2.864%, 190.9%/yr) | 2.798% | 186.5% | $47.13 (4.738%) | in range -235620..-233580, 4 ranges, HYPE 66.25 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.96 | $0.4731 (1.051%, 70.1%/yr) | -0.087% | -5.8% | $45.00 (0.000%) | LP fees $0.4830 + funding $0.0229 − hedge fees $0.0328 (40 trades); short 0.1918 vs LP 0.1853 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.05 | $1.0135 (2.252%, 150.1%/yr) | 0.110% | 7.3% | $45.00 (0.000%) | LP fees $1.0710 + funding $0.0241 − hedge fees $0.0816 (75 trades); short 0.2563 vs LP 0.2402 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0100 (0.022%, 1.5%/yr) | 0.022% | 1.5% | $45.00 (0.000%) | Hypercore reports 14.3% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0272 (0.061%, 4.0%/yr) | 0.061% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0293 (0.065%, 4.3%/yr) | 0.065% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0291 (0.065%, 4.3%/yr) | 0.065% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
