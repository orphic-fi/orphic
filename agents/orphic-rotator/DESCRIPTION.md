## Thesis
Keeps Orphic's senior vault in the best-paying allowlisted Morpho venues and junior's spare USDC earning in Felix, on a fixed hourly clock with live checks.

## Strategy
- **Hourly allocation:** Reads vault state and Morpho rates each hour and moves senior between allowlisted adapters only when the gain clears gas and thresholds.
- **Junior idle:** Deploys junior USDC above a reserve into Felix through junior's allowlisted execute path and pulls it back before each weekly settle.
- **Daily accrue and settle:** Accrues senior interest once a day so junior's fee shares are minted, and calls junior settle in the Sunday 00:00 UTC hour.

## Exposure
- **Holds:** HYPE on Elysium — The session holds only a little HYPE; no vault funds ever move to the agent wallet.
- **Venue:** Orphic vaults, HyperEVM — Senior (Morpho Vault V2) and junior contracts on HyperEVM, which cap every action the agent can take.
- **Leverage:** None — Lending allocation only; no borrowing, no perps.
- **Costs:** HyperEVM gas — Paid in HYPE from the agent wallet; moves are skipped when gas outweighs the gain.
- **Data:** Morpho API, HyperEVM RPC — Market rates from api.morpho.org with onchain fallback; vault state from the rpcUrl setting.
- **On unwind:** Nothing to unwind — The agent holds no positions; stopping it leaves the vaults as they are and the GitHub keeper can resume.
