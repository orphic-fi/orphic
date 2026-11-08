---
title: FAQ
order: 9
---

# FAQ

**Is Orphic audited?**
No. Senior is Morpho's audited Vault V2 code. Junior, the fee router and the agent allowlist are custom, unaudited, fork-tested, and have had two independent review passes that found and fixed 15 issues. The launch is capped at $500,000 with a $10,000 per-wallet junior cap in week one because of this. See Risks.

**Who holds my USDC?**
Senior: the Morpho Vault V2 contract and, through its adapters, Morpho Blue markets and the Felix vault. Orphic never holds senior's USDC. Junior: the `JuniorVault` contract, which the agent can move only to the registered venues and back. No Orphic key can withdraw either.

**What do I earn?**
Senior: the rates of the Morpho USDC markets and Felix, less the 0.5% a year management fee, plus 50% of Orphic's fees paid into the vault. Junior: that 0.5% fee as senior shares, the agents' results, and 25% of fees, minus every loss first. No rate is promised; the site shows live readings and labelled estimates only.

**Why would I hold senior instead of Felix directly?**
Same markets, 0 performance fee against Felix's 10% of yield, a first-loss buffer under you, and a fee stream paid into the vault. The cost is the 0.5% management fee and, on the Felix slice, Felix's own fee still applies.

**How fast can I withdraw from senior?**
Instantly, to the liquidity available: idle USDC first, then the Felix leg. If the markets are near full utilisation, a large withdrawal may wait for the Rotator to deallocate, or you can call Vault V2's `forceDeallocate` yourself.

**How do I exit junior?**
`requestExit(shares)`, wait for notice to end at a UTC midnight at least 7 days out, and your shares are priced at the first weekly settle after that. Then `claimExit()`. Plan on 8 to 14 days. Until the pricing settle your shares still take gains and losses.

**What is the ORPH stake and do I get it back?**
20% of your junior deposit's value in ORPH at the rate in force when you deposit, held in the contract. It earns nothing and is returned in full on a full exit, pro rata on a partial one, regardless of what your shares are worth. Its USDC value follows ORPH's price.

**What happens to senior when a market loses money?**
Senior's price drops immediately. At the next weekly settle, junior sends USDC into the senior vault to close the gap. Morpho's vault then recognises that payment at up to 0.548% of assets per day, so a 2% cover shows fully after about 4 days. Withdraw during that window and you take the unrecognised part. The app shows "Cover in progress" while this is happening.

**Can junior lose everything?**
Yes. Junior pays senior's losses up to its entire idle USDC and bears its own venue losses on top. The ORPH stake is not consumed by losses.

**What can the owner do?**
Pause junior deposits, change the agent, add or remove venues, set caps, and propose a stake rate that applies after 3 days. On senior, caps, adapters, fees and allocators change only after a 3-day public timelock, except lowering a cap, which is instant and is the kill switch. The owner cannot withdraw, stop exits or settles, or touch stakes.

**What if the agent key is stolen?**
It can only move funds between the registered venues and the contracts, never out. The owner pauses deposits, removes the agent, lowers senior's caps to zero, and rotates the key. Expect delays, not losses.

**Where are the contract addresses?**
Published at launch on the Contracts page and the status page, each with a read-back. Nowhere else is authoritative. Anything claiming to be Orphic on another chain or at another address before then is not Orphic.
