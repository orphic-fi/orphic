# Orphic web

Front end for Orphic (orphic.fi): an agentic USDC vault with a senior and junior split. Funds live on HyperEVM (chain 999); Elysium (Kinetiq's Hyperliquid L2) is a deposit entry point that bridges to HyperEVM.

Stack: Vite, React 18, TypeScript, wagmi v2, viem, TanStack Query, CSS modules. No UI library, no icon pack, no Tailwind. Fonts are self-hosted under `public/fonts` (Commit Mono for readouts and the wordmark, Inter for body text, both latin subsets with licences beside them); nothing is fetched from a font CDN.

The vaults page carries one instrument: a ring behind the two panels whose two arcs are senior and junior cap utilisation (mint over the top and left, amber down the right), with the live figures under its bottom point. Live numbers animate from the previous to the new value over 240 ms on each read, never on first paint, and everything stops under `prefers-reduced-motion`.

## Run

```
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check then build to dist/
npm run lint
npm run preview    # serve dist/
npm run screenshots  # Playwright shots of every reviewed state into screenshots/ (build first)
```

## Demo mode

`VITE_DEMO=1 npm run dev` renders fixture values (connected demo address, balances, an open junior exit, stake rate, wallet cap) so flows can be reviewed without a wallet or contracts. `?scenario=cover` adds a senior cover-in-progress fixture. Fixtures live in `src/config/demo.ts`. `main.tsx` throws at startup if `VITE_DEMO` is set in a production build, so demo mode cannot ship; the screenshot script starts a dev server for the demo states and `vite preview` for the rest.

Environment: copy `.env.example` to `.env` and set `VITE_ELYSIUM_RPC` to an Alchemy or Conduit Elysium mainnet URL. Without it the Elysium chain has no RPC and reads on that chain fail; HyperEVM reads are unaffected.

## Pages

- `/` Vaults. Senior and junior areas with APY, TVL, cap, balance, deposit input and write actions.
- `/how-it-works` Four lines on where money sits and what agents can do, then `public/flow/how-it-works.html` in an iframe sized to its content. The file lives under `flow/` because a static host that resolves extensionless URLs would otherwise serve it for the `/how-it-works` route instead of the app.
- `/agents` Table built from `public/agents.json`. The keeper overwrites that file after each settle.
- `/ops` Not in the nav, linked from the footer as "status". Addresses, pause state, last settle, chain config.

## What is placeholder

`src/config/addresses.ts` is the single switch.

- `DEPLOYED = false`. While false, every write button is disabled and reads "Opens Monday 9 Nov", the amount inputs are disabled, and no contract reads run.
- Senior, junior, ORPH, Elysium USDC and Elysium bridge entry addresses are `0x000...000`.
- Senior APY and TVL come from the Morpho GraphQL API for the reference vault Felix USDC V2 (`0x51254785367d73A10a2Ea7d44B8e97b749BfbE8b`, chain 999), captioned "reference: Felix USDC V2". Once `DEPLOYED` is true and `addresses.hyperEvm.senior` is set, the same query runs against our vault and the caption goes away. `netApy` is shown, falling back to `apy`.
- Caps come from `ops.caps` in config (senior $250,000, junior $50,000). After deployment the junior cap is read from `depositCap()`; the senior cap stays in config because Vault V2 has per-market caps rather than one deposit cap.
- `ops.lastSettle` and `ops.paused` are config values. Junior `paused()` is read on-chain once deployed.
- The junior stake line reads `stakePerAsset()` from the junior contract (ORPH wei per 1e6 USDC). Before deployment it shows "Required ORPH: n/a until Monday". `stakeEta()` and `walletCap()` drive the pending-rate and week-one-limit lines; both are hidden when zero.
- Elysium mainnet chain id 99901 is unverified; see the comment in `src/chains.ts`. Testnet 99801 is included for local testing.
- The Elysium deposit path assumes a bridge entry contract exposing `deposit(uint256 assets, address receiver)`, the same signature as the vaults. Adjust `src/abi/` and `useVault.ts` if the real contract differs.
- Senior withdraws and junior exit requests always target HyperEVM; the UI prompts a chain switch if the wallet is elsewhere.
- `exitOf(address)` is assumed to return `(uint256 shares, uint256 readyAt)`. The claim button is enabled when `lastSettle() >= readyAt`.
- Senior shares (`osUSDC`) are assumed to have 18 decimals (Vault V2 uses max(18, asset decimals)); the deposit preview reads `convertToShares(1e6)`.
- `public/agents.json` is hand-written. `weeklyReturn: null` renders as "n/a until first settle"; `updatedAt` is a unix timestamp or null.

## Write flow

Deposit checks the USDC allowance for the target contract first. If short, the primary button reads "Approve USDC" and sends `approve(target, amount)`; after confirmation it becomes "Deposit". Transaction state appears in one line under the buttons.

## Copy rules

No em dashes anywhere. "n/a" for missing values. Every APY carries "est.". Sentence case, no exclamation marks.
