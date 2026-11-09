# Orphic Rotator on Circuit

The Orphic keeper (`../../keeper`) bundled as a Circuit agent. `index.ts` only supplies the signer (Circuit's wallet) and the
logger; every decision comes from the same tested code the GitHub keeper runs. Rebuild the bundle after any keeper change:

    cd keeper && npm run build:agent && cd ../agents/orphic-rotator && circuit check

Settings: `dryRun` (default true: log decisions, send nothing) and `rpcUrl` (HyperEVM read endpoint). The session's
starting asset is a little HYPE on Elysium; every transaction targets the vault contracts on HyperEVM.

What the wallet can do is bounded by the contracts: senior allocation within curator caps (needs the allocator role),
junior allowlisted venue calls with junior as receiver, syncSenior, settle, accrueInterest (the last three are permissionless).

## Fork test (9 Nov 2026)
Local `circuit run --wallet forktest --rpc ethereum:999=<anvil fork>` with the fork granting the test wallet both roles:
- shadow run against live HyperEVM: HOLD, accrue skip, junior hold; identical to the GitHub keeper's tick at the same hour
- live run on the fork with 100 USDC of extra junior idle: Circuit's engine signed and sent junior.execute(approve) and
  junior.execute(Felix.deposit); junior idle 105 -> 5 USDC, Felix position +100
- role revoked on the fork: the call was refused at simulation (NotAgent), nothing sent

Anvil note: HyperEVM public RPC serves state newer than the fork block's clock; mine one block with the current timestamp
(`evm_setNextBlockTimestamp`) before reading Felix, or the Morpho IRM underflows.
