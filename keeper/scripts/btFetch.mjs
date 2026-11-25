// Backtest data: Swap events for the HYPE/USDC pools over a long window, plus block timestamps every 50k blocks,
// written to /home/claude/bt as CSV (resumable). Read-only; nothing is sent.
import { createPublicClient, http, keccak256, encodeAbiParameters, parseAbiItem } from "viem";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
const DIR = "/home/claude/bt", DAYS = Number(process.env.DAYS || 180), Q96 = 2 ** 96;
const ely = createPublicClient({ transport: http("https://rpc.elysium.kinetiq.xyz", { retryCount: 6 }) });
const hev = createPublicClient({ transport: http("https://hyperliquid.drpc.org", { retryCount: 6 }) });
const hevLogs = createPublicClient({ transport: http("https://rpc.purroofgroup.com", { retryCount: 4 }) });
const hevLogs2 = createPublicClient({ transport: http("https://hyperliquid-json-rpc.stakely.io", { retryCount: 4 }) });
const V4_PM = "0xe2e105d3f7209a9da11f83ccf3e7398a753823f1";
const NEST_KEY = { currency0: "0x0000000000000000000000000000000000000000", currency1: "0xb47c4c8f73f009cc0c0d3f92b388d13e293f0b65", fee: 8388608, tickSpacing: 10, hooks: "0x0559ef6bc07974bfab2149d7fbc0e898914115cf" };
const NEST_ID = keccak256(encodeAbiParameters([{ type: "tuple", components: [{ name: "currency0", type: "address" }, { name: "currency1", type: "address" }, { name: "fee", type: "uint24" }, { name: "tickSpacing", type: "int24" }, { name: "hooks", type: "address" }] }], [NEST_KEY]));
const v4Swap = parseAbiItem("event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)");
const v3Swap = parseAbiItem("event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)");
const POOLS = {
  px05: { ch: "hev", kind: "v3", address: "0x6c9a33e3b592c0d65b3ba59355d5be0d38259285", fee: 500 },
  px30: { ch: "hev", kind: "v3", address: "0x422e586c906eb241f784b4f5a633c2c7e59a2f54", fee: 3000 },
  nest: { ch: "ely", kind: "v4" },
};
const cl = (ch) => (ch === "ely" ? ely : hev);
async function times(ch, from, to) {
  const f = `${DIR}/${ch}-times.csv`, have = new Set(existsSync(f) ? readFileSync(f, "utf8").trim().split("\n").filter(Boolean).map((l) => Number(l.split(",")[0])) : []);
  for (let b = from - (from % 50000); b <= to + 50000; b += 50000) {
    const n = Math.min(b, to); if (have.has(n)) continue;
    const x = await cl(ch).getBlock({ blockNumber: BigInt(Math.max(1, n)) }); appendFileSync(f, `${n},${x.timestamp}\n`); have.add(n);
  }
}
async function pool(name) {
  const p = POOLS[name], c = cl(p.ch), head = Number(await c.getBlockNumber());
  const hb = await c.getBlock({ blockNumber: BigInt(head) });
  const dt = p.ch === "ely" ? 0.25 : 1.0, start = Math.max(1, head - Math.floor((DAYS * 86400) / dt));
  await times(p.ch, start, head);
  const K = Number(process.env.SEGS || 8), seg = Math.ceil((head - start + 1) / K);
  await Promise.all([...Array(K).keys()].map(async (k) => {
    const s0 = start + k * seg, s1 = Math.min(head, s0 + seg - 1);
    const f = `${DIR}/${name}.${k}.csv`, prog = `${DIR}/${name}.${k}.done`;
    let a = existsSync(prog) ? Number(readFileSync(prog, "utf8")) + 1 : s0;
    const step = p.kind === "v4" ? 100000 : 10000;
    while (a <= s1) {
      const b = Math.min(s1, a + step - 1); let logs;
      if (p.kind === "v4") logs = await ely.getLogs({ address: V4_PM, event: v4Swap, args: { id: NEST_ID }, fromBlock: BigInt(a), toBlock: BigInt(b) });
      else {
        try { logs = await hevLogs.getLogs({ address: p.address, event: v3Swap, fromBlock: BigInt(a), toBlock: BigInt(b) }); }
        catch { logs = []; for (let x = a; x <= b; x += 1000) logs.push(...(await hevLogs2.getLogs({ address: p.address, event: v3Swap, fromBlock: BigInt(x), toBlock: BigInt(Math.min(b, x + 999)) }))); }
      }
      let out = "";
      for (const l of logs) {
        const a0 = Number(l.args.amount0), a1 = Number(l.args.amount1);
        const in0 = p.kind === "v4" ? Math.max(0, -a0) : Math.max(0, a0), in1 = p.kind === "v4" ? Math.max(0, -a1) : Math.max(0, a1);
        out += `${l.blockNumber},${l.logIndex},${in0},${in1},${Number(l.args.liquidity)},${l.args.tick},${Number(l.args.sqrtPriceX96) / Q96},${p.kind === "v4" ? Number(l.args.fee) : p.fee}\n`;
      }
      if (out) appendFileSync(f, out); writeFileSync(prog, String(b)); a = b + 1;
    }
  }));
  console.log(name, "done to", head, new Date(Number(hb.timestamp) * 1000).toISOString());
}
await Promise.all((process.argv[2] ? process.argv.slice(2) : Object.keys(POOLS)).map((n) => pool(n).catch((e) => { console.error(n, "FAILED", e.shortMessage || e.message); process.exitCode = 1; })));
