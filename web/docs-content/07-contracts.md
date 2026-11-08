---
title: Contracts
order: 7
---

# Contracts

All Orphic contracts are on HyperEVM, chain id 999. Explorer: `https://hyperevmscan.io`. Public RPC for reads: `https://rpc.hyperliquid.xyz/evm`.

## Orphic addresses

Nothing below is deployed at the time of writing. Each address is published at launch, on this page and on the status page, together with the read-back that proves it. Do not trust an address for any of these from any other source.

| Contract | What it is | Address |
|---|---|---|
| Senior vault | Morpho Vault V2, USDC | published at launch |
| Senior market adapter | MorphoMarketV1 adapter | published at launch |
| Senior Felix adapter | MorphoVaultV1 adapter, liquidity adapter | published at launch |
| JuniorVault | `ojUSDC`, custom | published at launch |
| FeeRouter | custom | published at launch |
| ORPH | ERC-20 | published at launch |
| Treasury timelock | OpenZeppelin `TimelockController`, 3 days | published at launch |
| Incentives timelock | OpenZeppelin `TimelockController`, 3 days | published at launch |
| Team vesting | OpenZeppelin `VestingWalletCliff` | published at launch |
| HYPE/ORPH pool id | Uniswap v4 pool, 1% fee, tick spacing 200, no hook | published at launch |
| Launch position token id | Uniswap v4 PositionManager NFT, owned by the Safe | published at launch |
| Orphic Safe | senior owner and curator, position owner | published at launch |
| Junior and router owner | hardware wallet | published at launch |
| Agent key | Rotator EOA | published at launch |
| Treasury | fee recipient | published at launch |
| RangerVault | week one | published when deployed |

## Infrastructure addresses on HyperEVM

Read back on-chain on 7 November 2026. Where a bytecode hash is quoted in the source notes it matched the same contract on Ethereum or Base.

| Item | Address |
|---|---|
| USDC (6 decimals) | `0xb88339CB7199b77E23DB6E890353E22632Ba630f` |
| Morpho Blue | `0x68e37dE8d93d3496ae143F2E900490f6280C57cD` |
| Morpho Vault V2 factory | `0xD7217E5687FF1071356C780b5fe4803D9D967da7` |
| MorphoMarketV1AdapterFactory | `0xaEff6Ef4B7bbfbAadB18b634A8F11392CBeB72Be` |
| MorphoVaultV1AdapterFactory | `0xdf5202e29654e02011611A086f15477880580CAc` |
| Adaptive Curve IRM | `0xD4a426F010986dCad727e8dd6eed44cA4A9b7483` |
| Felix USDC v1.1 vault | `0x8A862fD6c12f9ad34C9c2ff45AB2b6712e8CEa27` |
| WHYPE | `0x5555555555555555555555555555555555555555` |
| Uniswap v4 PoolManager | `0x12D4Fd9C5DeDd00ab8a0bCe2CF0167bbf94b6B1F` |
| Uniswap v4 PositionManager | `0x0d7Ab5B3db668128Aff6F70C4eBC71D7d4DA9bf9` |
| Uniswap v4 StateView (used by the keeper) | `0x1656326235cb9E34Cb58CaDe53AE30789AB32A1A` |
| Safe singleton 1.4.1 | `0x41675C099F32341bf84BFc5382aF534df5C7461a` |
| SafeProxyFactory 1.4.1 | `0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67` |
| Zodiac Roles v2 mastercopy | `0x9646fDAD06d3e24444381f44362a3B0eB343D337` |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |

Market ids for the four registered Morpho markets are in Senior.

## Privileged functions and their delays

### Senior (Vault V2)

Timelocks are 0 at creation. The deploy batch sets adapters, caps, fee, `maxRate` and liquidity adapter, then raises the timelock to 3 days (259,200 seconds) as its last step.

| Function | Who | Delay |
|---|---|---|
| `addAdapter`, adapter registry changes | curator | 3 days |
| `increaseAbsoluteCap`, `increaseRelativeCap` | curator | 3 days |
| `setManagementFee`, `setPerformanceFee`, fee recipients | curator | 3 days |
| `setIsAllocator` | curator | 3 days |
| gates (`receiveSharesGate` and others) | curator | 3 days |
| `setForceDeallocatePenalty` | curator | 3 days |
| `setLiquidityAdapterAndData`, `setMaxRate` | any allocator (this includes the Rotator key) | instant, per Vault V2; `maxRate` cannot exceed 200% a year |
| `setIsSentinel` | owner | instant |
| `decreaseAbsoluteCap`, `decreaseRelativeCap` | curator or sentinel | instant |
| revoke a pending submission | curator or sentinel | instant |
| `allocate`, `deallocate` | allocator (Rotator key) | instant, within caps |
| `forceDeallocate` | anyone | instant, penalty as set |

### JuniorVault

| Function | Who | Delay |
|---|---|---|
| `seed()` | owner | once |
| `setDepositsPaused(bool)` | owner | instant; deposits only |
| `setAgent(address)` | owner | instant |
| `setDepositCap(uint256)`, `setWalletCap(uint256)` | owner | instant |
| `addMarket`, `addVault` | owner | instant; loan asset must be USDC; never self or USDC; at most 16 each |
| `removeMarket(i)`, `removeVault(i)` | owner | instant; only with a zero position |
| `forceRemoveMarket(i)`, `forceRemoveVault(i)` | owner | instant; for a venue whose view reverts |
| `setRule(target, selector, allowed, receiverOffset)` | owner | instant; target must be Morpho or a registered vault; never `transfer`, `transferFrom`, `approve` |
| `setApprovalRule(token, spender, allowed)` | owner | instant; spender must be Morpho or a registered vault; never the stake token |
| `setStakeToken(token, rate)` | owner | once; never USDC, Morpho or a registered vault |
| `proposeStakePerAsset(rate)` | owner | starts a 3-day timelock |
| `applyStakePerAsset()` | anyone | after the 3 days |
| `cancelStakePerAsset()` | owner | instant |
| `execute(target, data)` | agent | instant, under the allowlist |
| `settle()` | anyone | at most once per 7 days less 1 hour |
| `syncSenior()` | anyone | instant |
| `deposit`, `requestExit`, `claimExit` | anyone | see Junior |
| ownership transfer | owner, then the new owner accepts | two-step |

### FeeRouter

| Function | Who | Delay |
|---|---|---|
| `sweep(token, router, swapData, amountIn)` | keeper or owner | instant; router allowlisted, floor from oracle, value at most `maxSweepUsdc` |
| `distribute()` | keeper or owner | instant |
| `sweepBurn(token)` | keeper or owner | instant; burn-split tokens only |
| `pullOwed(to, token)` | anyone | instant; only to the recorded recipient |
| `setRouter`, `setFloor` (slippage at most 10%), `setBurn`, `setRecipients`, `setSplit`, `setMaxSweepUsdc`, `setKeeper` | owner | instant |
| ownership transfer | owner, then the new owner accepts | two-step |

### ORPH, timelocks, vesting

ORPH has no privileged functions. The two `TimelockController`s have a 3-day minimum delay and an admin on the Safe. The vesting wallet releases to the team beneficiary only.

## Reading state yourself

Install Foundry (`cast`). Set the addresses from the table at the top once they are published.

```
export RPC=https://rpc.hyperliquid.xyz/evm
export SENIOR=0x...   JUNIOR=0x...   ROUTER=0x...   ORPH=0x...
export USDC=0xb88339CB7199b77E23DB6E890353E22632Ba630f
```

Senior:

```
cast call $SENIOR "totalAssets()(uint256)" --rpc-url $RPC            # USDC, 6 decimals
cast call $SENIOR "managementFee()(uint256)" --rpc-url $RPC          # 158548959 = 0.5% a year
cast call $SENIOR "managementFeeRecipient()(address)" --rpc-url $RPC # must equal $JUNIOR
cast call $SENIOR "performanceFee()(uint256)" --rpc-url $RPC         # 0
cast call $SENIOR "maxRate()(uint256)" --rpc-url $RPC                # 63419583967 = 200% a year
cast call $SENIOR "liquidityAdapter()(address)" --rpc-url $RPC       # the Felix adapter
cast call $SENIOR "curator()(address)" --rpc-url $RPC                # the Safe
cast call $SENIOR "isAllocator(address)(bool)" $AGENT --rpc-url $RPC
cast call $USDC "balanceOf(address)(uint256)" $SENIOR --rpc-url $RPC # idle USDC in the vault
cast call 0xD7217E5687FF1071356C780b5fe4803D9D967da7 "isVaultV2(address)(bool)" $SENIOR --rpc-url $RPC
```

Cap on an adapter id (here the Felix adapter):

```
ID=$(cast keccak $(cast abi-encode "f(string,address)" "this" $FELIX_ADAPTER))
cast call $SENIOR "absoluteCap(bytes32)(uint256)" $ID --rpc-url $RPC
cast call $SENIOR "relativeCap(bytes32)(uint256)" $ID --rpc-url $RPC
```

Timelock on a curator function (example: `addAdapter`):

```
cast call $SENIOR "timelock(bytes4)(uint256)" $(cast sig "addAdapter(address)") --rpc-url $RPC   # 259200
```

Junior:

```
cast call $JUNIOR "totalAssets()(uint256)" --rpc-url $RPC        # USDC, net of reserved exits
cast call $JUNIOR "pricePerShare()(uint256)" --rpc-url $RPC      # 1e18 = 1.0, frozen at last settle
cast call $JUNIOR "depositCap()(uint256)" --rpc-url $RPC         # 75000000000 = $75,000
cast call $JUNIOR "walletCap()(uint256)" --rpc-url $RPC          # 10000000000 in week one, 0 = off
cast call $JUNIOR "depositsPaused()(bool)" --rpc-url $RPC
cast call $JUNIOR "seeded()(bool)" --rpc-url $RPC
cast call $JUNIOR "agent()(address)" --rpc-url $RPC
cast call $JUNIOR "stakeToken()(address)" --rpc-url $RPC         # ORPH
cast call $JUNIOR "stakePerAsset()(uint256)" --rpc-url $RPC      # ORPH wei per 1 USDC
cast call $JUNIOR "pendingStakePerAsset()(uint256)" --rpc-url $RPC
cast call $JUNIOR "stakeEta()(uint256)" --rpc-url $RPC           # unix time, 0 = nothing pending
cast call $JUNIOR "lastSettle()(uint256)" --rpc-url $RPC
cast call $JUNIOR "settlesLength()(uint256)" --rpc-url $RPC
cast call $JUNIOR "pendingExitShares()(uint256)" --rpc-url $RPC
cast call $JUNIOR "pricedExitShares()(uint256)" --rpc-url $RPC
cast call $JUNIOR "reservedAssets()(uint256)" --rpc-url $RPC     # USDC owed to priced exits
cast call $JUNIOR "coverInProgress()(uint256)" --rpc-url $RPC    # USDC senior has yet to recognise
cast call $JUNIOR "seniorPriceBase()(uint256)" --rpc-url $RPC
cast call $JUNIOR "seniorSupplyBase()(uint256)" --rpc-url $RPC
cast call $JUNIOR "marketsLength()(uint256)" --rpc-url $RPC      # 4 at launch
cast call $JUNIOR "vaultsLength()(uint256)" --rpc-url $RPC       # 2 at launch: Felix and senior
cast call $USDC "balanceOf(address)(uint256)" $JUNIOR --rpc-url $RPC   # idle USDC
```

Your own position:

```
cast call $JUNIOR "balanceOf(address)(uint256)" $YOU --rpc-url $RPC
cast call $JUNIOR "stakeOf(address)(uint256)" $YOU --rpc-url $RPC
cast call $JUNIOR "stakedShares(address)(uint256)" $YOU --rpc-url $RPC
cast call $JUNIOR "exitOf(address)(uint128,uint64,uint32)" $YOU --rpc-url $RPC   # shares, readyAt, settleHint
```

Agent allowlist (example: Morpho `supply`, receiver word at offset 224):

```
cast call $JUNIOR "rules(address,bytes4)(bool,uint256)" 0x68e37dE8d93d3496ae143F2E900490f6280C57cD $(cast sig "supply((address,address,address,address,uint256),uint256,uint256,address,bytes)") --rpc-url $RPC
cast call $JUNIOR "approvals(address,address)(bool)" $USDC 0x68e37dE8d93d3496ae143F2E900490f6280C57cD --rpc-url $RPC
```

Fee router:

```
cast call $ROUTER "senior()(address)" --rpc-url $RPC
cast call $ROUTER "junior()(address)" --rpc-url $RPC
cast call $ROUTER "treasury()(address)" --rpc-url $RPC
cast call $ROUTER "seniorBps()(uint16)" --rpc-url $RPC     # 5000
cast call $ROUTER "juniorBps()(uint16)" --rpc-url $RPC     # 2500
cast call $ROUTER "maxSweepUsdc()(uint256)" --rpc-url $RPC # 25000000000
cast call $ROUTER "keeper()(address)" --rpc-url $RPC
```

ORPH and allocation:

```
cast call $ORPH "totalSupply()(uint256)" --rpc-url $RPC                     # 1000000000000000000000000000
cast call $ORPH "balanceOf(address)(uint256)" $TREASURY_TIMELOCK --rpc-url $RPC   # 150000000e18
cast call $ORPH "balanceOf(address)(uint256)" $VESTING --rpc-url $RPC             # 150000000e18
cast call $ORPH "balanceOf(address)(uint256)" $INCENTIVES_TIMELOCK --rpc-url $RPC # 100000000e18
cast call $ORPH "balanceOf(address)(uint256)" 0x12D4Fd9C5DeDd00ab8a0bCe2CF0167bbf94b6B1F --rpc-url $RPC  # about 600000000e18 in the pool
cast call $TREASURY_TIMELOCK "getMinDelay()(uint256)" --rpc-url $RPC        # 259200
cast call 0x0d7Ab5B3db668128Aff6F70C4eBC71D7d4DA9bf9 "ownerOf(uint256)(address)" $POSITION_ID --rpc-url $RPC   # the Safe
```

Events worth watching on junior: `Settled(index, nav, supply, price, cover)`, `Cover(shortfall, paid)`, `AgentCall(target, selector, value)`, `RuleSet`, `ApprovalRuleSet`, `MarketAdded`, `MarketRemoved`, `VaultAdded`, `VaultRemoved`, `StakePerAssetProposed`, `StakePerAssetSet`, `AgentSet`, `DepositsPaused`.

Source: `contracts/src/` in the Orphic repository. The senior vault source is Morpho's `vault-v2` at tag `2026-10-12`.
