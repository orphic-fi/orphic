// Daily Felix USDC price per share and HyperLend USDC liquidity index over the past 370 days. Read-only.
import { createPublicClient, http, parseAbi } from "viem";
import { writeFileSync } from "node:fs";
const hev = createPublicClient({ transport: http("https://hyperliquid.drpc.org", { retryCount: 6 }) });
const head = await hev.getBlock(); const H = Number(head.number);
const pts = [[H, Number(head.timestamp)]];
for (let k = 1; k <= 40; k++) { const n = H - k * 1000000; if (n < 1) break; const b = await hev.getBlock({ blockNumber: BigInt(n) }); pts.unshift([n, Number(b.timestamp)]); }
const blockAt = (t) => { for (let i = 1; i < pts.length; i++) if (pts[i][1] >= t) { const [b0, s0] = pts[i - 1], [b1, s1] = pts[i]; return Math.round(b0 + ((t - s0) * (b1 - b0)) / (s1 - s0)); } return H; };
const felixAbi = parseAbi(["function convertToAssets(uint256) view returns (uint256)"]);
const hlAbi = parseAbi(["function getReserveData(address) view returns ((uint256,uint128,uint128,uint128,uint128,uint128,uint40,uint16,address,address,address,address,uint128,uint128,uint128))"]);
const rows = []; const t1 = Math.floor(Number(head.timestamp) / 86400) * 86400;
for (let t = t1 - 370 * 86400; t <= t1; t += 86400) {
  const b = BigInt(blockAt(t)); let fx = null, hl = null;
  try { fx = Number(await hev.readContract({ address: "0x8A862fD6c12f9ad34C9c2ff45AB2b6712e8CEa27", abi: felixAbi, functionName: "convertToAssets", args: [10n ** 18n], blockNumber: b })); } catch {}
  try { hl = Number((await hev.readContract({ address: "0x00A89d7a5A02160f20150EbEA7a2b5E4879A1A8b", abi: hlAbi, functionName: "getReserveData", args: ["0xb88339CB7199b77E23DB6E890353E22632Ba630f"], blockNumber: b }))[1]); } catch {}
  rows.push({ t, fx, hl });
}
writeFileSync("/home/claude/bt/lending365.json", JSON.stringify(rows));
console.log(rows.length, rows.filter((r) => r.fx).length, rows.filter((r) => r.hl).length, new Date(rows[0].t * 1000).toISOString());
