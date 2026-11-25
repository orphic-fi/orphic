# Paper book, junior strategies

Marked 2026-11-25T22:08:22Z, 4.22 days since 2026-11-21T16:51:00Z. $45 paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.

| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |
|---|---|---|---|---|---|---|
| Nest ±10%, Circuit Ranger (live paper) | $44.16 | $0.2548 (0.564%, 48.8%/yr) | -2.231% | -192.9% | $45.57 (0.909%) | in range -236420..-234400, 3 ranges, HYPE 61.51 |
| Nest ±20%, own rule | $45.53 | $0.1430 (0.318%, 27.5%/yr) | 1.184% | 102.4% | $45.41 (0.904%) | in range -237550..-233480, 1 range, HYPE 61.51 |
| Project X 0.05% ±10%, own rule | $44.81 | $0.9255 (2.057%, 177.9%/yr) | -0.427% | -36.9% | $45.33 (0.729%) | in range -236430..-234420, 3 ranges, HYPE 61.53 |
| Project X 0.05% ±20%, own rule | $45.77 | $0.4543 (1.010%, 87.3%/yr) | 1.714% | 148.2% | $45.33 (0.729%) | in range -237510..-233440, 1 range, HYPE 61.53 |
| Project X 0.3% ±10%, own rule | $45.00 | $1.0392 (2.309%, 199.7%/yr) | 0.008% | 0.7% | $45.43 (0.962%) | in range -236460..-234360, 3 ranges, HYPE 61.68 |
| Project X 0.05% ±20% + $HYPE short on Hypercore, own rule | $44.98 | $0.3665 (0.815%, 70.4%/yr) | -0.055% | -4.8% | $45.00 (0.000%) | LP fees $0.3786 + funding $0.0157 − hedge fees $0.0278 (33 trades); short 0.2845 vs LP 0.2912 HYPE; lowest margin 36% of short (maintenance 5.0%); 1 range; hold = $45 USDC |
| HLP (Hypercore vault) | $45.01 | $0.0124 (0.028%, 2.4%/yr) | 0.028% | 2.4% | $45.00 (0.000%) | Hypercore reports 15.4% APR trailing; 4-day exit |
| Felix USDC, hold | $45.02 | $0.0211 (0.047%, 4.1%/yr) | 0.047% | 4.1% | $45.00 (0.000%) | price per share, Morpho vault |
| HyperLend USDC, hold | $45.02 | $0.0233 (0.052%, 4.5%/yr) | 0.052% | 4.5% | $45.00 (0.000%) | liquidity index; supply APY now 3.96% |
| Lending rotation, Felix or HyperLend (0.5 pt rule, no gas) | $45.02 | $0.0231 (0.051%, 4.4%/yr) | 0.051% | 4.4% | $45.00 (0.000%) | in hyperlend, 1 move; Felix 3.91% realised 24h, HyperLend 3.96% posted |

Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged line: same range and rule as Project X 0.05% ±20%, with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; its fees column is LP fees plus funding minus hedge fees, and its hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.

Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.
