/**
 * Position indexer. Public HyperEVM RPCs cap eth_getLogs at 1000 blocks, so the site cannot rebuild a
 * depositor's history on the fly. This walks new blocks since the last run, folds Deposit / Withdraw /
 * ExitClaimed events into per-address totals, and writes web/public/data/positions.json for the Portfolio tab.
 *
 * State lives in keeper/ops/positions-state.json (committed), so each hourly run only scans the new blocks.
 * Usage: npx tsx src/indexer.ts   (env RPC_URL optional)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, http, parseAbiItem, type Address } from "viem";

const RPC = process.env.RPC_URL || "https://rpc.hyperliquid.xyz/evm";
const SENIOR = "0x3F7382bd8BFC6C548CAa2D7B4dfCe628B12A9759" as Address;
const JUNIOR = "0x20D5F4f78858D257eA047EB5F47773E361697F2E" as Address;
const DEPLOY_BLOCK = 50747831n;
const CHUNK = BigInt(process.env.LOG_RANGE || "1000"); // public RPC caps at 1000, drpc free at 10000
const PAUSE_MS = Number(process.env.LOG_PAUSE_MS || "1200");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const STATE_PATH = process.env.POSITIONS_STATE || "ops/positions-state.json";
const OUT_PATH = process.env.POSITIONS_OUT || "../web/public/data/positions.json";

interface Totals {
  seniorDeposited: string; // USDC, 6 decimals, as decimal string
  seniorWithdrawn: string;
  juniorDeposited: string;
  juniorExited: string;
  juniorStaked: string; // ORPH wei
  firstDeposit: number | null; // unix seconds
  lastActivity: number | null;
}
interface State {
  lastBlock: string;
  accounts: Record<string, Totals>;
  events: number;
}

const seniorDeposit = parseAbiItem("event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)");
const seniorWithdraw = parseAbiItem("event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)");
const juniorDeposit = parseAbiItem("event Deposit(address indexed caller, address indexed receiver, uint256 assets, uint256 shares, uint256 stake)");
const juniorExit = parseAbiItem("event ExitClaimed(address indexed owner, uint256 shares, uint256 assets, uint256 price)");

function empty(): Totals {
  return { seniorDeposited: "0", seniorWithdrawn: "0", juniorDeposited: "0", juniorExited: "0", juniorStaked: "0", firstDeposit: null, lastActivity: null };
}
function add(a: string, b: bigint) {
  return (BigInt(a) + b).toString();
}

async function main() {
  const client = createPublicClient({ transport: http(RPC, { retryCount: 6, retryDelay: 1500 }) });
  let state: State;
  try {
    state = JSON.parse(readFileSync(STATE_PATH, "utf8"));
  } catch {
    state = { lastBlock: (DEPLOY_BLOCK - 1n).toString(), accounts: {}, events: 0 };
  }
  const head = await client.getBlockNumber();
  const safeHead = head - 2n; // avoid the tip
  let from = BigInt(state.lastBlock) + 1n;
  if (from > safeHead) {
    console.log(`up to date at ${state.lastBlock}`);
    writeOut(state, head);
    return;
  }
  const blockTimes = new Map<bigint, number>();
  async function timeOf(b: bigint) {
    let t = blockTimes.get(b);
    if (t === undefined) {
      t = Number((await client.getBlock({ blockNumber: b })).timestamp);
      blockTimes.set(b, t);
    }
    return t;
  }
  const touch = (addr: string) => (state.accounts[addr.toLowerCase()] ??= empty());

  let scanned = 0;
  while (from <= safeHead) {
    const to = from + CHUNK - 1n > safeHead ? safeHead : from + CHUNK - 1n;
    // One query per contract, decoded by event; the public RPC rate-limits log queries hard.
    const seniorLogs = await client.getLogs({ address: SENIOR, events: [seniorDeposit, seniorWithdraw], fromBlock: from, toBlock: to });
    await sleep(PAUSE_MS);
    const juniorLogs = await client.getLogs({ address: JUNIOR, events: [juniorDeposit, juniorExit], fromBlock: from, toBlock: to });
    await sleep(PAUSE_MS);
    const sd = seniorLogs.filter((l) => l.eventName === "Deposit") as unknown as { args: { owner: string; assets: bigint }; blockNumber: bigint }[];
    const sw = seniorLogs.filter((l) => l.eventName === "Withdraw") as unknown as { args: { owner: string; assets: bigint }; blockNumber: bigint }[];
    const jd = juniorLogs.filter((l) => l.eventName === "Deposit") as unknown as { args: { receiver: string; assets: bigint; stake: bigint }; blockNumber: bigint }[];
    const je = juniorLogs.filter((l) => l.eventName === "ExitClaimed") as unknown as { args: { owner: string; assets: bigint }; blockNumber: bigint }[];
    const stamp = async (l: { blockNumber: bigint }, t: Totals, deposit: boolean) => {
      const ts = await timeOf(l.blockNumber);
      if (deposit && (t.firstDeposit === null || ts < t.firstDeposit)) t.firstDeposit = ts;
      if (t.lastActivity === null || ts > t.lastActivity) t.lastActivity = ts;
    };
    for (const l of sd) {
      const t = touch(l.args.owner);
      t.seniorDeposited = add(t.seniorDeposited, l.args.assets);
      await stamp(l, t, true);
    }
    for (const l of sw) {
      const t = touch(l.args.owner);
      t.seniorWithdrawn = add(t.seniorWithdrawn, l.args.assets);
      await stamp(l, t, false);
    }
    for (const l of jd) {
      const t = touch(l.args.receiver);
      t.juniorDeposited = add(t.juniorDeposited, l.args.assets);
      t.juniorStaked = add(t.juniorStaked, l.args.stake);
      await stamp(l, t, true);
    }
    for (const l of je) {
      const t = touch(l.args.owner);
      t.juniorExited = add(t.juniorExited, l.args.assets);
      await stamp(l, t, false);
    }
    state.events += sd.length + sw.length + jd.length + je.length;
    state.lastBlock = to.toString();
    scanned += Number(to - from + 1n);
    from = to + 1n;
  }
  mkdirSync(STATE_PATH.split("/").slice(0, -1).join("/") || ".", { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  writeOut(state, head);
  console.log(`scanned ${scanned} blocks to ${state.lastBlock}, ${Object.keys(state.accounts).length} accounts, ${state.events} events`);
}

function writeOut(state: State, head: bigint) {
  const out = {
    updatedAt: Math.floor(Date.now() / 1000),
    throughBlock: state.lastBlock,
    headBlock: head.toString(),
    senior: SENIOR,
    junior: JUNIOR,
    accounts: state.accounts,
  };
  mkdirSync(OUT_PATH.split("/").slice(0, -1).join("/") || ".", { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(out));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
