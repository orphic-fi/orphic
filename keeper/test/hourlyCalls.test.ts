import { decodeFunctionData, type Address, type Hex, type PublicClient } from "viem";
import { describe, expect, it } from "vitest";
import { juniorAbi } from "../src/abi/junior.js";
import { feeRouterAbi } from "../src/abi/feeRouter.js";
import { observeSenior, syncSenior } from "../src/exec/junior.js";
import { distributeFees } from "../src/exec/router.js";
import type { TxSigner } from "../src/exec/signer.js";
import { cfg } from "./helpers.js";

const JUNIOR = "0x2000000000000000000000000000000000000001" as Address;
const ROUTER = "0x4000000000000000000000000000000000000004" as Address;
const U = 1_000_000n;

function setup(v: { routerBal?: bigint; parked?: bigint; supply?: bigint; min?: bigint | "absent"; base?: bigint; nothingToDo?: boolean; router?: string }) {
  const c = cfg();
  c.junior = JUNIOR;
  c.feeRouter = (v.router ?? ROUTER) as Address;
  const sends: string[] = [];
  const client = {
    call: async () => {
      if (v.nothingToDo) throw new Error("reverted with NothingToDo()");
      return { data: "0x" };
    },
    readContract: async (a: { functionName: string }) => {
      switch (a.functionName) {
        case "balanceOf": return v.routerBal ?? 0n;
        case "totalParked": return v.parked ?? 0n;
        case "totalSupply": return v.supply ?? 100n;
        case "seniorSupplyMin": if (v.min === "absent") throw new Error("reverted"); return v.min ?? 100n;
        case "seniorSupplyBase": return v.base ?? 100n;
        default: throw new Error(`unexpected ${a.functionName}`);
      }
    },
  } as unknown as PublicClient;
  const signer: TxSigner = {
    address: "0x3000000000000000000000000000000000000003",
    async send(tx) {
      const names = [juniorAbi, feeRouterAbi].flatMap((abi) => {
        try { return [decodeFunctionData({ abi: abi as never, data: tx.data }).functionName as string]; } catch { return []; }
      });
      sends.push(names[0]!);
      return ("0x" + "12".repeat(32)) as Hex;
    },
  };
  return { sends, ctx: { cfg: c, dryRun: false, client, signer, log: () => undefined } };
}

describe("K4 distribute", () => {
  it("flushes unparked USDC every tick", async () => {
    const { sends, ctx } = setup({ routerBal: 3n * U });
    expect((await distributeFees(ctx)).called).toBe(true);
    expect(sends).toEqual(["distribute"]);
  });
  it("skips when everything held is parked, or nothing is held", async () => {
    for (const v of [{ routerBal: 3n * U, parked: 3n * U }, { routerBal: 0n }]) {
      const { sends, ctx } = setup(v);
      expect((await distributeFees(ctx)).called).toBe(false);
      expect(sends).toEqual([]);
    }
  });
  it("NothingToDo from a race is a skip, not a failure", async () => {
    const { ctx } = setup({ routerBal: 3n * U, nothingToDo: true });
    const r = await distributeFees(ctx);
    expect(r.called).toBe(false);
    expect(r.note).toMatch(/NothingToDo/);
  });
  it("dry-run and an unset router send nothing", async () => {
    const d = setup({ routerBal: 3n * U });
    expect((await distributeFees({ ...d.ctx, dryRun: true })).note).toMatch(/dry-run/);
    expect(d.sends).toEqual([]);
    expect((await distributeFees(setup({ routerBal: 3n * U, router: "0xTODO" }).ctx)).note).toMatch(/not configured/);
  });
});

describe("K4 observeSenior and syncSenior", () => {
  it("observes when senior's supply fell below the recorded minimum, not otherwise", async () => {
    const low = setup({ supply: 90n, min: 100n });
    expect((await observeSenior(low.ctx)).called).toBe(true);
    expect(low.sends).toEqual(["observeSenior"]);
    const same = setup({ supply: 100n, min: 100n });
    expect((await observeSenior(same.ctx)).called).toBe(false);
    expect(same.sends).toEqual([]);
  });
  it("a pre-fix junior is skipped with a note; dry-run sends nothing", async () => {
    expect((await observeSenior(setup({ min: "absent" }).ctx)).note).toMatch(/pre-fix/);
    const d = setup({ supply: 90n, min: 100n });
    expect((await observeSenior({ ...d.ctx, dryRun: true })).note).toMatch(/dry-run/);
    expect(d.sends).toEqual([]);
  });
  it("syncSenior is sent each tick that senior's supply moved, and skipped when unchanged", async () => {
    const moved = setup({ supply: 120n, base: 100n });
    expect((await syncSenior(moved.ctx)).called).toBe(true);
    expect(moved.sends).toEqual(["syncSenior"]);
    const same = setup({ supply: 100n, base: 100n });
    expect((await syncSenior(same.ctx)).called).toBe(false);
  });
});
