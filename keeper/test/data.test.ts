import { describe, expect, it } from "vitest";
import type { PublicClient } from "viem";
import { fetchMarketsFromApi, loadMorphoData, parseApiMarkets, perSecondWadToApy } from "../src/data/morpho.js";
import { fetchHyperlend, hyperlendUsdc, parseHyperlend } from "../src/data/hyperlend.js";
import { K62, UBTC, cfg, fakeFetch, fixture } from "./helpers.js";

describe("rule 1: market data", () => {
  it("parses the Morpho API response into MarketData with fractions and bigint lltv", async () => {
    const ms = await fetchMarketsFromApi(cfg(), fakeFetch());
    const k62 = ms.find((m) => m.id === K62)!;
    expect(k62.lltv).toBeCloseTo(0.625);
    expect(k62.params.lltv).toBe(625000000000000000n);
    expect(k62.params.loanToken.toLowerCase()).toBe(cfg().usdc.toLowerCase());
    expect(k62.collateralSymbol).toBe("kHYPE");
    expect(k62.supplyApy).toBeCloseTo(0.062);
    expect(k62.utilization).toBeCloseTo(0.8);
    expect(k62.source).toBe("api");
  });

  it("skips malformed items", () => {
    const items = fixture<{ data: { markets: { items: never[] } } }>("markets-api.json").data.markets.items as never[];
    const ms = parseApiMarkets([...items, { marketId: "0xdead", lltv: "1", irmAddress: "0x", loanAsset: { symbol: "", address: "" }, collateralAsset: null, oracle: null, state: null } as never]);
    expect(ms.length).toBe(items.length);
  });

  it("falls back to on-chain reads of market() and idToMarketParams() when the API fails", async () => {
    const c = cfg();
    const calls: string[] = [];
    const fakeClient = {
      readContract: async (args: { functionName: string; args?: unknown[] }) => {
        calls.push(args.functionName);
        switch (args.functionName) {
          case "idToMarketParams":
            return [c.usdc, "0xfD739d4e423301CE9385c1fb8850539D657C296D", "0x1111111111111111111111111111111111111111", "0xD4a426F010986dCad727e8dd6eed44cA4A9b7483", 625000000000000000n];
          case "market":
            return [10_000_000_000_000n, 1n, 8_000_000_000_000n, 1n, 0n, 0n];
          case "borrowRateView":
            // 7% per year, continuously compounded, as a per-second WAD rate
            return BigInt(Math.round((0.07 / (365 * 24 * 3600)) * 1e18));
          case "symbol":
            return "kHYPE";
          case "totalAssets":
            return 40_000_000_000_000n;
          default:
            throw new Error(`unexpected ${args.functionName}`);
        }
      },
    } as unknown as PublicClient;

    const res = await loadMorphoData(c, { fetchFn: fakeFetch({ failMarkets: true }), client: fakeClient, marketIds: [K62] });
    expect(res.warnings.some((w) => w.includes("on-chain fallback"))).toBe(true);
    expect(calls).toContain("market");
    expect(calls).toContain("idToMarketParams");
    const m = res.markets[0]!;
    expect(m.source).toBe("chain");
    expect(m.supplyAssets).toBeCloseTo(10_000_000);
    expect(m.utilization).toBeCloseTo(0.8);
    // supply APY = borrow APY * utilization; borrow APY from exp(0.07) - 1
    expect(m.supplyApy).toBeCloseTo((Math.exp(0.07) - 1) * 0.8, 6);
    // vault and price still came from the API
    expect(res.felix.source).toBe("api");
    expect(res.hypePriceUsd).toBeCloseTo(31.5);
    expect(res.hypePriceSource).toBe("api");
  });

  it("uses the config HYPE price when the API has none", async () => {
    const c = cfg();
    const f = fakeFetch();
    const noPrice: typeof f = async (url, init) => {
      const body = init?.body ? String(init.body) : "";
      if (body.includes("assets(")) return new Response(JSON.stringify({ data: { assets: { items: [{ address: "0x5555555555555555555555555555555555555555", symbol: "WHYPE", price: null }] } } }), { status: 200 });
      return f(url, init);
    };
    const res = await loadMorphoData(c, { fetchFn: noPrice, marketIds: [K62, UBTC] });
    expect(res.hypePriceSource).toBe("config");
    expect(res.hypePriceUsd).toBe(c.economics.fallbackHypePriceUsd);
  });

  it("converts per-second WAD rates to APY", () => {
    expect(perSecondWadToApy(0n)).toBe(0);
    const r = BigInt(Math.round((0.05 / (365 * 24 * 3600)) * 1e18));
    expect(perSecondWadToApy(r)).toBeCloseTo(Math.exp(0.05) - 1, 6);
  });
});

describe("HyperLend data source", () => {
  it("converts percent values to fractions and keeps only address keys", async () => {
    const rates = await fetchHyperlend(cfg().hyperlendApi, fakeFetch());
    expect(rates.length).toBe(2);
    const usdc = hyperlendUsdc(rates, cfg().usdc)!;
    expect(usdc.supplyApr).toBeCloseTo(0.0691);
    expect(usdc.supplyApy).toBeCloseTo(0.0715);
    expect(usdc.borrowApy).toBeCloseTo(0.0963);
    const whype = rates.find((r) => r.token.toLowerCase().startsWith("0x5555"))!;
    expect(whype.supplyApr).toBeCloseTo(0.012);
  });

  it("tolerates missing fields", () => {
    const out = parseHyperlend({ "0xb88339CB7199b77E23DB6E890353E22632Ba630f": {} });
    expect(out[0]!.supplyApy).toBe(0);
  });
});
