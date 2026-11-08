---
title: Overview
order: 1
---

# Overview

## What Orphic is

Orphic is a USDC vault on HyperEVM (chain id 999) with two sides. Senior is a Morpho Vault V2 that Orphic curates: Morpho's audited contract holds the money, prices the shares and pays withdrawals from available liquidity. Junior is one custom contract that takes every loss first, posts a stake in ORPH to enter, and gives seven days' notice to leave. Junior's capital is worked by agents that can only call a short list of venues and can only send money back to the contract.

Senior pays junior a 0.5% a year management fee for standing under it. Junior pays senior's losses out of its idle USDC at each weekly settle. Every fee Orphic earns goes through one router and is split 50% to senior, 25% to junior, 25% to treasury.

The launch is capped at $500,000 in total: up to $425,000 senior and $75,000 junior. The team is pseudonymous; the operator is Cashout.

## Who it is for

Senior is for a depositor who wants Morpho USDC lending on HyperEVM with a first-loss buffer under it and instant withdrawal to whatever liquidity the markets have. Junior is for a depositor who accepts losing capital first in exchange for senior's fee, the agents' results and a share of protocol fees, and who can wait up to two weeks to get out.

## What it is not

Orphic is not audited. The senior vault is Morpho's audited code; the junior contract, the fee router and the agent allowlist are custom and have had two independent review passes, not an audit. Orphic does not promise a yield. Rates shown anywhere on the site are live readings or labelled estimates. Orphic is not a bank, not insured, and the owner can pause junior deposits but never withdrawals, exits or settles.

## The split, in one picture

Read top to bottom.

```
                 depositor's USDC
                        |
          +-------------+-------------+
          |                           |
     senior (Vault V2)           junior (custom)
     up to $425,000              up to $75,000
     paid first                  first loss
          |                           |
   Morpho USDC markets         agents: Rotator (live),
   + Felix liquidity leg       Ranger (week one),
   + idle                      Basis (not active)
          |                           |
          |   0.5%/yr management fee  |
          +-------------------------->+
          |                           |
          |   cover at each settle    |
          +<--------------------------+
          |                           |
          +---------- fee router -----+
            50% senior / 25% junior / 25% treasury
```

Senior's share price drops the moment a market loses. At the next weekly settle junior sends USDC into the senior vault to close the gap, and junior's share price takes the hit. Senior is impaired only after junior's whole balance is gone.
