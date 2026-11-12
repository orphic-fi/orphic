import { decodeFunctionData, parseAbi, type Address, type Hex, type PublicClient } from "viem";
import { describe, expect, it, vi } from "vitest";
import { juniorAbi } from "../src/abi/junior.js";
import { feeRouterAbi } from "../src/abi/feeRouter.js";
import { SETTLE_INTERVAL } from "../src/exec/junior.js";
import type { TxSigner } from "../src/exec/signer.js";
import { run } from "../src/index.js";
import { cfg, fakeFetch, stateAtTarget } from "./helpers.js";

vi.mock("../src/data/state.js", async (orig) => {
  const m = (await orig()) as Record<string, unknown>;
  const h = await import("./helpers.js");
  return { ...m, readVaultState: async () => h.stateAtTarget() };
});

const U = 1_000_000n;
const JUNIOR = "0x2000000000000000000000000000000000000001" as Address;
const ROUTER = "0x4000000000000000000000000000000000000004" as Address;
const AGENT = "0x3000000000000000000000000000000000000003" as Address;
const LAST = 1_700_000_000n;
const DUE = LAST + SETTLE_INTERVAL;
const erc4626 = parseAbi(["function withdraw(uint256,address,address)", "function deposit(uint256,address)"]);
const morphoW = parseAbi(["function withdraw((address,address,address,address,uint256),uint256,uint256,address,address) returns (uint256,uint256)"]);

/** One whole keeper tick against a fake chain. `fail` makes one signed call revert. */
async function tick(v: { nowTs: bigint; fail?: "touch" | "market" | "settle" }) {
  const c = cfg();
  c.junior = JUNIOR;
  c.feeRouter = ROUTER;
  const felix = c.felix.address.toLowerCase();
  const senior = (c.vault as string).toLowerCase();
  const sends: string[] = [];
  let clock = v.nowTs;
  const client = {
    call: async () => ({ data: "0x" }),
    getGasPrice: async () => 1_000_000_000n,
    getBlock: async () => ({ timestamp: clock }),
    readContract: async (a: { address: string; functionName: string; args?: unknown[] }) => {
      const addr = a.address.toLowerCase();
      switch (a.functionName) {
        case "maxRate": return BigInt(c.expectedMaxRate);
        case "liquidityAdapter": return c.felixAdapter;
        case "lastSettle": return LAST;
        case "pendingExitShares": return 0n;
        case "pricePerShare": return 10n ** 18n;
        case "balanceOf":
          if (addr === felix) return 50n * U;
          if (addr === senior) return 0n;
          if (addr === ROUTER.toLowerCase()) return 3n * U;
          return 1000n * U; // junior idle
        case "totalParked": return 0n;
        case "reservedAssets": return 0n;
        case "carryOwed": return 0n;
        case "maxWithdraw": return 50n * U;
        case "convertToAssets": return 50n * U;
        case "allowance": return 10n ** 18n;
        case "totalAssets": return 316n * U;
        case "totalSupply": return 316n * 10n ** 18n;
        case "seniorSupplyBase": return 316n * 10n ** 18n;
        case "seniorSupplyMin": return 316n * 10n ** 18n;
        case "felixExpSupply": return 0n;
        case "felixExp": throw (await import("./errs.js")).emptyRevert();
        case "lastUpdate": return BigInt(Math.floor(Date.now() / 1000));
        case "accrueInterestView": return [0n, 0n, 0n];
        case "coverInProgress": return 0n;
        case "marketsLength": return 1n;
        case "marketAssets": return 30n * U;
        case "markets": return [AGENT, AGENT, AGENT, AGENT, 1n];
        case "market": return [1000n * U, 1000n * U, 100n * U, 100n * U, 0n, 0n];
        default: throw new Error(`unexpected read ${a.functionName}`);
      }
    },
  } as unknown as PublicClient;
  const signer: TxSigner = {
    address: AGENT,
    async send(tx) {
      let what = "?";
      try {
        const o = decodeFunctionData({ abi: [...juniorAbi, ...feeRouterAbi] as never, data: tx.data }) as { functionName: string; args?: unknown[] };
        if (o.functionName === "execute") {
          const [target, data] = o.args as [Address, Hex];
          if (target.toLowerCase() === c.felix.address.toLowerCase()) {
            const d = decodeFunctionData({ abi: erc4626, data }) as unknown as { functionName: string; args: unknown[] };
            what = d.functionName === "deposit" ? "FELIX-DEPOSIT" : d.args[0] === 0n ? "touch" : "felix-withdraw";
          } else if (target.toLowerCase() === c.morphoBlue.toLowerCase()) {
            decodeFunctionData({ abi: morphoW, data });
            what = "market-withdraw";
          } else what = "execute-other"; // an approve to Felix
        } else what = o.functionName;
      } catch { what = "unknown"; }
      if ((v.fail === "touch" && what === "touch") || (v.fail === "market" && what === "market-withdraw") || (v.fail === "settle" && what === "settle")) throw new Error(`reverted: ${what}`);
      sends.push(what);
      return ("0x" + "34".repeat(32)) as Hex;
    },
  };
  const report = await run(
    { dryRun: false, weekly: false, configPath: "n/a", opsDir: undefined, rpcUrl: "x", agentPrivateKey: undefined, now: new Date(Number(v.nowTs) * 1000) },
    c,
    { client, signer, fetchFn: fakeFetch(), log: () => undefined, sleep: async (ms) => { clock += BigInt(Math.round(ms / 1000)); } },
  );
  return { report, sends };
}
void stateAtTarget;

describe("settle tick through run(): a failing tick never redeploys what it recalled", () => {
  it("control: an ordinary tick DOES redeploy idle to Felix (so the checks below can fail)", async () => {
    const { sends } = await tick({ nowTs: DUE - 7200n });
    expect(sends).toContain("FELIX-DEPOSIT");
  });

  it("normal settle tick: touch, recall, settle, and only then snapshot and distribute; no redeploy", async () => {
    const { sends, report } = await tick({ nowTs: DUE - 60n });
    expect(sends).toEqual(["touch", "felix-withdraw", "market-withdraw", "settle", "distribute", "snapFelixExposure"]);
    expect(report.error).toBeUndefined();
    expect(report.alerts).toEqual([]);
  });

  for (const fail of ["touch", "market", "settle"] as const) {
    it(`a ${fail} failure: no redeploy, no snapshot or distribute, and the run is red`, async () => {
      const { sends, report } = await tick({ nowTs: DUE - 60n, fail });
      expect(sends).not.toContain("FELIX-DEPOSIT");
      expect(sends).not.toContain("execute-other");
      expect(sends).not.toContain("snapFelixExposure");
      expect(sends).not.toContain("distribute");
      expect(report.juniorIdle?.action).toBe("skipped");
      expect(report.juniorWeekly?.settleDue).toBe(true);
      expect(report.error).toMatch(/settle (tick )?failed/);
      expect(report.alerts.length).toBeGreaterThan(0);
    });
  }
});
