# Junior v1.2: HyperLend as a venue (for Finn)

Diff: `contracts/src/JuniorVault.sol` (one new venue kind), `contracts/test/Lender.t.sol` (9 fork tests on the real pool).

What changed
- New venue kind "lender": an Aave v3-style pool plus its aToken. `addLender(pool, aToken)` binds the pair by reading
  `aToken.UNDERLYING_ASSET_ADDRESS()` (must be USDC) and `aToken.POOL()` (must be the pool), so a wrong pair reverts.
- Valuation: `lenderAssets(i) = aToken.balanceOf(junior)`. aToken balance is the underlying owed, interest included,
  in USDC decimals. Wrapped in the same try/catch as markets and vaults, so a reverting view marks the NAV incomplete
  and settle/deposit refuse, as before.
- Agent containment: `execute` accepts a lender pool as a target only under an explicit rule; `setRule` and
  `setApprovalRule` accept lender pools; the aToken itself can never be a rule target or an approval spender.
  `removeLender` requires a zero aToken balance; `forceRemoveLender` abandons a position like the other force removes.
- `setStakeToken` also rejects a lender pool address.

Rules we will set for HyperLend (owner tx, after deploy)
- `supply(address,uint256,address,uint16)` with receiverOffset 64 (onBehalfOf must be junior).
- `withdraw(address,uint256,address)` with receiverOffset 64 (to must be junior).
- approval rule USDC -> pool.
- Not allowed: borrow, repay, setUserUseReserveAsCollateral, anything else.

Questions to look at
1. aToken balanceOf can round down by 1 wei of USDC; NAV tolerance is fine, but check `removeLender` cannot be
   blocked forever by dust (it can: dust of 1 would block; `forceRemoveLender` is the escape, abandoning <1e-6 USDC).
2. HyperLend pause or frozen reserve: supply reverts (fine), withdraw reverts (position stuck until unfrozen);
   valuation still reads. Cap at 20% of junior until we have seen a freeze and recovery.
3. Reentrancy: pool calls are plain external calls under `nonReentrant`, same as Felix.

Tests: `HYPEREVM_RPC=https://hyperliquid.drpc.org FORK_BLOCK=<recent> forge test --match-contract LenderTest`
(the public rpc.hyperliquid.xyz serves current storage for historical blocks, so forks must use an archive RPC).
