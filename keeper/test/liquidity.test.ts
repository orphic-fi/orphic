import { decodeFunctionData, parseAbi, type Address, type Hex, type PublicClient } from "viem";
import { describe, expect, it } from "vitest";
import { juniorAbi } from "../src/abi/junior.js";
import { ensureLiquidity, reserveFor, type IdleInputs } from "../src/exec/juniorDeploy.js";
import type { TxSigner } from "../src/exec/signer.js";
import { cfg } from "./helpers.js";

const U = 1_000_000n;
const JUNIOR = "0x2000000000000000000000000000000000000001" as Address;
const AGENT = "0x3000000000000000000000000000000000000003" as Address;
const redeemAbi = parseAbi(["function redeem(uint256,address,address)"]);

function setup(v: { idle: bigint; reserved?: bigint; carry?: bigint | "absent"; seniorShares?: bigint }) {
  const c = cfg();
  c.junior = JUNIOR;
  const felix = c.felix.address.toLowerCase();
  const senior = (c.vault as string).toLowerCase();
  const sends: string[] = [];
  const client = {
    call: async () => ({ data: "0x" }),
    readContract: async (a: { address: string; functionName: string }) => {
      const addr = a.address.toLowerCase();
      switch (a.functionName) {
        case "balanceOf": return addr === felix ? 50n * U : addr === senior ? v.seniorShares ?? 0n : v.idle;
        case "reservedAssets": return v.reserved ?? 0n;
        case "carryOwed": if (v.carry === "absent") throw new Error("reverted"); return v.carry ?? 0n;
        case "maxWithdraw": return 50n * U;
        case "convertToAssets": return 50n * U;
        case "marketsLength": return 1n;
        case "marketAssets": return 30n * U;
        case "markets": return [AGENT, AGENT, AGENT, AGENT, 1n];
        case "position": return [30n * U, 0n, 0n];
        case "market": return [1000n * U, 1000n * U, 100n * U, 100n * U, 0n, 0n];
        default: throw new Error(`unexpected ${a.functionName}`);
      }
    },
  } as unknown as PublicClient;
  const signer: TxSigner = {
    address: AGENT,
    async send(tx) {
      const outer = decodeFunctionData({ abi: juniorAbi, data: tx.data });
      const [target, data] = outer.args as unknown as [Address, Hex];
      if (target.toLowerCase() === felix) sends.push("felix");
      else if (target.toLowerCase() === senior) sends.push(`senior-redeem ${decodeFunctionData({ abi: redeemAbi, data }).args![0]}`);
      else sends.push("market");
      return ("0x" + "cd".repeat(32)) as Hex;
    },
  };
  return { sends, ctx: { cfg: c, dryRun: false, client, signer, log: () => undefined } };
}

describe("K2 liquidity", () => {
  it("does nothing while idle covers reservedAssets + carryOwed", async () => {
    const { sends, ctx } = setup({ idle: 100n * U, reserved: 60n * U, carry: 40n * U });
    const r = await ensureLiquidity(ctx);
    expect(r.short).toBe(false);
    expect(sends).toEqual([]);
  });

  it("recalls Felix, every market AND the senior fee shares when idle is below reserved + carry", async () => {
    const { sends, ctx } = setup({ idle: 99n * U, reserved: 60n * U, carry: 40n * U, seniorShares: 13n });
    const r = await ensureLiquidity(ctx);
    expect(r.short).toBe(true);
    expect(sends).toEqual(["felix", "market", "senior-redeem 13"]);
  });

  it("carry alone triggers it, and a pre-fix junior without carryOwed counts as no debt", async () => {
    expect((await ensureLiquidity(setup({ idle: 10n * U, carry: 11n * U }).ctx)).short).toBe(true);
    expect((await ensureLiquidity(setup({ idle: 10n * U, carry: "absent" }).ctx)).short).toBe(false);
  });

  it("dry-run sends nothing but names every venue it would recall", async () => {
    const { sends, ctx } = setup({ idle: 1n * U, reserved: 60n * U, seniorShares: 13n });
    const r = await ensureLiquidity({ ...ctx, dryRun: true });
    expect(sends).toEqual([]);
    expect(r.recall!.steps.map((s) => s.split(":")[0])).toEqual(["Felix", "market 0", "senior fee shares"]);
  });

  it("the idle reserve keeps what junior owes senior, so the hourly redeploy never takes it", () => {
    const i: IdleInputs = { idle: 100n * U, reserved: 0n, carryOwed: 90n * U, owedToMaturing: 0n, seniorAssets: 316n * U, felixAssets: 0n, felixWithdrawable: 0n, allowance: 0n };
    expect(reserveFor(i)).toBe(90n * U);
  });
});
