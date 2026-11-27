# Paper book, junior strategies

Marked 2026-11-27T08:00:21Z, 5.63 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $45.16 | $0.4961 (1.098%, 71.2%/yr) | -0.005% | -0.3% | $47.02 (4.112%) | in range -235650..-233640, 4 ranges, HYPE 65.38 |
| Nest ±20%, own rule | $46.77 | $0.2673 (0.594%, 38.5%/yr) | 3.940% | 255.4% | $46.85 (4.113%) | in range -237550..-233480, 1 range, HYPE 65.38 |
| Project X 0.05% ±10%, own rule | $45.89 | $1.1790 (2.620%, 169.8%/yr) | 1.968% | 127.5% | $46.75 (3.895%) | in range -235680..-233660, 4 ranges, HYPE 65.37 |
| Project X 0.05% ±20%, own rule | $47.03 | $0.5903 (1.312%, 85.0%/yr) | 4.517% | 292.8% | $46.75 (3.895%) | in range -237510..-233440, 1 range, HYPE 65.37 |
| Project X 0.3% ±10%, own rule | $46.01 | $1.3134 (2.919%, 189.2%/yr) | 2.252% | 146.0% | $46.81 (4.030%) | in range -235620..-233580, 4 ranges, HYPE 65.40 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.97 | $0.4829 (1.073%, 69.6%/yr) | -0.065% | -4.2% | $45.00 (0.000%) | LP fees $0.4919 + funding $0.0242 − hedge fees $0.0332 (41 trades); short 0.2061 vs LP 0.2055 HYPE; lowest margin 35% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.06 | $1.0338 (2.297%, 148.9%/yr) | 0.128% | 8.3% | $45.00 (0.000%) | LP fees $1.0910 + funding $0.0258 − hedge fees $0.0830 (77 trades); short 0.2766 vs LP 0.2766 HYPE; lowest margin 30% of short (maintenance 5.0%); 4 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0100 (0.022%, 1.4%/yr) | 0.022% | 1.4% | $45.00 (0.000%) | Hypercore reports 14.3% APR trailing; 4-day exit |
| Felix USDC, hold | $45.03 | $0.0280 (0.062%, 4.0%/yr) | 0.062% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.03 | $0.0300 (0.067%, 4.3%/yr) | 0.067% | 4.3% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.03 | $0.0298 (0.066%, 4.3%/yr) | 0.066% | 4.3% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 4.02% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
