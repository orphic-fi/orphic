// Paper mark for the Ranger on Nest (Uniswap v4, Elysium). Circuit's simulated run reports no value, so this
// values the paper position from pool state: the range and amounts come from the "Opening a range" lines in
// ops/ranger-paper.log, liquidity is derived from those amounts at the open price, fees from the pool's fee
// growth inside the range between the open block and now, and the position's token amounts from the current
// price. Earlier ranges are closed at the block the next one opened. Output: one line appended to
// ops/ranger-mark.log and a JSON state file with the block cache. Paper only; nothing is sent.
//
// Known gaps, so this is an estimate: tick rounding is ours (Circuit does not print its ticks); swap costs and
// slippage at each recentre are not charged; hook fees that bypass feeGrowth (if Nest's hook takes any) are not
// seen; gas is not charged. All of those make the real result lower, not higher.
import { createPublicClient, http, keccak256, encodeAbiParameters, parseAbi } from "viem";
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";

const RPC = "https://rpc.elysium.kinetiq.xyz";
const STATE_VIEW = "0x27ed73ae0652fdcf71d6793412a7525f32be9dfe";
const KEY = {
  currency0: "0x0000000000000000000000000000000000000000",
  currency1: "0xb47c4c8f73f009cc0c0d3f92b388d13e293f0b65",
  fee: 8388608,
  tickSpacing: 10,
  hooks: "0x0559ef6bc07974bfab2149d7fbc0e898914115cf",
};
const LOG = "/home/claude/orphic/ops/ranger-paper.log";
const OUT = "/home/claude/orphic/ops/ranger-mark.log";
const STATE = "/home/claude/orphic/ops/ranger-mark-state.json";
const DEC0 = 18, DEC1 = 6; // HYPE, USDC
const Q96 = 2 ** 96;
const Q128 = 2n ** 128n;
const MOD = 2n ** 256n;

const c = createPublicClient({ transport: http(RPC) });
const abi = parseAbi([
  "function getSlot0(bytes32) view returns (uint160,int24,uint24,uint24)",
  "function getFeeGrowthInside(bytes32,int24,int24) view returns (uint256,uint256)",
]);
const poolId = keccak256(
  encodeAbiParameters(
    [{ type: "tuple", components: [
      { name: "currency0", type: "address" }, { name: "currency1", type: "address" },
      { name: "fee", type: "uint24" }, { name: "tickSpacing", type: "int24" }, { name: "hooks", type: "address" }] }],
    [KEY],
  ),
);

const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { blocks: {} };

// Ranges opened, from the paper log. Price is USDC per HYPE as Circuit prints it.
function parseOpens() {
  const re = /^(\S+) success \|.*Opening a range (\d+)% either side of ([\d.]+) USDC per HYPE with ([\d.]+) HYPE and ([\d.]+) USDC/;
  return readFileSync(LOG, "utf8").split("\n").map((l) => l.match(re)).filter(Boolean).map((m) => ({
    t: Math.floor(Date.parse(m[1]) / 1000), pct: Number(m[2]), price: Number(m[3]), hype: Number(m[4]), usdc: Number(m[5]),
  }));
}

// First block at or after a unix time, by bisection, cached.
async function blockAt(t, latestNum, latestTs) {
  const k = String(t);
  if (state.blocks[k]) return state.blocks[k];
  let lo = 1n, hi = latestNum;
  // 0.25 s blocks: start from a guess to cut the search short
  const guess = latestNum - BigInt(Math.max(0, Math.floor((latestTs - t) / 0.25)));
  lo = guess > 200000n ? guess - 200000n : 1n;
  hi = guess + 200000n < latestNum ? guess + 200000n : latestNum;
  while (lo < hi) {
    const mid = (lo + hi) / 2n;
    const b = await c.getBlock({ blockNumber: mid });
    if (Number(b.timestamp) < t) lo = mid + 1n; else hi = mid;
  }
  state.blocks[k] = Number(lo);
  return Number(lo);
}

const tickOf = (price) => Math.floor(Math.log(price * 10 ** (DEC1 - DEC0)) / Math.log(1.0001));
const sqrtOfTick = (tick) => Math.sqrt(1.0001 ** tick);
const toFloatPrice = (sqrtX96) => (Number(sqrtX96) / Q96) ** 2 * 10 ** (DEC0 - DEC1);

function liquidity(hype, usdc, sqrtP, sqrtA, sqrtB) {
  const x = hype * 10 ** DEC0, y = usdc * 10 ** DEC1;
  if (sqrtP <= sqrtA) return (x * sqrtA * sqrtB) / (sqrtB - sqrtA);
  if (sqrtP >= sqrtB) return y / (sqrtB - sqrtA);
  return Math.min((x * sqrtP * sqrtB) / (sqrtB - sqrtP), y / (sqrtP - sqrtA));
}
function amounts(L, sqrtP, sqrtA, sqrtB) {
  let x = 0, y = 0;
  if (sqrtP <= sqrtA) x = L * (1 / sqrtA - 1 / sqrtB);
  else if (sqrtP >= sqrtB) y = L * (sqrtB - sqrtA);
  else { x = L * (1 / sqrtP - 1 / sqrtB); y = L * (sqrtP - sqrtA); }
  return { hype: x / 10 ** DEC0, usdc: y / 10 ** DEC1 };
}
const sub = (a, b) => ((a - b) % MOD + MOD) % MOD; // fee growth is allowed to wrap

async function slot0(block) {
  const s = await c.readContract({ address: STATE_VIEW, abi, functionName: "getSlot0", args: [poolId], blockNumber: BigInt(block) });
  return { sqrt: Number(s[0]) / Q96, tick: s[1], lpFee: s[3] };
}
async function fgInside(block, lower, upper) {
  const f = await c.readContract({ address: STATE_VIEW, abi, functionName: "getFeeGrowthInside", args: [poolId, lower, upper], blockNumber: BigInt(block) });
  return [f[0], f[1]];
}

async function main() {
  const latest = await c.getBlock();
  const latestNum = latest.number, latestTs = Number(latest.timestamp), now = latestTs;
  const opens = parseOpens();
  if (opens.length === 0) throw new Error("no ranges in the paper log");

  const segs = [];
  for (let i = 0; i < opens.length; i++) {
    const o = opens[i];
    const openBlock = await blockAt(o.t, latestNum, latestTs);
    const closeBlock = i + 1 < opens.length ? await blockAt(opens[i + 1].t, latestNum, latestTs) : Number(latestNum);
    const lower = Math.floor(tickOf(o.price * (1 - o.pct / 100)) / KEY.tickSpacing) * KEY.tickSpacing;
    const upper = Math.ceil(tickOf(o.price * (1 + o.pct / 100)) / KEY.tickSpacing) * KEY.tickSpacing;
    const sqrtA = sqrtOfTick(lower), sqrtB = sqrtOfTick(upper);
    const so = await slot0(openBlock);
    const L = liquidity(o.hype, o.usdc, so.sqrt, sqrtA, sqrtB);
    // Tokens the range could not take at the open price stay in the wallet (Circuit centres on its own quote,
    // which can sit off the pool price); they are valued as held, not as liquidity.
    const used = amounts(L, so.sqrt, sqrtA, sqrtB);
    const left = { hype: Math.max(0, o.hype - used.hype), usdc: Math.max(0, o.usdc - used.usdc) };
    const fo = await fgInside(openBlock, lower, upper);
    const sc = await slot0(closeBlock);
    const fc = await fgInside(closeBlock, lower, upper);
    const pOpen = toFloatPrice(so.sqrt * Q96), pClose = toFloatPrice(sc.sqrt * Q96);
    const valueOpen = o.hype * pOpen + o.usdc; // what went in, at the pool's price then
    const a = amounts(L, sc.sqrt, sqrtA, sqrtB);
    const fee0 = (Number(sub(fc[0], fo[0]) * BigInt(Math.round(L)) / Q128)) / 10 ** DEC0;
    const fee1 = (Number(sub(fc[1], fo[1]) * BigInt(Math.round(L)) / Q128)) / 10 ** DEC1;
    const feesUsd = fee0 * pClose + fee1;
    const lpUsd = a.hype * pClose + a.usdc + left.hype * pClose + left.usdc;
    const holdUsd = o.hype * pClose + o.usdc; // same tokens, just held
    segs.push({ i, openBlock, closeBlock, lower, upper, pOpen, pClose, L, left, valueOpen, lpUsd, feesUsd, holdUsd, totalUsd: lpUsd + feesUsd,
      inRange: sc.tick >= lower && sc.tick < upper, open: o, lpFee: sc.lpFee });
  }

  // Chain the ranges: each is a fresh position from its own amounts; equity compounds their returns.
  const start = segs[0].valueOpen;
  let equity = start, hold = segs[0].open.hype * segs.at(-1).pClose + segs[0].open.usdc;
  let fees = 0;
  for (const s of segs) { equity *= s.totalUsd / s.valueOpen; fees += s.feesUsd; }
  const days = (now - opens[0].t) / 86400;
  const ret = equity / start - 1;
  const annual = days > 0 ? ret * (365 / days) : 0;
  const cur = segs.at(-1);
  const line = [
    new Date(now * 1000).toISOString().replace(/\.\d{3}Z$/, "Z"),
    `block ${latestNum}`, `HYPE ${cur.pClose.toFixed(3)}`, `tick ${cur.lower}..${cur.upper}`, cur.inRange ? "in range" : "OUT OF RANGE",
    `lpFee ${(cur.lpFee / 1e4).toFixed(4)}%`,
    `range${segs.length} lp $${cur.lpUsd.toFixed(2)} + fees $${cur.feesUsd.toFixed(4)} (open $${cur.valueOpen.toFixed(2)})`,
    `paper equity $${equity.toFixed(2)} from $${start.toFixed(2)} in ${days.toFixed(2)}d`, `fees total $${fees.toFixed(4)}`,
    `fee yield ${((fees / start) * 100).toFixed(3)}% = ${((fees / start) * (365 / days) * 100).toFixed(1)}%/yr (simple, estimate)`,
    `total return ${(ret * 100).toFixed(3)}% incl. HYPE move = ${(annual * 100).toFixed(1)}%/yr`,
    `hold $${hold.toFixed(2)} (${((hold / start - 1) * 100).toFixed(3)}%)`,
  ].join(" | ");
  appendFileSync(OUT, line + "\n");
  state.last = { now, equity, start, fees, days, segs: segs.map((s) => ({ ...s, L: String(s.L) })) };
  writeFileSync(STATE, JSON.stringify(state, null, 1));
  console.log(line);
}
main().catch((e) => { console.error("mark failed:", e.shortMessage || e.message); process.exit(1); });
