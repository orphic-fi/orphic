// Yield scanner for Orphic. Pulls every public source we know for the three Hyperliquid chains (HyperEVM 999,
// Elysium 99901, Hypercore), ranks what could take USDC, diffs against the last scan, and writes a dated memo to
// ops/yield-scan/. It never changes an allowlist: a new entry that clears the bar is something to review, with
// Cashout's signature on any change. Rates are what the sources report at scan time; all of them are estimates.
//
// Sources: DefiLlama yields (yields.llama.fi) and protocols (api.llama.fi), Merkl live campaigns (api.merkl.xyz),
// Circuit's pool index (circuit data pools, run as the circuit user), and our own venue reads are left to the keeper.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT_DIR = "/home/claude/orphic/ops/yield-scan";
const LAST = `${OUT_DIR}/last.json`;
const CHAINS = { "Hyperliquid L1": 999, "Elysium Kinetiq": 99901, Hypercore: "hypercore" };
const USDC = { 999: "0xb88339cb7199b77e23db6e890353e22632ba630f", 99901: "0xb47c4c8f73f009cc0c0d3f92b388d13e293f0b65" };
// The bar for a USDC venue to be worth a review: real size, a rate above our current lenders, a known project.
const BAR = { minTvlUsd: 1_000_000, minApyOverFelixPts: 0.5 };
// What we already use or have reviewed; new names outside this list are flagged.
const KNOWN = new Set(["morpho-blue", "morpho-v2", "felix", "felix-cdp", "hyperlend-pooled", "hyperlend-isolated", "hyperliquid-hlp", "hyperliquid-earn", "nest-cl", "nest-avr", "project-x", "metric-v1", "uniswap-v4", "uniswap-v3", "kinetiq-khype", "sthype"]);

const j = async (url) => { const r = await fetch(url, { headers: { accept: "application/json" } }); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };
const fmt = (n, d = 0) => n === null || n === undefined || Number.isNaN(n) ? "-" : Number(n).toLocaleString("en-US", { maximumFractionDigits: d });
const pct = (n) => n === null || n === undefined ? "-" : `${Number(n).toFixed(2)}%`;

async function llamaYields() {
  const { data } = await j("https://yields.llama.fi/pools");
  return data.filter((p) => p.chain in CHAINS).map((p) => ({
    id: p.pool, chain: p.chain, project: p.project, symbol: p.symbol, tvl: p.tvlUsd ?? 0, apy: p.apy ?? null, apyBase: p.apyBase ?? null,
    apyReward: p.apyReward ?? null, stable: !!p.stablecoin, exposure: p.exposure, il: p.ilRisk, underlying: p.underlyingTokens ?? [],
  }));
}
async function llamaProtocols() {
  const all = await j("https://api.llama.fi/protocols");
  return all.filter((p) => (p.chains || []).some((c) => c in CHAINS)).map((p) => ({
    slug: p.slug, name: p.name, category: p.category, chains: p.chains.filter((c) => c in CHAINS),
    tvl: Object.fromEntries(Object.entries(p.chainTvls || {}).filter(([c]) => c in CHAINS).map(([c, v]) => [c, Math.round(v)])),
    listedAt: p.listedAt ?? null,
  }));
}
async function merkl(chainId) {
  try {
    const rows = await j(`https://api.merkl.xyz/v4/opportunities?chainId=${chainId}&status=LIVE&items=100`);
    return rows.map((o) => ({ id: o.id, chainId, protocol: o.protocol?.name ?? "-", name: o.name, type: o.type, apr: o.apr ?? null, tvl: o.tvlUsd ?? 0, daily: o.dailyRewards ?? 0 }));
  } catch (e) { return [{ id: `merkl-${chainId}-error`, chainId, protocol: "-", name: `Merkl read failed: ${e.message}`, type: "-", apr: null, tvl: 0, daily: 0 }]; }
}
function circuitPools(chainId) {
  // Top USDC-quoted pools by 24h volume, from Circuit's index. Runs as the circuit user, where the CLI is signed in.
  const q = JSON.stringify({ network: `ethereum:${chainId}`, address: USDC[chainId] });
  const cmd = `export NODE_EXTRA_CA_CERTS=/home/circuit/ca-bundle.crt SSL_CERT_FILE=/home/circuit/ca-bundle.crt; cd ~/orphic-ranger && timeout 120 circuit data pools --network ethereum:${chainId} --quote-token '${q}' --created-within-ms 7776000000 --sort-by volumeUsd --limit 12 --lookback-ms 86400000 --json`;
  try {
    const out = execFileSync("sudo", ["-u", "circuit", "-H", "bash", "-c", cmd], { encoding: "utf8", timeout: 150_000 });
    const d = JSON.parse(out);
    const rows = Array.isArray(d) ? d : d.data || d.rows || d.pools || [];
    return rows.map((r) => {
      const vol = Number(r.volumeUsd || 0), liq = Number(r.liquidityUsd || 0);
      return { id: r.pool, chainId, protocol: r.protocol, label: r.label, address: String(r.pool).split("|")[1] ?? r.pool, vol, liq, trades: r.tradeCount ?? null, turnover: liq > 0 ? vol / liq : null, createdAt: r.createdAt };
    });
  } catch (e) { return [{ id: `circuit-${chainId}-error`, chainId, protocol: "-", label: `Circuit read failed: ${String(e.message).split("\n")[0].slice(0, 120)}`, address: "", vol: 0, liq: 0, trades: null, turnover: null }]; }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const now = new Date();
  const stamp = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  const last = existsSync(LAST) ? JSON.parse(readFileSync(LAST, "utf8")) : null;

  const [yields, protocols, merkl999, merkl99901] = await Promise.all([llamaYields(), llamaProtocols(), merkl(999), merkl(99901)]);
  const pools999 = circuitPools(999), pools99901 = circuitPools(99901);

  // Reference rates from the sources themselves, so the bar moves with the market.
  const felix = yields.find((p) => p.project === "morpho-blue" && /FEUSDC/i.test(p.symbol));
  const felixApy = felix?.apy ?? null;
  const hlp = yields.find((p) => p.project === "hyperliquid-hlp");

  // Candidates: anything single-asset and stable, or USDC-named, on our chains.
  const usdc = yields.filter((p) => p.stable && p.exposure === "single" && /USDC|USD₮0|USDT0|USDE|USDH/i.test(p.symbol)).sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0));
  const clears = usdc.filter((p) => p.tvl >= BAR.minTvlUsd && felixApy !== null && (p.apy ?? 0) >= felixApy + BAR.minApyOverFelixPts);
  const lps = yields.filter((p) => p.exposure === "multi" && /USDC|USD₮0|USDT0/i.test(p.symbol)).sort((a, b) => b.tvl - a.tvl).slice(0, 12);

  // Diff against the last scan.
  const lastIds = new Set(last?.yieldIds ?? []);
  const lastProtocols = new Set(last?.protocols ?? []);
  const lastMerkl = new Set(last?.merklIds ?? []);
  const newPools = last ? yields.filter((p) => !lastIds.has(p.id) && p.tvl >= 100_000) : [];
  const newProtocols = last ? protocols.filter((p) => !lastProtocols.has(p.slug)) : [];
  const newMerkl = last ? [...merkl999, ...merkl99901].filter((m) => !lastMerkl.has(m.id)) : [];
  const unknownUsdc = usdc.filter((p) => !KNOWN.has(p.project) && p.tvl >= 250_000);

  const notable = [];
  for (const p of clears) notable.push(`USDC venue clears the bar: ${p.project} ${p.symbol} on ${p.chain}, ${pct(p.apy)} on $${fmt(p.tvl)} TVL${KNOWN.has(p.project) ? "" : " (not on our list)"}`);
  for (const p of newProtocols) notable.push(`New protocol on our chains: ${p.name} (${p.category}) ${Object.entries(p.tvl).map(([c, v]) => `${c} $${fmt(v)}`).join(", ")}`);
  for (const m of newMerkl) notable.push(`New Merkl campaign on ${m.chainId}: ${m.protocol} ${m.name}, ${pct(m.apr)} APR, $${fmt(m.daily)}/day`);
  for (const p of newPools.filter((x) => x.stable)) notable.push(`New stable pool listed: ${p.project} ${p.symbol} on ${p.chain}, ${pct(p.apy)} on $${fmt(p.tvl)}`);

  const L = [];
  L.push(`# Yield scan ${stamp}`);
  L.push("");
  L.push(`Sources read at scan time: DefiLlama yields and protocols, Merkl live campaigns (999, 99901), Circuit pool index (24h). Every rate is the source's own figure now; none is a promise. Bar for a USDC venue to be reviewed: TVL at least $${fmt(BAR.minTvlUsd)} and APY at least ${BAR.minApyOverFelixPts} points over Felix USDC (${pct(felixApy)} now). HLP 30-day: ${pct(hlp?.apy)} on $${fmt(hlp?.tvl)}.`);
  L.push("");
  L.push(`## Notable since last scan${last ? ` (${last.stamp})` : " (first scan, no diff)"}`);
  L.push(notable.length ? notable.map((n) => `- ${n}`).join("\n") : "- Nothing new cleared the bar.");
  L.push("");
  L.push("## USDC and stable single-asset venues on HyperEVM, Elysium, Hypercore");
  L.push("| project | symbol | chain | APY | base | reward | TVL | on list |");
  L.push("|---|---|---|---|---|---|---|---|");
  for (const p of usdc.slice(0, 30)) L.push(`| ${p.project} | ${p.symbol} | ${p.chain} | ${pct(p.apy)} | ${pct(p.apyBase)} | ${pct(p.apyReward)} | $${fmt(p.tvl)} | ${KNOWN.has(p.project) ? "yes" : "no"} |`);
  L.push("");
  L.push("## USDC LP pools (DefiLlama, fee APY is the source's trailing figure, not ours)");
  L.push("| project | pair | chain | APY | TVL | IL |");
  L.push("|---|---|---|---|---|---|");
  for (const p of lps) L.push(`| ${p.project} | ${p.symbol} | ${p.chain} | ${pct(p.apy)} | $${fmt(p.tvl)} | ${p.il ?? "-"} |`);
  L.push("");
  for (const [label, rows] of [["HyperEVM", pools999], ["Elysium", pools99901]]) {
    L.push(`## USDC-quoted pools by 24h volume on ${label} (Circuit index)`);
    L.push("| protocol | pair | address | 24h volume | liquidity | turnover | trades |");
    L.push("|---|---|---|---|---|---|---|");
    for (const r of rows) L.push(`| ${r.protocol} | ${r.label} | ${r.address} | $${fmt(r.vol)} | $${fmt(r.liq)} | ${r.turnover === null ? "-" : `${r.turnover.toFixed(1)}x`} | ${r.trades ?? "-"} |`);
    L.push("");
  }
  L.push("## Merkl live campaigns");
  L.push("| chain | protocol | campaign | APR | TVL | rewards/day |");
  L.push("|---|---|---|---|---|---|");
  for (const m of [...merkl999, ...merkl99901]) L.push(`| ${m.chainId} | ${m.protocol} | ${m.name} | ${pct(m.apr)} | $${fmt(m.tvl)} | $${fmt(m.daily)} |`);
  L.push("");
  L.push("## Protocols DefiLlama lists on our chains");
  L.push("| protocol | category | TVL by chain |");
  L.push("|---|---|---|");
  for (const p of protocols.sort((a, b) => Object.values(b.tvl).reduce((x, y) => x + y, 0) - Object.values(a.tvl).reduce((x, y) => x + y, 0)))
    L.push(`| ${p.name} | ${p.category} | ${Object.entries(p.tvl).map(([c, v]) => `${c} $${fmt(v)}`).join(", ") || "-"} |`);
  L.push("");
  if (unknownUsdc.length) {
    L.push("## Stable venues not on our list with at least $250k (for review, not for use)");
    for (const p of unknownUsdc) L.push(`- ${p.project} ${p.symbol} on ${p.chain}: ${pct(p.apy)} on $${fmt(p.tvl)}`);
    L.push("");
  }

  const day = stamp.slice(0, 10), hour = stamp.slice(11, 13);
  const file = `${OUT_DIR}/${day}T${hour}.md`;
  writeFileSync(file, L.join("\n") + "\n");
  writeFileSync(LAST, JSON.stringify({ stamp, yieldIds: yields.map((p) => p.id), protocols: protocols.map((p) => p.slug), merklIds: [...merkl999, ...merkl99901].map((m) => m.id), felixApy, notable }, null, 1));
  console.log(JSON.stringify({ file, notable, felixApy, usdcCount: usdc.length, protocols: protocols.length }, null, 1));
}
main().catch((e) => { console.error("scan failed:", e.message); process.exit(1); });
