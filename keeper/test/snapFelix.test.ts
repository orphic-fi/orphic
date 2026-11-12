import { decodeFunctionData, type Address, type Hex, type PublicClient } from "viem";
import { describe, expect, it } from "vitest";
import { juniorAbi } from "../src/abi/junior.js";
import { felixLossUnbilled, snapFelix } from "../src/exec/junior.js";
import type { TxSigner } from "../src/exec/signer.js";
import { cfg } from "./helpers.js";

const JUNIOR = "0x2000000000000000000000000000000000000001" as Address;
const FELIX = "0x8A862fD6c12f9ad34C9c2ff45AB2b6712e8CEa27" as Address;
const UNIT = 10n ** 24n;

function setup(v: { seniorSupply?: bigint; lost?: bigint; lostBase?: bigint; fraction?: bigint; assetsRef?: bigint; preFix?: boolean }) {
  const c = cfg();
  c.junior = JUNIOR;
  const sends: string[] = [];
  const client = {
    call: async () => ({ data: "0x" }),
    readContract: async (a: { functionName: string; args?: bigint[] }) => {
      switch (a.functionName) {
        case "felixExpSupply": if (v.preFix) throw new Error("reverted"); return 0n;
        case "totalSupply": return v.seniorSupply ?? 316n * 10n ** 18n;
        case "felixExp":
          if (a.args![0] !== 0n) throw new Error("out of bounds");
          return [FELIX, v.lostBase ?? 0n, v.fraction ?? UNIT / 2n, v.assetsRef ?? 316_000_000n];
        case "lostAssets": return v.lost ?? 0n;
        default: throw new Error(`unexpected ${a.functionName}`);
      }
    },
  } as unknown as PublicClient;
  const signer: TxSigner = {
    address: "0x3000000000000000000000000000000000000003",
    async send(tx) {
      sends.push(decodeFunctionData({ abi: juniorAbi, data: tx.data }).functionName);
      return ("0x" + "ef".repeat(32)) as Hex;
    },
  };
  return { sends, ctx: { cfg: c, dryRun: false, client, signer, log: () => undefined } };
}

describe("K3 Felix snapshot", () => {
  it("1 ppm guard: (lost - lostBase) * fraction / 1e24 * 1e6 > assetsRef", () => {
    const e = { lostBase: 0n, fraction: UNIT, assetsRef: 1_000_000_000n, lost: 1_000n };
    expect(felixLossUnbilled([{ ...e, lost: 1_001n }])).toBe(true);
    expect(felixLossUnbilled([{ ...e, lost: 1_000n }])).toBe(false); // strict: equality is not above the guard
    expect(felixLossUnbilled([{ ...e, lost: 5n, lostBase: 9n }])).toBe(false); // lost below base
    expect(felixLossUnbilled([{ ...e, lost: 1n }, { ...e, lost: 5_000n }])).toBe(true); // any entry
  });

  it("is taken every tick when there is no booked loss (Felix rounding dust does not block it)", async () => {
    const { sends, ctx } = setup({ lost: 1n });
    const r = await snapFelix(ctx);
    expect(r.called).toBe(true);
    expect(sends).toEqual(["snapFelixExposure"]);
  });

  it("is skipped while a Felix loss is booked and unbilled", async () => {
    const { sends, ctx } = setup({ lost: 1_000_000n, lostBase: 1n, fraction: UNIT / 2n, assetsRef: 316_000_000n });
    const r = await snapFelix(ctx);
    expect(r.called).toBe(false);
    expect(r.note).toMatch(/booked and unbilled/);
    expect(sends).toEqual([]);
  });

  it("waits for funded senior, then takes the first snapshot", async () => {
    const unfunded = setup({ seniorSupply: 0n });
    expect((await snapFelix(unfunded.ctx)).note).toMatch(/not funded/);
    expect(unfunded.sends).toEqual([]);
    const funded = setup({ seniorSupply: 5n * 10n ** 18n });
    expect((await snapFelix(funded.ctx)).called).toBe(true);
  });

  it("dry-run sends nothing; a pre-fix junior is skipped with a note", async () => {
    const d = setup({});
    const r = await snapFelix({ ...d.ctx, dryRun: true });
    expect(r.note).toMatch(/dry-run/);
    expect(d.sends).toEqual([]);
    expect((await snapFelix(setup({ preFix: true }).ctx)).note).toMatch(/pre-fix/);
  });
});
