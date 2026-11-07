# Orphic

Agentic USDC vault on HyperEVM with a senior/junior split, fronted on Elysium. Unaudited, capped, owner can pause deposits and never withdrawals.

- `contracts/` Foundry. Senior is a Morpho Vault V2 created by Morpho's factory (no code of ours). `src/JuniorVault.sol` and `src/FeeRouter.sol` are custom and unaudited. Tests fork HyperEVM: `HYPEREVM_RPC=https://hyperliquid.drpc.org forge test`.
- `keeper/` Rotator, TypeScript, runs hourly from `.github/workflows/rotator.yml`. Dry-run unless the repository variable `LIVE=1` is set.
- `web/` Vite + React front end for orphic.fi.
- `ops/` FACTS, DECISIONS, LIMITATIONS, RUNBOOK.

Verified chain facts and every address: `ops/FACTS.md`.
