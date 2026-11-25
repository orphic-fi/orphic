// Paper book: several junior strategies run side by side on paper, each with $45 from the same start, marked the
// same way from onchain state every tick. Nothing is sent; nothing here is a promise. Every figure is an estimate.
//
// Range strategies (concentrated HYPE/USDC liquidity) are valued from pool state and credited fees per swap from
// the pool's Swap events: a swap pays our share L / (L_pool + L) of its fee on the input token, only while the swap's
// tick sits inside our range. That is exact for a position that existed (it is the pool's own formula) and does
// not depend on our ticks being initialised, which a paper position's never are. Recentres (rule-driven lines) or
// Circuit's own "Opening a range" lines (the live line) close the old range at the pool price and reopen; the paper
// swap at each recentre is free of fees, slippage and gas, so real results are lower, not higher.
//
// HLP is marked from Hypercore's vault pnl and account value (chain-linked per point). Lending lines are marked from
// Felix's price per share and HyperLend's liquidity index; the rotation line moves to the other venue when its rate
// is 0.5 pt higher at a tick, with no gas charged.
import { createPublicClient, http, keccak256, encodeAbiParameters, parseAbi, parseAbiItem } from "viem";
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";

const T0 = 1795279860; // 2026-11-21 16:51 UTC, when the live Nest paper Ranger started
const STAKE = 45; // paper dollars per strategy
const OPS = "/home/claude/orphic/ops";
const STATE = `${OPS}/paper-book-state.json`, MD = `${OPS}/paper-book.md`, LOG = `${OPS}/paper-book.log`;
const RANGER_LOG = `${OPS}/ranger-paper.log`;
const EDGE = 0.02, COOLDOWN = 6 * 3600; // recentre when price is within 2% of an edge, at most every 6h
const DEC0 = 18, DEC1 = 6, Q96 = 2 ** 96;

const ely = createPublicClient({ transport: http("https://rpc.elysium.kinetiq.xyz") });
const hev = createPublicClient({ transport: http("https://hyperliquid.drpc.org") }); // archive reads
const hevLogs = createPublicClient({ transport: http("https://rpc.purroofgroup.com") }); // getLogs, 10k blocks a call
const hevLogs2 = createPublicClient({ transport: http("https://hyperliquid-json-rpc.stakely.io") }); // fallback, some nodes cap at 1k

const V4_PM = "0xe2e105d3f7209a9da11f83ccf3e7398a753823f1", V4_SV = "0x27ed73ae0652fdcf71d6793412a7525f32be9dfe";
const NEST_KEY = { currency0: "0x0000000000000000000000000000000000000000", currency1: "0xb47c4c8f73f009cc0c0d3f92b388d13e293f0b65", fee: 8388608, tickSpacing: 10, hooks: "0x0559ef6bc07974bfab2149d7fbc0e898914115cf" };
const NEST_ID = keccak256(encodeAbiParameters([{ type: "tuple", components: [{ name: "currency0", type: "address" }, { name: "currency1", type: "address" }, { name: "fee", type: "uint24" }, { name: "tickSpacing", type: "int24" }, { name: "hooks", type: "address" }] }], [NEST_KEY]));
const svAbi = parseAbi(["function getSlot0(bytes32) view returns (uint160,int24,uint24,uint24)"]);
const v3Abi = parseAbi(["function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)"]);
const v4Swap = parseAbiItem("event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)");
const v3Swap = parseAbiItem("event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)");

const USDC = "0xb88339CB7199b77E23DB6E890353E22632Ba630f", FELIX = "0x8A862fD6c12f9ad34C9c2ff45AB2b6712e8CEa27", HL_POOL = "0x00A89d7a5A02160f20150EbEA7a2b5E4879A1A8b";
const felixAbi = parseAbi(["function convertToAssets(uint256) view returns (uint256)"]);
const hlAbi = parseAbi(["function getReserveData(address) view returns ((uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))"]);
const HLP = "0xdfc24b077bc1425ad1dea75bcb6f8158e10df303";

// Pools. v4 lines take the fee from each Swap event (Nest's hook sets it per swap, and swaps paying HYPE in carry
// fee 0: those pay LPs nothing, which matches the pool's fee growth). v3 lines use the pool's fixed fee.
const POOLS = {
  nest: { chain: "ely", kind: "v4", id: NEST_ID, spacing: 10, label: "Nest HYPE/USDC (Elysium, v4)" },
  px05: { chain: "hev", kind: "v3", address: "0x6c9a33e3b592c0d65b3ba59355d5be0d38259285", fee: 500, spacing: 10, label: "Project X WHYPE/USDC 0.05% (HyperEVM)" },
  px30: { chain: "hev", kind: "v3", address: "0x422e586c906eb241f784b4f5a633c2c7e59a2f54", fee: 3000, spacing: 60, label: "Project X WHYPE/USDC 0.3% (HyperEVM)" },
};
const STRATS = [
  { id: "nest10live", type: "range", pool: "nest", pct: 10, driver: "log", name: "Nest ±10%, Circuit Ranger (live paper)" },
  { id: "nest20", type: "range", pool: "nest", pct: 20, driver: "rule", name: "Nest ±20%, own rule" },
  { id: "px05_10", type: "range", pool: "px05", pct: 10, driver: "rule", name: "Project X 0.05% ±10%, own rule" },
  { id: "px05_20", type: "range", pool: "px05", pct: 20, driver: "rule", name: "Project X 0.05% ±20%, own rule" },
  { id: "px30_10", type: "range", pool: "px30", pct: 10, driver: "rule", name: "Project X 0.3% ±10%, own rule" },
  { id: "px05_20h", type: "hedged", pool: "px05", pct: 20, name: "Project X 0.05% ±20% + $HYPE short on Hypercore, own rule" },
  { id: "hlp", type: "hlp", name: "HLP (Hypercore vault)" },
  { id: "felix", type: "lend", venue: "felix", name: "Felix USDC, hold" },
  { id: "hyperlend", type: "lend", venue: "hyperlend", name: "HyperLend USDC, hold" },
  { id: "rotation", type: "rotate", name: "Lending rotation, Felix or HyperLend (0.5 pt rule, no gas)" },
];

const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { blocks: { ely: {}, hev: {} }, s: {} };
const client = (ch) => (ch === "ely" ? ely : hev);
const tickOf = (p) => Math.floor(Math.log(p * 10 ** (DEC1 - DEC0)) / Math.log(1.0001));
const sqrtOfTick = (t) => Math.sqrt(1.0001 ** t);
const priceOfSqrt = (s) => s ** 2 * 10 ** (DEC0 - DEC1); // USDC per HYPE from sqrt (as float, not X96)
function liquidity(hype, usdc, sP, sA, sB) {
  const x = hype * 10 ** DEC0, y = usdc * 10 ** DEC1;
  if (sP <= sA) return (x * sA * sB) / (sB - sA);
  if (sP >= sB) return y / (sB - sA);
  return Math.min((x * sP * sB) / (sB - sP), y / (sP - sA));
}
function amounts(L, sP, sA, sB) {
  let x = 0, y = 0;
  if (sP <= sA) x = L * (1 / sA - 1 / sB);
  else if (sP >= sB) y = L * (sB - sA);
  else { x = L * (1 / sP - 1 / sB); y = L * (sP - sA); }
  return { hype: x / 10 ** DEC0, usdc: y / 10 ** DEC1 };
}

const latest = {};
async function head(ch) { if (!latest[ch]) { const b = await client(ch).getBlock(); latest[ch] = { n: Number(b.number), t: Number(b.timestamp) }; } return latest[ch]; }
async function blockAt(ch, t) {
  const k = String(t); if (state.blocks[ch][k]) return state.blocks[ch][k];
  const h = await head(ch); const c = client(ch);
  const dt = ch === "ely" ? 0.25 : 1.0;
  const guess = h.n - Math.max(0, Math.floor((h.t - t) / dt));
  let lo = BigInt(Math.max(1, guess - 200000)), hi = BigInt(Math.min(h.n, guess + 200000));
  while (lo < hi) { const mid = (lo + hi) / 2n; const b = await c.getBlock({ blockNumber: mid }); if (Number(b.timestamp) < t) lo = mid + 1n; else hi = mid; }
  state.blocks[ch][k] = Number(lo); return Number(lo);
}
// time of a block by linear interpolation between the start block and head (good to a few seconds)
function tsOf(ch, b, b0) { const h = latest[ch]; return T0 + ((b - b0) * (h.t - T0)) / (h.n - b0); }

async function slot0(pool, block) {
  if (pool.kind === "v4") { const s = await ely.readContract({ address: V4_SV, abi: svAbi, functionName: "getSlot0", args: [pool.id], blockNumber: BigInt(block) }); return { sqrt: Number(s[0]) / Q96, tick: s[1] }; }
  const s = await hev.readContract({ address: pool.address, abi: v3Abi, functionName: "slot0", blockNumber: BigInt(block) }); return { sqrt: Number(s[0]) / Q96, tick: s[1] };
}
async function swaps(pool, from, to) {
  const out = [];
  const step = pool.kind === "v4" ? 100000 : 10000;
  for (let a = from; a <= to; a += step) {
    const b = Math.min(to, a + step - 1);
    let logs;
    if (pool.kind === "v4") logs = await ely.getLogs({ address: V4_PM, event: v4Swap, args: { id: pool.id }, fromBlock: BigInt(a), toBlock: BigInt(b) });
    else {
      try { logs = await hevLogs.getLogs({ address: pool.address, event: v3Swap, fromBlock: BigInt(a), toBlock: BigInt(b) }); }
      catch { logs = []; for (let x = a; x <= b; x += 1000) logs.push(...(await hevLogs2.getLogs({ address: pool.address, event: v3Swap, fromBlock: BigInt(x), toBlock: BigInt(Math.min(b, x + 999)) }))); }
    }
    for (const l of logs) {
      const a0 = Number(l.args.amount0), a1 = Number(l.args.amount1);
      // input token: v4 deltas are the swapper's (negative = paid in); v3 amounts are the pool's (positive = paid in)
      const in0 = pool.kind === "v4" ? Math.max(0, -a0) : Math.max(0, a0), in1 = pool.kind === "v4" ? Math.max(0, -a1) : Math.max(0, a1);
      out.push({ block: Number(l.blockNumber), idx: l.logIndex, in0, in1, L: Number(l.args.liquidity), tick: l.args.tick, sqrt: Number(l.args.sqrtPriceX96) / Q96, fee: pool.kind === "v4" ? Number(l.args.fee) : pool.fee });
    }
  }
  return out.sort((x, y) => x.block - y.block || x.idx - y.idx);
}

// Circuit's own range opens, from the live paper log
function circuitOpens() {
  const re = /^(\S+) success \|.*Opening a range (\d+)% either side of ([\d.]+) USDC per HYPE with ([\d.]+) HYPE and ([\d.]+) USDC/;
  return readFileSync(RANGER_LOG, "utf8").split("\n").map((l) => l.match(re)).filter(Boolean).map((m) => ({ t: Math.floor(Date.parse(m[1]) / 1000), pct: Number(m[2]), price: Number(m[3]), hype: Number(m[4]), usdc: Number(m[5]) }));
}

function openRange(s, pool, pct, hype, usdc, sqrt, block, t, centre) {
  const lower = Math.floor(tickOf(centre * (1 - pct / 100)) / pool.spacing) * pool.spacing;
  const upper = Math.ceil(tickOf(centre * (1 + pct / 100)) / pool.spacing) * pool.spacing;
  const sA = sqrtOfTick(lower), sB = sqrtOfTick(upper);
  const L = liquidity(hype, usdc, sqrt, sA, sB);
  const used = amounts(L, sqrt, sA, sB);
  s.pos = { lower, upper, L, left: { hype: Math.max(0, hype - used.hype), usdc: Math.max(0, usdc - used.usdc) }, fee0: 0, fee1: 0, openBlock: block, openT: t, openValue: hype * priceOfSqrt(sqrt) + usdc };
  s.opens = (s.opens || 0) + 1;
}
function closeValue(s, sqrt) {
  const p = priceOfSqrt(sqrt), a = amounts(s.pos.L, sqrt, sqrtOfTick(s.pos.lower), sqrtOfTick(s.pos.upper));
  const hype = a.hype + s.pos.left.hype + s.pos.fee0, usdc = a.usdc + s.pos.left.usdc + s.pos.fee1;
  return { hype, usdc, value: hype * p + usdc, feesUsd: s.pos.fee0 * p + s.pos.fee1 };
}
function creditSwap(s, sw) {
  if (sw.tick < s.pos.lower || sw.tick >= s.pos.upper || sw.L <= 0) return;
  const share = s.pos.L / (sw.L + s.pos.L), f = sw.fee / 1e6;
  s.pos.fee0 += (sw.in0 * f * share) / 10 ** DEC0;
  s.pos.fee1 += (sw.in1 * f * share) / 10 ** DEC1;
}

async function runRange(def) {
  const pool = POOLS[def.pool], ch = pool.chain, h = await head(ch);
  const s = (state.s[def.id] ||= {});
  const b0 = await blockAt(ch, T0);
  if (!s.pos) {
    // open at the start block: half and half at the pool price (rule), or Circuit's first open (log)
    const so = await slot0(pool, b0), p0 = priceOfSqrt(so.sqrt);
    if (def.driver === "log") {
      const o = circuitOpens()[0]; const ob = await blockAt(ch, o.t); const sb = await slot0(pool, ob);
      openRange(s, pool, o.pct, o.hype, o.usdc, sb.sqrt, ob, o.t, o.price);
      s.start = s.pos.openValue; s.hold = { hype: o.hype, usdc: o.usdc }; s.equity = s.start; s.scanned = ob; s.logOpens = 1;
    } else {
      openRange(s, pool, def.pct, STAKE / 2 / p0, STAKE / 2, so.sqrt, b0, T0, p0);
      s.start = STAKE; s.hold = { hype: STAKE / 2 / p0, usdc: STAKE / 2 }; s.equity = STAKE; s.scanned = b0;
    }
    s.feesUsd = 0; s.lastRecentre = s.pos.openT;
  }
  const pendingOpens = def.driver === "log" ? circuitOpens().slice(s.logOpens) : [];
  const list = await swaps(pool, s.scanned + 1, h.n);
  for (const sw of list) {
    const t = tsOf(ch, sw.block, b0);
    if (def.driver === "log") {
      while (pendingOpens.length && pendingOpens[0].t <= t) {
        const o = pendingOpens.shift(); const cv = closeValue(s, sw.sqrt);
        s.equity *= cv.value / s.pos.openValue; s.feesUsd += cv.feesUsd;
        openRange(s, pool, o.pct, o.hype, o.usdc, sw.sqrt, sw.block, o.t, o.price); s.logOpens++; s.lastRecentre = o.t;
      }
    }
    creditSwap(s, sw);
    if (def.driver === "rule") {
      const p = priceOfSqrt(sw.sqrt), pl = priceOfSqrt(sqrtOfTick(s.pos.lower)), pu = priceOfSqrt(sqrtOfTick(s.pos.upper));
      if ((p <= pl * (1 + EDGE) || p >= pu * (1 - EDGE)) && t - s.lastRecentre >= COOLDOWN) {
        const cv = closeValue(s, sw.sqrt);
        s.equity *= cv.value / s.pos.openValue; s.feesUsd += cv.feesUsd;
        openRange(s, pool, def.pct, cv.value / 2 / p, cv.value / 2, sw.sqrt, sw.block, t, p); // paper swap to 50/50 at pool price, no cost charged
        s.lastRecentre = t;
      }
    }
  }
  // log-driven opens that happened after the last swap
  if (def.driver === "log" && pendingOpens.length) {
    const sn = await slot0(pool, h.n);
    for (const o of pendingOpens) { const cv = closeValue(s, sn.sqrt); s.equity *= cv.value / s.pos.openValue; s.feesUsd += cv.feesUsd; openRange(s, pool, o.pct, o.hype, o.usdc, sn.sqrt, h.n, o.t, o.price); s.logOpens++; }
  }
  s.scanned = h.n;
  const sn = await slot0(pool, h.n), p = priceOfSqrt(sn.sqrt), cv = closeValue(s, sn.sqrt);
  const equity = s.equity * (cv.value / s.pos.openValue), fees = s.feesUsd + cv.feesUsd, hold = s.hold.hype * p + s.hold.usdc;
  return { name: def.name, equity, start: s.start, fees, hold, note: `${sn.tick >= s.pos.lower && sn.tick < s.pos.upper ? "in range" : "OUT"} ${s.pos.lower}..${s.pos.upper}, ${s.opens} range${s.opens === 1 ? "" : "s"}, HYPE ${p.toFixed(2)}` };
}

// Hedged range: same position and recentre rule as a range line, plus a short HYPE perp on Hypercore sized to the
// HYPE the position holds, so what is left is fees and funding rather than the HYPE price. 1/6 of the stake sits as
// perp margin and earns nothing; the rest is the LP. The short is resized hourly when it is more than 5% off the
// position's HYPE (and at every recentre), paying the base-tier taker fee each time. Funding is Hypercore's own
// hourly HYPE rate (positive = longs pay shorts). The perp is marked at the pool price, so the basis between
// Hypercore and the pool is not seen; capital is re-split 5/6 LP, 1/6 margin at each recentre with no transfer cost.
const TAKER = 0.00045, MARGIN = 1 / 6, REBAL = 0.05;
const hlInfo = async (body) => (await fetch("https://api.hyperliquid.xyz/info", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
async function fundingSince(t) {
  const out = new Map();
  for (let from = t * 1000; ;) {
    const d = await hlInfo({ type: "fundingHistory", coin: "HYPE", startTime: from });
    for (const x of d) out.set(Math.round(x.time / 3600000) * 3600, Number(x.fundingRate));
    if (d.length < 500) break;
    from = d.at(-1).time + 1;
  }
  return out;
}
async function runHedged(def) {
  const pool = POOLS[def.pool], ch = pool.chain, h = await head(ch);
  const s = (state.s[def.id] ||= {});
  const b0 = await blockAt(ch, T0);
  const hypeOf = (sqrt) => amounts(s.pos.L, sqrt, sqrtOfTick(s.pos.lower), sqrtOfTick(s.pos.upper)).hype + s.pos.left.hype + s.pos.fee0;
  const mark = (p) => { s.hg.m -= s.hg.q * (p - s.hg.p); s.hg.p = p; };
  const resize = (target, p) => { const c = Math.abs(target - s.hg.q) * p * TAKER; s.hg.m -= c; s.hg.cost += c; s.hg.q = target; s.hg.trades++; };
  const watch = (p) => { if (s.hg.q > 0) s.hg.minRatio = Math.min(s.hg.minRatio, s.hg.m / (s.hg.q * p)); };
  if (!s.pos) {
    const so = await slot0(pool, b0), p0 = priceOfSqrt(so.sqrt), lp = STAKE * (1 - MARGIN);
    openRange(s, pool, def.pct, lp / 2 / p0, lp / 2, so.sqrt, b0, T0, p0);
    s.hg = { q: 0, p: p0, m: STAKE * MARGIN, funding: 0, cost: 0, trades: 0, nextH: Math.ceil(T0 / 3600) * 3600, minRatio: 1e9 };
    resize(hypeOf(so.sqrt), p0);
    s.start = STAKE; s.feesUsd = 0; s.lastRecentre = T0; s.scanned = b0;
  }
  const rates = await fundingSince(s.hg.nextH - 3600);
  const hourly = (t, sqrt) => {
    while (s.hg.nextH <= t && rates.has(s.hg.nextH)) {
      const p = priceOfSqrt(sqrt); mark(p);
      const f = s.hg.q * p * rates.get(s.hg.nextH); s.hg.m += f; s.hg.funding += f; // short receives when the rate is positive
      const target = hypeOf(sqrt); if (Math.abs(target - s.hg.q) > REBAL * s.hg.q) resize(target, p);
      watch(p); s.hg.nextH += 3600;
    }
  };
  let last = null;
  for (const sw of await swaps(pool, s.scanned + 1, h.n)) {
    const t = tsOf(ch, sw.block, b0);
    hourly(t, last ? last.sqrt : sw.sqrt);
    creditSwap(s, sw);
    const p = priceOfSqrt(sw.sqrt), pl = priceOfSqrt(sqrtOfTick(s.pos.lower)), pu = priceOfSqrt(sqrtOfTick(s.pos.upper));
    if ((p <= pl * (1 + EDGE) || p >= pu * (1 - EDGE)) && t - s.lastRecentre >= COOLDOWN) {
      mark(p); watch(p);
      const cv = closeValue(s, sw.sqrt), total = cv.value + s.hg.m; s.feesUsd += cv.feesUsd;
      const lp = total * (1 - MARGIN); s.hg.m = total * MARGIN; // paper transfer between the LP and the margin account
      openRange(s, pool, def.pct, lp / 2 / p, lp / 2, sw.sqrt, sw.block, t, p);
      resize(hypeOf(sw.sqrt), p); s.lastRecentre = t;
    }
    last = sw;
  }
  s.scanned = h.n;
  const sn = await slot0(pool, h.n), p = priceOfSqrt(sn.sqrt);
  hourly(h.t, sn.sqrt); mark(p); watch(p);
  const cv = closeValue(s, sn.sqrt), equity = cv.value + s.hg.m, lpFees = s.feesUsd + cv.feesUsd;
  const maint = 1 / (2 * (await hlInfo({ type: "meta" })).universe.find((u) => u.name === "HYPE").maxLeverage);
  const carry = lpFees + s.hg.funding - s.hg.cost; // what the line earned net of the hedge's running costs
  return { name: def.name, equity, start: s.start, fees: carry, hold: STAKE,
    note: `LP fees $${lpFees.toFixed(4)} + funding $${s.hg.funding.toFixed(4)} − hedge fees $${s.hg.cost.toFixed(4)} (${s.hg.trades} trades); short ${s.hg.q.toFixed(4)} vs LP ${hypeOf(sn.sqrt).toFixed(4)} HYPE; lowest margin ${(s.hg.minRatio * 100).toFixed(0)}% of short (maintenance ${(maint * 100).toFixed(1)}%)${s.hg.minRatio < maint ? " WOULD HAVE BEEN LIQUIDATED" : ""}; ${s.opens} range${s.opens === 1 ? "" : "s"}; hold = $45 USDC` };
}

async function runHlp(def) {
  const s = (state.s[def.id] ||= { r: 1 });
  const r = await fetch("https://api.hyperliquid.xyz/info", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "vaultDetails", vaultAddress: HLP }) });
  const d = await r.json(); const w = Object.fromEntries(d.portfolio).week;
  const pts = w.accountValueHistory.map(([t, a], i) => ({ t: Math.floor(t / 1000), av: Number(a), pnl: Number(w.pnlHistory[i][1]) }));
  for (const p of pts) {
    if (s.last && p.t > s.last.t && p.t >= T0) s.r *= 1 + (p.pnl - s.last.pnl) / s.last.av;
    if (!s.last || p.t > s.last.t) s.last = p;
  }
  return { name: def.name, equity: STAKE * s.r, start: STAKE, fees: STAKE * (s.r - 1), hold: STAKE, note: `Hypercore reports ${(Number(d.apr) * 100).toFixed(1)}% APR trailing; 4-day exit` };
}

async function felixPps(block) { return Number(await hev.readContract({ address: FELIX, abi: felixAbi, functionName: "convertToAssets", args: [10n ** 18n], blockNumber: BigInt(block) })); }
async function hlIndex(block) { const rd = await hev.readContract({ address: HL_POOL, abi: hlAbi, functionName: "getReserveData", args: [USDC], blockNumber: BigInt(block) }); return { idx: Number(rd.liquidityIndex) / 1e27, apy: Math.expm1(Number(rd.currentLiquidityRate) / 1e27) }; }
async function runLend(def) {
  const h = await head("hev"), b0 = await blockAt("hev", T0);
  const s = (state.s[def.id] ||= {});
  if (def.venue === "felix") { s.p0 ??= await felixPps(b0); const p = await felixPps(h.n); return { name: def.name, equity: STAKE * (p / s.p0), start: STAKE, fees: STAKE * (p / s.p0 - 1), hold: STAKE, note: "price per share, Morpho vault" }; }
  s.i0 ??= (await hlIndex(b0)).idx; const x = await hlIndex(h.n);
  return { name: def.name, equity: STAKE * (x.idx / s.i0), start: STAKE, fees: STAKE * (x.idx / s.i0 - 1), hold: STAKE, note: `liquidity index; supply APY now ${(x.apy * 100).toFixed(2)}%` };
}
async function runRotate(def) {
  const h = await head("hev"), b0 = await blockAt("hev", T0);
  const s = (state.s[def.id] ||= { venue: "felix", units: 1, moves: 0 });
  // step through time at 6h from where we left off, so the rule is applied the same in backfill and live
  const steps = []; for (let t = (s.t ?? T0) + 6 * 3600; t < h.t; t += 6 * 3600) steps.push(await blockAt("hev", t)); steps.push(h.n);
  if (s.t === undefined) { s.fp = await felixPps(b0); s.hi = (await hlIndex(b0)).idx; s.t = T0; s.b = b0; }
  for (const b of steps) {
    const fp = await felixPps(b), hl = await hlIndex(b);
    // grow the holding at its venue
    s.units *= s.venue === "felix" ? fp / s.fp : hl.idx / s.hi;
    // Felix rate = its realised growth over the trailing 24h, annualised; HyperLend rate = its posted supply APY
    const tb = tsOf("hev", b, b0), fpBack = await felixPps(await blockAt("hev", Math.floor(tb - 86400)));
    const felixRate = (fp / fpBack - 1) * 365;
    const want = hl.apy >= felixRate + 0.005 ? "hyperlend" : felixRate >= hl.apy + 0.005 ? "felix" : s.venue;
    if (want !== s.venue) { s.venue = want; s.moves++; }
    s.fp = fp; s.hi = hl.idx; s.lastRates = { felix: felixRate, hyperlend: hl.apy };
  }
  s.b = h.n; s.t = h.t;
  return { name: def.name, equity: STAKE * s.units, start: STAKE, fees: STAKE * (s.units - 1), hold: STAKE, note: `in ${s.venue}, ${s.moves} move${s.moves === 1 ? "" : "s"}; Felix ${(s.lastRates.felix * 100).toFixed(2)}% realised 24h, HyperLend ${(s.lastRates.hyperlend * 100).toFixed(2)}% posted` };
}

async function main() {
  const rows = [], errors = [];
  for (const def of STRATS) {
    try { rows.push(def.type === "range" ? await runRange(def) : def.type === "hedged" ? await runHedged(def) : def.type === "hlp" ? await runHlp(def) : def.type === "lend" ? await runLend(def) : await runRotate(def)); }
    catch (e) { errors.push(`${def.id}: ${(e.shortMessage || e.message).slice(0, 120)}`); rows.push({ name: def.name, error: true }); }
  }
  const now = Math.floor(Date.now() / 1000), days = (now - T0) / 86400, stamp = new Date(now * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
  const pct = (x) => `${(x * 100).toFixed(3)}%`, ann = (x) => `${((x * 365) / days * 100).toFixed(1)}%`;
  const md = [
    `# Paper book, junior strategies`, ``,
    `Marked ${stamp}, ${days.toFixed(2)} days since ${new Date(T0 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z")}. $${STAKE} paper per line. All figures are estimates from onchain state; nothing is sent, nothing is promised. Annualised = simple, return × 365 / days, and means little this early.`, ``,
    `| Strategy | Equity | Fees or yield | Total return | Annualised | Hold same tokens | Note |`, `|---|---|---|---|---|---|---|`,
    ...rows.map((r) => r.error ? `| ${r.name} | mark failed | | | | | |` : `| ${r.name} | $${r.equity.toFixed(2)} | $${r.fees.toFixed(4)} (${pct(r.fees / r.start)}, ${ann(r.fees / r.start)}/yr) | ${pct(r.equity / r.start - 1)} | ${ann(r.equity / r.start - 1)} | $${r.hold.toFixed(2)} (${pct(r.hold / r.start - 1)}) | ${r.note} |`),
    ``,
    `Range lines: fees credited per swap from pool Swap events at our share of pool liquidity while in range; recentres are paper swaps at the pool price with no fee, slippage or gas charged. Own rule: recentre when the price is within 2% of an edge, at most every 6h. The live line follows Circuit's own range opens from ops/ranger-paper.log. "Hold" is the same starting tokens held, so total return minus hold is what the strategy added or cost. HLP: chain-linked vault pnl over account value from Hypercore. Lending: Felix price per share, HyperLend liquidity index. Rotation moves when the other venue's rate is 0.5 pt higher at a 6h step, with no gas charged. Hedged line: same range and rule as Project X 0.05% ±20%, with 5/6 of the stake in the LP and 1/6 as Hypercore margin for a HYPE short sized to the position's HYPE, resized hourly when more than 5% off and at each recentre at the 0.045% taker fee, earning or paying Hypercore's hourly funding; its fees column is LP fees plus funding minus hedge fees, and its hold is $45 USDC because it is meant to carry no HYPE price exposure. Not charged: basis between Hypercore and the pool, LP gas, and the paper swap and transfer at each recentre.`,
    ...(errors.length ? [``, `Errors this mark: ${errors.join("; ")}`] : []),
    ``, `Source: keeper/scripts/paperBook.mjs. Log: ops/paper-book.log.`, ``,
  ].join("\n");
  writeFileSync(MD, md);
  appendFileSync(LOG, `${stamp} | ${days.toFixed(2)}d | ` + rows.map((r) => r.error ? `${r.name.split(",")[0]}=ERR` : `${r.name.split(",")[0]}=${r.equity.toFixed(2)}/f${r.fees.toFixed(4)}/h${r.hold.toFixed(2)}`).join(" | ") + (errors.length ? ` | ERR ${errors.join("; ")}` : "") + "\n");
  writeFileSync(STATE, JSON.stringify(state));
  console.log(md);
  if (errors.length) process.exitCode = 2;
}
main().catch((e) => { console.error("paper book failed:", e.shortMessage || e.message); process.exit(1); });
