/**
 * What an agent wallet actually did on Elysium, read from the chain itself: every launch token it bought or sold
 * through Montra, what each trade cost or returned in HYPE, and what an open position would fetch if sold right
 * now (a real sell simulated from that wallet, so fees and caps are in the number). No Circuit API, no estimates.
 */
import { useQuery } from "@tanstack/react-query";
import {
  createPublicClient,
  encodeFunctionData,
  http,
  parseAbiItem,
  type Address,
  type Hex,
} from "viem";

export const ELYSIUM_RPC = "https://rpc.elysium.kinetiq.xyz";
export const ELYSIUM_EXPLORER = "https://elysium.kinetiq.xyz";
const MONTRA_API = "https://api.montramarkets.xyz/api/tokens";
const LAUNCH_ROUTER = "0xc6e9a8e1a99023b67067b8a3605403b8d7b3a157" as Address;
const HOOK = "0x6b1216a40b65c83e9c9e18a562c446697b8cf8ec" as Address;
const POOL_FEE = 0x800000;
const TICK_SPACING = 200;

const client = createPublicClient({ transport: http(ELYSIUM_RPC) });
const TRANSFER = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);
const ROUTER_ABI = [
  {
    name: "swapExactIn",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        type: "tuple",
        name: "p",
        components: [
          {
            type: "tuple",
            name: "key",
            components: [
              { type: "address", name: "currency0" },
              { type: "address", name: "currency1" },
              { type: "uint24", name: "fee" },
              { type: "int24", name: "tickSpacing" },
              { type: "address", name: "hooks" },
            ],
          },
          { type: "bool", name: "zeroForOne" },
          { type: "uint128", name: "amountIn" },
          { type: "uint128", name: "minAmountOut" },
          { type: "address", name: "recipient" },
          { type: "uint256", name: "deadline" },
        ],
      },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

export type Trade = {
  hash: Hex;
  block: bigint;
  time: number; // ms
  token: Address;
  side: "buy" | "sell";
  tokens: bigint; // token units moved
  hype: bigint; // wei spent (buy) or received after gas (sell)
};

export type Launch = {
  address: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  marketCapUsd: number | null;
  priceUsd: number | null;
  holders: number | null;
  volume24hUsd: number | null;
  launchedAt: number | null;
  totalFeePips: number | null;
  quote: { usd: number | null } | null;
  graduation: { stage: string; progressBps: number | null } | null;
};

export type Position = {
  token: Address;
  meta: Launch | null;
  trades: Trade[];
  spent: bigint; // wei, all buys
  received: bigint; // wei, all sells after gas
  held: bigint; // token units still in the wallet
  markWei: bigint | null; // what selling `held` returns now; null when nothing is held or the router refuses
  openedAt: number;
  closedAt: number | null;
  pnlWei: bigint | null; // realised for closed, realised plus mark for open
};

export type Ledger = {
  wallet: Address;
  hypeUsd: number | null;
  positions: Position[];
  totalSpent: bigint;
  totalPnl: bigint;
  wins: number;
  losses: number;
};

async function fetchLaunch(address: string): Promise<Launch | null> {
  const r = await fetch(`${MONTRA_API}/${address}`);
  if (!r.ok) return null;
  return (await r.json()) as Launch;
}

/** What selling `qty` of `token` from `wallet` would return right now, in wei; null when the router refuses. */
export async function sellQuote(
  wallet: Address,
  token: Address,
  qty: bigint,
): Promise<bigint | null> {
  try {
    const data = encodeFunctionData({
      abi: ROUTER_ABI,
      functionName: "swapExactIn",
      args: [
        {
          key: {
            currency0: "0x0000000000000000000000000000000000000000",
            currency1: token,
            fee: POOL_FEE,
            tickSpacing: TICK_SPACING,
            hooks: HOOK,
          },
          zeroForOne: false,
          amountIn: qty,
          minAmountOut: 0n,
          recipient: wallet,
          deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
        },
      ],
    });
    const res = await client.call({ account: wallet, to: LAUNCH_ROUTER, data });
    return res.data ? BigInt(res.data.slice(0, 66)) : null;
  } catch {
    return null;
  }
}

export async function fetchLedger(wallet: Address): Promise<Ledger> {
  const w = wallet.toLowerCase() as Address;
  const [ins, outs] = await Promise.all([
    client.getLogs({
      event: TRANSFER,
      args: { to: w },
      fromBlock: 0n,
      toBlock: "latest",
    }),
    client.getLogs({
      event: TRANSFER,
      args: { from: w },
      fromBlock: 0n,
      toBlock: "latest",
    }),
  ]);
  // One transaction is one trade. Group the token legs by hash, then price each one by the wallet's HYPE balance
  // change around that block: a buy costs its value, a sell returns what landed after gas.
  const byHash = new Map<
    Hex,
    { token: Address; inTok: bigint; outTok: bigint; block: bigint }
  >();
  for (const l of ins) {
    const e = byHash.get(l.transactionHash) ?? {
      token: l.address.toLowerCase() as Address,
      inTok: 0n,
      outTok: 0n,
      block: l.blockNumber,
    };
    e.inTok += l.args.value ?? 0n;
    byHash.set(l.transactionHash, e);
  }
  for (const l of outs) {
    const e = byHash.get(l.transactionHash) ?? {
      token: l.address.toLowerCase() as Address,
      inTok: 0n,
      outTok: 0n,
      block: l.blockNumber,
    };
    e.outTok += l.args.value ?? 0n;
    byHash.set(l.transactionHash, e);
  }
  const trades: Trade[] = [];
  const blocks = new Map<bigint, number>();
  // Newest 300 transactions, eight at a time: an agent wallet makes a few trades a day, and the RPC stays polite.
  const entries = [...byHash.entries()]
    .sort((a, b) => Number(b[1].block - a[1].block))
    .slice(0, 300);
  for (let i = 0; i < entries.length; i += 8) {
    await Promise.all(
      entries.slice(i, i + 8).map(async ([hash, e]) => {
        const [tx, rc] = await Promise.all([
          client.getTransaction({ hash }),
          client.getTransactionReceipt({ hash }),
        ]);
        if (rc.status !== "success") return;
        // Only trades the wallet made itself count; a token someone airdropped in is not a buy.
        if (tx.from.toLowerCase() !== w) return;
        if (!blocks.has(rc.blockNumber))
          blocks.set(
            rc.blockNumber,
            Number(
              (await client.getBlock({ blockNumber: rc.blockNumber }))
                .timestamp,
            ) * 1000,
          );
        const time = blocks.get(rc.blockNumber)!;
        if (e.inTok > e.outTok) {
          trades.push({
            hash,
            block: rc.blockNumber,
            time,
            token: e.token,
            side: "buy",
            tokens: e.inTok - e.outTok,
            hype: tx.value,
          });
        } else if (e.outTok > 0n) {
          const [before, after] = await Promise.all([
            client.getBalance({ address: w, blockNumber: rc.blockNumber - 1n }),
            client.getBalance({ address: w, blockNumber: rc.blockNumber }),
          ]);
          const gas = rc.gasUsed * rc.effectiveGasPrice;
          trades.push({
            hash,
            block: rc.blockNumber,
            time,
            token: e.token,
            side: "sell",
            tokens: e.outTok - e.inTok,
            hype: after - before + gas,
          });
        }
      }),
    );
  }
  trades.sort((a, b) => Number(a.block - b.block));

  const tokens = [...new Set(trades.map((t) => t.token))];
  const metas = await Promise.all(tokens.map(fetchLaunch));
  const hypeUsd = metas.find((m) => m?.quote?.usd)?.quote?.usd ?? null;
  const positions: Position[] = await Promise.all(
    tokens.map(async (token, i) => {
      const ts = trades.filter((t) => t.token === token);
      const spent = ts
        .filter((t) => t.side === "buy")
        .reduce((n, t) => n + t.hype, 0n);
      const received = ts
        .filter((t) => t.side === "sell")
        .reduce((n, t) => n + t.hype, 0n);
      const held = ts.reduce(
        (n, t) => n + (t.side === "buy" ? t.tokens : -t.tokens),
        0n,
      );
      const markWei = held > 0n ? await sellQuote(w, token, held) : null;
      const lastSell = ts.filter((t) => t.side === "sell").at(-1);
      const closed = held <= 0n && !!lastSell;
      const pnlWei = closed
        ? received - spent
        : markWei !== null
          ? received + markWei - spent
          : null;
      return {
        token,
        meta: metas[i],
        trades: ts,
        spent,
        received,
        held: held > 0n ? held : 0n,
        markWei,
        openedAt: ts[0].time,
        closedAt: closed ? lastSell.time : null,
        pnlWei,
      };
    }),
  );
  positions.sort((a, b) => b.openedAt - a.openedAt);
  const totalSpent = positions.reduce((n, p) => n + p.spent, 0n);
  const totalPnl = positions.reduce((n, p) => n + (p.pnlWei ?? 0n), 0n);
  return {
    wallet: w,
    hypeUsd,
    positions,
    totalSpent,
    totalPnl,
    wins: positions.filter((p) => p.closedAt && (p.pnlWei ?? 0n) > 0n).length,
    losses: positions.filter((p) => p.closedAt && (p.pnlWei ?? 0n) <= 0n)
      .length,
  };
}

export function useLedger(wallet: Address | undefined) {
  return useQuery({
    queryKey: ["elysium-ledger", wallet],
    queryFn: () => fetchLedger(wallet!),
    enabled: !!wallet,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/** Montra's launch feed, the same read the sniper makes. */
export async function fetchLaunches(
  stage: "new" | "graduating" | "graduated",
): Promise<Launch[]> {
  const r = await fetch(`${MONTRA_API}?stage=${stage}`);
  if (!r.ok) throw new Error(`Montra ${r.status}`);
  return ((await r.json()) as { tokens: Launch[] }).tokens;
}
export function useLaunches() {
  return useQuery({
    queryKey: ["montra-launches"],
    queryFn: async () => [
      ...(await fetchLaunches("new")),
      ...(await fetchLaunches("graduating")),
    ],
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export const hypeFmt = (wei: bigint, dp = 3) =>
  (Number(wei) / 1e18).toFixed(dp);
