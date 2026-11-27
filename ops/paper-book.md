# Paper book, junior strategies

Marked 2026-11-27T05:33:15Z, 5.53 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.33 | $0.4821 (1.068%, 70.5%/yr) | 0.377% | 24.9% | $47.24 (4.589%) | in range -235650..-233640, 4 ranges, HYPE 65.96 |
| Nest ±20%, own rule | $46.90 | $0.2599 (0.578%, 38.1%/yr) | 4.217% | 278.4% | $47.07 (4.590%) | in range -237550..-233480, 1 range, HYPE 65.96 |
| Project X 0.05% ±10%, own rule | $46.05 | $1.1606 (2.579%, 170.2%/yr) | 2.344% | 154.7% | $46.98 (4.407%) | in range -235680..-233660, 4 ranges, HYPE 65.99 |
| Project X 0.05% ±20%, own rule | $47.17 | $0.5838 (1.297%, 85.6%/yr) | 4.826% | 318.6% | $46.98 (4.407%) | in range -237510..-233440, 1 range, HYPE 65.99 |
| Project X 0.3% ±10%, own rule | $46.19 | $1.2947 (2.877%, 189.9%/yr) | 2.655% | 175.3% | $47.04 (4.544%) | in range -235620..-233580, 4 ranges, HYPE 66.02 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.97 | $0.4773 (1.061%, 70.0%/yr) | -0.073% | -4.8% | $45.00 (0.000%) | LP fees $0.4865 + funding $0.0235 − hedge fees $0.0328 (40 trades); short 0.1918 vs LP 0.1922 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.06 | $1.0189 (2.264%, 149.5%/yr) | 0.128% | 8.5% | $45.00 (0.000%) | LP fees $1.0756 + funding $0.0249 − hedge fees $0.0816 (75 trades); short 0.2563 vs LP 0.2501 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0103 (0.023%, 1.5%/yr) | 0.023% | 1.5% | $45.00 (0.000%) | Hypercore reports 14.3% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0275 (0.061%, 4.0%/yr) | 0.061% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0296 (0.066%, 4.3%/yr) | 0.066% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0294 (0.065%, 4.3%/yr) | 0.065% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
