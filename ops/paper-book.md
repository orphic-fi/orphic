# Paper book, junior strategies

Marked 2026-11-26T04:07:03Z, 4.47 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.29 | $0.2678 (0.593%, 48.4%/yr) | -1.946% | -158.9% | $45.73 (1.252%) | in range -236420..-234400, 3 ranges, HYPE 61.92 |
| Nest ±20%, own rule | $45.68 | $0.1496 (0.332%, 27.2%/yr) | 1.508% | 123.1% | $45.56 (1.248%) | in range -237550..-233480, 1 range, HYPE 61.92 |
| Project X 0.05% ±10%, own rule | $44.97 | $0.9631 (2.140%, 174.8%/yr) | -0.074% | -6.1% | $45.50 (1.104%) | in range -236430..-234420, 3 ranges, HYPE 61.99 |
| Project X 0.05% ±20%, own rule | $45.95 | $0.4740 (1.053%, 86.0%/yr) | 2.101% | 171.6% | $45.50 (1.104%) | in range -237510..-233440, 1 range, HYPE 61.99 |
| Project X 0.3% ±10%, own rule | $45.08 | $1.0767 (2.393%, 195.4%/yr) | 0.183% | 15.0% | $45.49 (1.087%) | in range -236460..-234360, 3 ranges, HYPE 61.84 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.99 | $0.3842 (0.854%, 69.7%/yr) | -0.017% | -1.4% | $45.00 (0.000%) | LP fees $0.3950 + funding $0.0170 − hedge fees $0.0278 (33 trades); short 0.2845 vs LP 0.2806 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| Project X 0.3% ±10% + $HYPE short on Hypercore, own rule | $45.15 | $0.8481 (1.885%, 153.9%/yr) | 0.341% | 27.9% | $45.00 (0.000%) | LP fees $0.8913 + funding $0.0188 − hedge fees $0.0620 (61 trades); short 0.2339 vs LP 0.2321 HYPE; lowest margin 30% of short (maintenance 5.0%); 3 ranges; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0128 (0.028%, 2.3%/yr) | 0.028% | 2.3% | $45.00 (0.000%) | Hypercore reports 15.6% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0223 (0.050%, 4.0%/yr) | 0.050% | 4.0% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0245 (0.054%, 4.4%/yr) | 0.054% | 4.4% | $45.00 (0.000%) | liquidity index; supply APY now 3.95% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0242 (0.054%, 4.4%/yr) | 0.054% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.91% realised 24h, HyperLend 3.95% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged lines: same range and rule as the matching unhedged line (Project X 0.05% ±20% and 0.3% ±10%), with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; their fees column is LP fees plus funding minus hedge fees, and their hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
