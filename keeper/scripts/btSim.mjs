// Backtest: replays every swap in the btFetch window through a grid of junior strategies and ranks them in USDC
// terms, choosing on the first two thirds of the window and checking on the last third. Same fee and liquidity math
// as paperBook.mjs (copied), plus costs the paper book leaves out: the rebalancing swap at each recentre pays the pool
// fee plus 0.05% slippage, and each recentre pays $0.05 of gas. Read-only; every figure is an estimate.
import { createPublicClient, http, parseAbi } from "viem";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";

const DIR = "/home/claude/bt", OUT = "/home/claude/orphic/ops/backtest.md";
const STAKE = 1000, DEC0 = 18, DEC1 = 6, SLIP = 0.0005, GAS = 0.05, TAKER = 0.00045, MARGIN = 1 / 6, REBAL = 0.05;
const POOLS = { px05: { label: "Project X 0.05%", spacing: 10, ch: "hev" }, px30: { label: "Project X 0.3%", spacing: 60, ch: "hev" }, nest: { label: "Nest", spacing: 10, ch: "ely" } };

// ---- math copied from paperBook.mjs ----
const tickOf = (p) => Math.floor(Math.log(p * 10 ** (DEC1 - DEC0)) / Math.log(1.0001));
const sqrtOfTick = (t) => Math.sqrt(1.0001 ** t);
const priceOfSqrt = (s) => s ** 2 * 10 ** (DEC0 - DEC1);
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

// ---- data ----
function loadTimes(ch) {
  const m = new Map(); for (const l of readFileSync(`${DIR}/${ch}-times.csv`, "utf8").trim().split("\n")) { const [b, t] = l.split(",").map(Number); m.set(b, t); }
  const pts = [...m.entries()].sort((a, b) => a[0] - b[0]);
  return (blk) => { let lo = 0, hi = pts.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (pts[mid][0] <= blk) lo = mid; else hi = mid; }
    const [b0, t0] = pts[lo], [b1, t1] = pts[hi]; return b1 === b0 ? t0 : t0 + ((blk - b0) * (t1 - t0)) / (b1 - b0); };
}
function loadSwaps(name) {
  const tf = loadTimes(POOLS[name].ch), rows = readdirSync(DIR).filter((f) => f.startsWith(`${name}.`) && f.endsWith(".csv")).flatMap((f) => readFileSync(`${DIR}/${f}`, "utf8").trim().split("\n")).filter(Boolean);
  const n = rows.length, T = new Float64Array(n), IN0 = new Float64Array(n), IN1 = new Float64Array(n), L = new Float64Array(n), TK = new Int32Array(n), SQ = new Float64Array(n), FEE = new Float64Array(n);
  const tmp = rows.map((r) => r.split(",")).map((c) => c.map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  tmp.forEach((c, i) => { T[i] = tf(c[0]); IN0[i] = c[2]; IN1[i] = c[3]; L[i] = c[4]; TK[i] = c[5]; SQ[i] = c[6]; FEE[i] = c[7] / 1e6; });
  return { n, T, IN0, IN1, L, TK, SQ, FEE };
}
const hlInfo = async (body) => (await fetch("https://api.hyperliquid.xyz/info", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
async function funding(t0) {
  const f = `${DIR}/funding.json`; if (existsSync(f)) return new Map(JSON.parse(readFileSync(f, "utf8")));
  const out = new Map();
  for (let from = t0 * 1000; ;) { const d = await hlInfo({ type: "fundingHistory", coin: "HYPE", startTime: from }); for (const x of d) out.set(Math.round(x.time / 3600000) * 3600, Number(x.fundingRate)); if (d.length < 500) break; from = d.at(-1).time + 1; }
  writeFileSync(f, JSON.stringify([...out])); return out;
}
// daily USDC lending baselines: Felix price per share and HyperLend liquidity index at each day, by block
async function lending(t0, t1) {
  const f = `${DIR}/lending.json`; if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8"));
  const hev = createPublicClient({ transport: http("https://hyperliquid.drpc.org", { retryCount: 6 }) });
  const head = await hev.getBlock(); const tf = loadTimes("hev");
  const times = readFileSync(`${DIR}/hev-times.csv`, "utf8").trim().split("\n").map((l) => l.split(",").map(Number)).sort((a, b) => a[0] - b[0]);
  const blockAt = (t) => { for (let i = 1; i < times.length; i++) if (times[i][1] >= t) { const [b0, s0] = times[i - 1], [b1, s1] = times[i]; return Math.round(b0 + ((t - s0) * (b1 - b0)) / (s1 - s0)); } return Number(head.number); };
  const felixAbi = parseAbi(["function convertToAssets(uint256) view returns (uint256)"]);
  const hlAbi = parseAbi(["function getReserveData(address) view returns ((uint256,uint128,uint128,uint128,uint128,uint128,uint40,uint16,address,address,address,address,uint128,uint128,uint128))"]);
  const rows = [];
  for (let t = t0; t <= t1; t += 86400) {
    const b = BigInt(blockAt(t)); let fx = null, hl = null;
    try { fx = Number(await hev.readContract({ address: "0x8A862fD6c12f9ad34C9c2ff45AB2b6712e8CEa27", abi: felixAbi, functionName: "convertToAssets", args: [10n ** 18n], blockNumber: b })); } catch {}
    try { hl = Number((await hev.readContract({ address: "0x00A89d7a5A02160f20150EbEA7a2b5E4879A1A8b", abi: hlAbi, functionName: "getReserveData", args: ["0xb88339CB7199b77E23DB6E890353E22632Ba630f"], blockNumber: b }))[1]); } catch {}
    rows.push({ t, fx, hl });
  }
  writeFileSync(f, JSON.stringify(rows)); return rows;
}

// ---- one strategy over one pool's swaps; returns a daily equity curve in USDC ----
function run(S, def, rates, days) {
  const { spacing } = POOLS[def.pool];
  let pos = null, opens = 0, lpFees = 0, recCost = 0, hedgeCost = 0, fund = 0, trades = 0, minRatio = 1e9, lastRec = -1e18;
  const hg = { q: 0, p: 0, m: 0 }; let nextH = 0;
  const open = (total, sqrt, t) => {
    const p = priceOfSqrt(sqrt), lpCap = def.hedge ? total * (1 - MARGIN) : total;
    if (def.hedge) hg.m = total * MARGIN;
    const lower = Math.floor(tickOf(p * (1 - def.pct / 100)) / spacing) * spacing, upper = Math.ceil(tickOf(p * (1 + def.pct / 100)) / spacing) * spacing;
    const sA = sqrtOfTick(lower), sB = sqrtOfTick(upper), hype = lpCap / 2 / p, usdc = lpCap / 2;
    const L = liquidity(hype, usdc, sqrt, sA, sB), used = amounts(L, sqrt, sA, sB);
    pos = { lower, upper, sA, sB, L, left: { hype: hype - used.hype, usdc: usdc - used.usdc }, fee0: 0, fee1: 0 }; opens++; lastRec = t;
  };
  const lpValue = (sqrt) => { const p = priceOfSqrt(sqrt), a = amounts(pos.L, sqrt, pos.sA, pos.sB); return { hype: a.hype + pos.left.hype + pos.fee0, value: (a.hype + pos.left.hype + pos.fee0) * p + a.usdc + pos.left.usdc + pos.fee1, fees: pos.fee0 * p + pos.fee1 }; };
  const mark = (p) => { hg.m -= hg.q * (p - hg.p); hg.p = p; };
  const resize = (target, p) => { const c = Math.abs(target - hg.q) * p * TAKER; hg.m -= c; hedgeCost += c; hg.q = target; trades++; };
  const equity = (sqrt) => { const v = lpValue(sqrt).value; if (!def.hedge) return v; mark(priceOfSqrt(sqrt)); return v + hg.m; };
  const curve = []; let di = 0, liquidated = false;
  for (let i = 0; i < S.n; i++) {
    const t = S.T[i], sqrt = S.SQ[i];
    if (!pos) { if (t < days[0]) continue; open(STAKE, sqrt, t); if (def.hedge) { hg.p = priceOfSqrt(sqrt); resize(lpValue(sqrt).hype, hg.p); nextH = Math.ceil(t / 3600) * 3600; } }
    const prev = i > 0 ? S.SQ[i - 1] : sqrt;
    while (di < days.length && days[di] <= t) { curve.push(equity(prev)); di++; }
    if (def.hedge) while (nextH <= t) {
      const r = rates.get(nextH); const p = priceOfSqrt(prev); mark(p);
      if (r !== undefined) { const f = hg.q * p * r; hg.m += f; fund += f; }
      const target = lpValue(prev).hype; if (Math.abs(target - hg.q) > REBAL * hg.q) resize(target, p);
      minRatio = Math.min(minRatio, hg.m / (hg.q * p)); if (hg.m / (hg.q * p) < 0.05) liquidated = true; nextH += 3600;
    }
    // fees, the pool's own per-swap formula
    if (S.TK[i] >= pos.lower && S.TK[i] < pos.upper && S.L[i] > 0) { const sh = pos.L / (S.L[i] + pos.L), f = S.FEE[i]; pos.fee0 += (S.IN0[i] * f * sh) / 1e18; pos.fee1 += (S.IN1[i] * f * sh) / 1e6; }
    // recentre rule
    if (def.rule !== "never") {
      const p = priceOfSqrt(sqrt), pl = priceOfSqrt(pos.sA), pu = priceOfSqrt(pos.sB);
      const hit = def.rule === "edge" ? p <= pl * 1.02 || p >= pu * 0.98 : p < pl || p > pu;
      if (hit && t - lastRec >= def.cool * 3600) {
        const lv = lpValue(sqrt); lpFees += lv.fees;
        let total = lv.value; if (def.hedge) { mark(p); total += hg.m; }
        const swapUsd = Math.abs(lv.hype * p - (def.hedge ? total * (1 - MARGIN) : total) / 2);
        const c = swapUsd * (S.FEE[i] + SLIP) + GAS; recCost += c; total -= c;
        open(total, sqrt, t); if (def.hedge) resize(lpValue(sqrt).hype, p);
      }
    }
  }
  while (di < days.length) { curve.push(equity(S.SQ[S.n - 1])); di++; }
  lpFees += pos ? lpValue(S.SQ[S.n - 1]).fees : 0;
  return { curve, opens, lpFees, recCost, hedgeCost, fund, trades, minRatio, liquidated };
}

// ---- grid and report ----
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const ann = (r, d) => (1 + r) ** (365 / d) - 1;
function stats(curve, a, b) { const r = curve[b] / curve[a] - 1; let pk = curve[a], dd = 0; for (let i = a; i <= b; i++) { pk = Math.max(pk, curve[i]); dd = Math.min(dd, curve[i] / pk - 1); } return { r, dd }; }

const data = {}; for (const p of Object.keys(POOLS)) if (readdirSync(DIR).some((f) => f.startsWith(`${p}.`) && f.endsWith(".csv"))) data[p] = loadSwaps(p);
const hevPools = ["px05", "px30"].filter((p) => data[p]);
const t0 = Math.ceil(Math.max(...hevPools.map((p) => data[p].T[0])) / 86400) * 86400 + 86400;
const t1 = Math.floor(Math.min(...hevPools.map((p) => data[p].T[data[p].n - 1])) / 86400) * 86400;
const days = []; for (let t = t0; t <= t1; t += 86400) days.push(t);
const D = days.length - 1, split = Math.round((D * 2) / 3);
const rates = await funding(t0 - 7200);
const lend = await lending(t0, t1);

const grid = [];
for (const pool of hevPools) for (const pctW of [2, 5, 10, 20, 40, 80]) for (const rule of ["edge", "out", "never"]) for (const cool of rule === "never" ? [0] : [6, 24]) for (const hedge of [0, 1])
  grid.push({ pool, pct: pctW, rule, cool, hedge });
const res = grid.map((def) => ({ def, ...run(data[def.pool], def, rates, days) }));

// HYPE price path, for context
const px = data.px05; const pAt = (t) => { let lo = 0, hi = px.n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (px.T[m] <= t) lo = m; else hi = m; } return priceOfSqrt(px.SQ[lo]); };
const hype = days.map(pAt);
const lendCurve = (k) => { const v = lend.map((x) => x[k]); const first = v.findIndex((x) => x); return v.map((x, i) => (x && first >= 0 ? (STAKE * x) / v[first] : NaN)); };
const felix = lendCurve("fx"), hyperlend = lendCurve("hl");

const name = (d) => `${POOLS[d.pool].label} ±${d.pct}%, ${d.rule === "edge" ? "recentre near edge" : d.rule === "out" ? "recentre when out" : "never recentre"}${d.cool ? ` (min ${d.cool}h)` : ""}${d.hedge ? ", hedged" : ""}`;
const row = (x) => { const tr = stats(x.curve, 0, split), te = stats(x.curve, split, D), all = stats(x.curve, 0, D);
  return { x, tr, te, all, line: `| ${name(x.def)} | ${pct(ann(tr.r, split))} | ${pct(ann(te.r, D - split))} | ${pct(te.dd)} | ${pct(all.r)} | ${x.opens} | $${x.lpFees.toFixed(0)} / $${(x.recCost + x.hedgeCost).toFixed(0)}${x.def.hedge ? ` / funding $${x.fund.toFixed(0)}` : ""} | ${x.def.hedge ? (x.liquidated ? "LIQUIDATED" : `min margin ${(x.minRatio * 100).toFixed(0)}%`) : ""} |` }; };
const rows = res.map(row);
const hedged = rows.filter((r) => r.x.def.hedge && !r.x.liquidated).sort((a, b) => b.tr.r - a.tr.r);
const unhedged = rows.filter((r) => !r.x.def.hedge).sort((a, b) => b.tr.r - a.tr.r);
const iso = (t) => new Date(t * 1000).toISOString().slice(0, 10);
const lendLine = (nm, c) => { const ok = (i) => Number.isFinite(c[i]); const a = c.findIndex((_, i) => ok(i)); if (a < 0) return `| ${nm} | no data | | | | | | |`;
  const trR = ok(split) ? c[split] / c[a] - 1 : NaN, teR = c[D] / c[Math.max(a, split)] - 1; return `| ${nm} | ${pct(ann(trR, split - a))} | ${pct(ann(teR, D - Math.max(a, split)))} | 0.0% | ${pct(c[D] / c[a] - 1)} | | | |`; };
const head = `| Strategy | Choose window, a year | Check window, a year | Check worst drop | Whole window | Ranges | LP fees / costs | Hedge |\n|---|---|---|---|---|---|---|---|`;
const md = [
  `# Junior backtest`, ``,
  `Every swap in the Project X $HYPE/USDC pools from ${iso(days[0])} to ${iso(days[D])} (${D} days), replayed for ${grid.length} strategies with $${STAKE} each, valued in USDC. Strategies are ranked on the choose window (${iso(days[0])} to ${iso(days[split])}) and judged on the check window (${iso(days[split])} to ${iso(days[D])}), which the ranking never saw. A year figures scale a short window up and are estimates, not yields anyone should expect.`, ``,
  `$HYPE went from $${hype[0].toFixed(2)} to $${hype[split].toFixed(2)} in the choose window and to $${hype[D].toFixed(2)} by the end.`, ``,
  `## USDC lending, the bar to beat`, ``, head, lendLine("Felix USDC", felix), lendLine("HyperLend USDC", hyperlend), ``,
  `## Hedged (no $HYPE price bet), best 15 by the choose window`, ``, head, ...hedged.slice(0, 15).map((r) => r.line), ``,
  `## Unhedged (carries the $HYPE price), best 10 by the choose window`, ``, head, ...unhedged.slice(0, 10).map((r) => r.line), ``,
  `Hedged lines the hedge would have liquidated: ${rows.filter((r) => r.x.liquidated).length} of ${rows.filter((r) => r.x.def.hedge).length}.`, ``,
  `Method: fees per swap at our share of the pool's liquidity while in range (the pool's own formula). Each recentre closes at the pool price, pays the pool fee plus 0.05% slippage on the swap back to 50/50 and $0.05 gas. Hedged lines keep 1/6 as Hypercore margin for a $HYPE short sized to the LP's $HYPE, resized hourly when 5% off at the 0.045% taker fee, with Hypercore's real hourly funding; liquidated if margin falls under 5% of the short. Not charged: basis between Hypercore and the pool, and moving USDC between HyperEVM and Hypercore. Our own liquidity is assumed not to change other traders' behaviour. Source: keeper/scripts/btSim.mjs.`, ``,
].join("\n");
writeFileSync(OUT, md); writeFileSync(`${DIR}/results.json`, JSON.stringify(rows.map((r) => ({ def: r.x.def, name: name(r.x.def), tr: r.tr, te: r.te, all: r.all, opens: r.x.opens, lpFees: r.x.lpFees, costs: r.x.recCost + r.x.hedgeCost, fund: r.x.fund, liq: r.x.liquidated, curve: r.x.curve }))));
console.log(md);
