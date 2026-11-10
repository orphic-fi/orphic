import type { RunFunction } from "circuit:sdk";
import { PROBE_CODE } from "./probe.ts";

/**
 * Orphic Sniper: buys new Montra launches on Elysium once they have proved out (market cap, holders, volume, and a
 * rehearsed buy-and-sell that shows the token can actually be sold), then exits each one at a take profit or a stop.
 * Five slots of 20% each; checks the launch feed every minute, nonstop.
 *
 * Launch feed: Montra's keyless API (montramarkets.xyz). Trades: Montra's LaunchRouter on Elysium, one Uniswap v4
 * pool of native HYPE per token. Every trade pays the token's own fee (1% to 5%); a buy inside the 30 minute
 * anti-snipe window after launch pays up to 99%, so a launch under 30 minutes old is never bought.
 */
const NETWORK = "ethereum:99901" as const;
const CHAIN_ID = 99901;
const RPC = "https://rpc.elysium.kinetiq.xyz";
const API = "https://api.montramarkets.xyz/api/tokens";
const NATIVE = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const LAUNCH_ROUTER = "0xc6e9a8e1a99023b67067b8a3605403b8d7b3a157";
const HOOK = "0x6b1216a40b65c83e9c9e18a562c446697b8cf8ec";
const POOL_FEE = 0x800000;
const TICK_SPACING = 200;
const PROBE_ADDR = "0x000000000000000000000000000000000000c0de";

const SLOTS = 5; // 20% of the allocation each
const MIN_HOLDERS = 50;
const MIN_VOLUME_USD = 5000; // 24h
const MIN_AGE_MS = 30 * 60_000; // anti-snipe window
const GAS_RESERVE_WEI = 20_000_000_000_000_000n; // 0.02 HYPE kept for fees
const MAX_SLIPPAGE = 0.1;
const TICK_MS = 60_000;

const SEL_SWAP = "9bfaf204"; // swapExactIn(((address,address,uint24,int24,address),bool,uint128,uint128,address,uint256))
const SEL_APPROVE = "095ea7b3";
const SEL_ALLOWANCE = "dd62ed3e";
const SEL_PROBE_V4 = "2ec89a13"; // probeV4(address,address,uint24,int24,address,uint256)

type Launch = {
  address: string;
  symbol: string;
  name: string;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  holders: number | null;
  launchedAt: number | null;
  totalFeePips: number | null;
  price: string | null; // HYPE per token
  quote: { usd: number | null } | null;
  graduation: { stage: string } | null;
};

type Position = {
  symbol: string;
  spentWei: string;
  openedAt: number;
  mcapAtEntryUsd: number;
  feePips: number;
};

type Closed = Position & { token: string; closedAt: number; gotWei: string; pnlPct: number; reason: string };

const word = (v: bigint | number | string) => BigInt(v).toString(16).padStart(64, "0");
const addrWord = (a: string) => a.toLowerCase().replace(/^0x/, "").padStart(64, "0");
const toWei = (whole: string | null): bigint => {
  if (whole === null) return 0n;
  const [i, f = ""] = whole.replace(/^-/, "").split(".");
  return BigInt(i || "0") * 10n ** 18n + BigInt((f + "0".repeat(18)).slice(0, 18));
};
const fromWei = (w: bigint, dp = 4) => (Number(w) / 1e18).toFixed(dp);

/** swapExactIn calldata: key (0, token, fee, spacing, hook), direction, amountIn, minOut, recipient, deadline. */
const swapData = (token: string, buy: boolean, amountIn: bigint, minOut: bigint, recipient: string): `0x${string}` =>
  `0x${SEL_SWAP}${addrWord("0x" + "0".repeat(40))}${addrWord(token)}${word(POOL_FEE)}${word(TICK_SPACING)}${addrWord(HOOK)}${word(buy ? 1 : 0)}${word(amountIn)}${word(minOut)}${addrWord(recipient)}${word(Math.floor(Date.now() / 1000) + 600)}`;

async function rpc(method: string, params: unknown[]): Promise<{ result?: string; error?: { message: string } }> {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  return (await r.json()) as { result?: string; error?: { message: string } };
}

/** Rehearse a buy and a sell of `spend` from a fresh wallet in one read. */
async function probe(token: string, spend: bigint): Promise<{ ok: boolean; why: string; gotTokens: bigint; roundTrip: number }> {
  const data = `0x${SEL_PROBE_V4}${addrWord(LAUNCH_ROUTER)}${addrWord(token)}${word(POOL_FEE)}${word(TICK_SPACING)}${addrWord(HOOK)}${word(spend)}`;
  const res = await rpc("eth_call", [{ from: PROBE_ADDR, to: PROBE_ADDR, data }, "latest", { [PROBE_ADDR]: { code: PROBE_CODE, balance: `0x${(spend * 2n).toString(16)}` } }]);
  if (res.error || !res.result || res.result.length < 2 + 64 * 4) return { ok: false, why: `buy reverted (${res.error?.message ?? "no result"})`, gotTokens: 0n, roundTrip: 0 };
  const w = (i: number) => BigInt(`0x${res.result!.slice(2 + i * 64, 2 + (i + 1) * 64)}`);
  const got = w(0);
  const sold = w(2);
  const back = w(3);
  if (got === 0n) return { ok: false, why: "buy delivered no tokens", gotTokens: 0n, roundTrip: 0 };
  if (sold === 0n) return { ok: false, why: "honeypot: a fresh wallet cannot sell", gotTokens: got, roundTrip: 0 };
  if (sold < got) return { ok: false, why: `honeypot: sells capped at ${Math.round((Number(sold) / Number(got)) * 100)}% of a position`, gotTokens: got, roundTrip: 0 };
  const roundTrip = Number(back) / Number(spend);
  return { ok: true, why: `round trip keeps ${Math.round(roundTrip * 100)}%`, gotTokens: got, roundTrip };
}

/** What selling `qty` of `token` from `wallet` returns right now, in wei of HYPE; null when the router refuses (no approval yet). */
async function sellQuote(wallet: string, token: string, qty: bigint): Promise<bigint | null> {
  const res = await rpc("eth_call", [{ from: wallet, to: LAUNCH_ROUTER, data: swapData(token, false, qty, 0n, wallet) }, "latest"]);
  if (res.error || !res.result || res.result.length < 66) return null;
  return BigInt(res.result.slice(0, 66));
}

async function allowance(wallet: string, token: string): Promise<bigint> {
  const res = await rpc("eth_call", [{ to: token, data: `0x${SEL_ALLOWANCE}${addrWord(wallet)}${addrWord(LAUNCH_ROUTER)}` }, "latest"]);
  return res.result && res.result.length >= 66 ? BigInt(res.result.slice(0, 66)) : 0n;
}

async function launches(stage: "new" | "graduating"): Promise<Launch[]> {
  const r = await fetch(`${API}?stage=${stage}`, { signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`Montra feed ${r.status}`);
  return ((await r.json()) as { tokens: Launch[] }).tokens;
}

export const run: RunFunction = async (agent) => {
  for (;;) {
    await tick(agent);
    await agent.next({ until: Date.now() + TICK_MS });
  }
};

export async function tick(agent: Parameters<RunFunction>[0]) {
  const wallet = agent.walletAddress;
  const minMcap = agent.settings.minMcapUsd;
  const minHolders = MIN_HOLDERS;
  const tp = agent.settings.takeProfitPct / 100;
  const sl = agent.settings.stopLossPct / 100;

  const holdings = agent.allocation.holdings.filter((h) => h.kind === "token" && h.network === NETWORK);
  const hype = holdings.find((h) => h.asset.toLowerCase() === NATIVE);
  const hypeWei = hype ? toWei(hype.quantity) : 0n;
  const qtyOf = (token: string) => {
    const h = holdings.find((x) => x.asset.toLowerCase() === token.toLowerCase());
    return h ? toWei(h.quantity) : 0n;
  };

  // Slot size is fixed at the first run: a fifth of what the user allocated, so five snipes fit before the book is out.
  const slotMem = await agent.memory.get({ key: "slotWei" });
  let slotWei: bigint;
  if (slotMem) slotWei = BigInt(slotMem.value);
  else {
    slotWei = (hypeWei - GAS_RESERVE_WEI) / BigInt(SLOTS);
    await agent.memory.set({ key: "slotWei", value: slotWei.toString() });
    await agent.log(`Sniper live on Elysium with ${fromWei(hypeWei)} HYPE: ${SLOTS} slots of ${fromWei(slotWei)} HYPE. Buys launches at $${minMcap.toLocaleString()}+ market cap, ${minHolders}+ holders, $${MIN_VOLUME_USD.toLocaleString()}+ volume that pass the sell rehearsal; take profit +${agent.settings.takeProfitPct}%, stop -${agent.settings.stopLossPct}%.`);
  }

  // 1. Open positions: mark each one by what a sell returns now; exit at the take profit or the stop.
  const open = (await agent.memory.list({ prefix: "pos/" })).map((m) => m.key.slice(4));
  for (const token of open) {
    const raw = await agent.memory.get({ key: `pos/${token}` });
    if (!raw) continue;
    const pos = JSON.parse(raw.value) as Position;
    const qty = qtyOf(token);
    if (qty === 0n) {
      // Sold outside the session, or the buy never landed: nothing to manage.
      await agent.memory.delete({ key: `pos/${token}` });
      await agent.log(`${pos.symbol}: no balance in the wallet any more; closing the record.`);
      continue;
    }
    const quote = await sellQuote(wallet, token, qty);
    if (quote === null) {
      await agent.log(`${pos.symbol}: sell quote unavailable this minute (approval still landing); holding.`);
      continue;
    }
    const spent = BigInt(pos.spentWei);
    const pnl = Number(quote - spent) / Number(spent);
    const reason = pnl >= tp ? `take profit at +${(pnl * 100).toFixed(1)}%` : pnl <= -sl ? `stop at ${(pnl * 100).toFixed(1)}%` : null;
    if (!reason) {
      await agent.log(`${pos.symbol}: ${(pnl * 100).toFixed(1)}% (${fromWei(quote)} HYPE if sold now vs ${fromWei(spent)} in). Holding.`);
      continue;
    }
    const minOut = (quote * BigInt(Math.round((1 - MAX_SLIPPAGE) * 1000))) / 1000n;
    if ((await allowance(wallet, token)) < qty) {
      await agent.wallet.transactions.create(
        { network: NETWORK, request: { toAddress: token, valueWei: "0", data: `0x${SEL_APPROVE}${addrWord(LAUNCH_ROUTER)}${word(2n ** 256n - 1n)}` } },
        { once: `approve/${token}` },
      );
    }
    const op = await agent.wallet.transactions.create(
      { network: NETWORK, request: { toAddress: LAUNCH_ROUTER, valueWei: "0", data: swapData(token, false, qty, minOut, wallet) } },
      { once: `sell/${token}/${pos.openedAt}` },
    );
    const closed: Closed = { ...pos, token, closedAt: Date.now(), gotWei: quote.toString(), pnlPct: Math.round(pnl * 1000) / 10, reason };
    await agent.memory.set({ key: `done/${token}`, value: JSON.stringify(closed) });
    await agent.memory.delete({ key: `pos/${token}` });
    await agent.log(`Sold ${pos.symbol}: ${reason}. ${fromWei(spent)} HYPE in, about ${fromWei(quote)} HYPE out (op ${op.operationId}).`);
  }

  // 2. A free slot and the HYPE to fill it: find the next launch that passes every gate.
  const openNow = (await agent.memory.list({ prefix: "pos/" })).length;
  const spendable = hypeWei - GAS_RESERVE_WEI;
  if (openNow >= SLOTS) return agent.log(`All ${SLOTS} slots are in use; watching exits.`);
  if (spendable < slotWei) return agent.log(`Waiting for funds: ${fromWei(spendable)} HYPE spendable, a slot needs ${fromWei(slotWei)}.`);

  const feed = [...(await launches("new")), ...(await launches("graduating"))];
  const now = Date.now();
  const candidates = feed
    .filter((t) => (t.marketCapUsd ?? 0) >= minMcap && (t.holders ?? 0) >= minHolders && (t.volume24hUsd ?? 0) >= MIN_VOLUME_USD)
    .filter((t) => t.launchedAt !== null && now - t.launchedAt >= MIN_AGE_MS)
    .sort((a, b) => (a.marketCapUsd ?? 0) - (b.marketCapUsd ?? 0));
  if (candidates.length === 0) {
    const closest = feed.filter((t) => t.launchedAt !== null && now - t.launchedAt >= MIN_AGE_MS).sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0))[0];
    return agent.log(`No launch passes yet (${feed.length} in the feed).${closest ? ` Closest: ${closest.symbol} at $${Math.round(closest.marketCapUsd ?? 0).toLocaleString()} cap, ${closest.holders ?? 0} holders, $${Math.round(closest.volume24hUsd ?? 0).toLocaleString()} volume.` : ""}`);
  }

  for (const t of candidates) {
    const token = t.address.toLowerCase();
    if ((await agent.memory.get({ key: `pos/${token}` })) || (await agent.memory.get({ key: `done/${token}` }))) continue; // one snipe per token
    const feePips = t.totalFeePips ?? 0;
    const p = await probe(token, slotWei);
    // The rehearsal must sell everything, and a round trip may lose only the token's own fee twice plus slippage.
    const floor = 1 - (2 * feePips) / 1_000_000 - 0.05;
    if (!p.ok || p.roundTrip < floor) {
      await agent.log(`Skip ${t.symbol} ($${Math.round(t.marketCapUsd ?? 0).toLocaleString()} cap, ${t.holders} holders): ${p.ok ? `round trip keeps only ${Math.round(p.roundTrip * 100)}%` : p.why}.`);
      continue;
    }
    const minOut = (p.gotTokens * BigInt(Math.round((1 - MAX_SLIPPAGE) * 1000))) / 1000n;
    const op = await agent.wallet.transactions.create(
      { network: NETWORK, request: { toAddress: LAUNCH_ROUTER, valueWei: slotWei.toString(), data: swapData(token, true, slotWei, minOut, wallet) } },
      { once: `buy/${token}` },
    );
    const pos: Position = { symbol: t.symbol, spentWei: slotWei.toString(), openedAt: Date.now(), mcapAtEntryUsd: Math.round(t.marketCapUsd ?? 0), feePips };
    await agent.memory.set({ key: `pos/${token}`, value: JSON.stringify(pos) });
    await agent.log(`Bought ${t.symbol} with ${fromWei(slotWei)} HYPE at $${pos.mcapAtEntryUsd.toLocaleString()} cap, ${t.holders} holders, $${Math.round(t.volume24hUsd ?? 0).toLocaleString()} volume; rehearsal ${p.why}. Target +${agent.settings.takeProfitPct}%, stop -${agent.settings.stopLossPct}% (op ${op.operationId}).`);
    // The router needs an approval before any sell; send it now so the exit is one transaction.
    await agent.wallet.transactions.create(
      { network: NETWORK, request: { toAddress: token, valueWei: "0", data: `0x${SEL_APPROVE}${addrWord(LAUNCH_ROUTER)}${word(2n ** 256n - 1n)}` } },
      { once: `approve/${token}` },
    );
    return; // one buy per minute keeps the loop short; the next minute fills the next slot
  }
  await agent.log(`${candidates.length} launch${candidates.length === 1 ? "" : "es"} pass the numbers but none passed the sell rehearsal or all are already held.`);
}
