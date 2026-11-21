import { MINIMUM_SWAP_USD, decimalAdd, decimalCompare, decimalDivide, decimalMultiply, decimalSub, type RunFunction } from "circuit:sdk";

// Nest's HYPE/USDC pool on Elysium: canonical Uniswap v4, dynamic fee set by Nest's hook, tick spacing 10.
const NET = "ethereum:99901";
const USDC = "0xb47c4c8f73f009cc0c0d3f92b388d13e293f0b65";
const HYPE = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"; // native, as holdings and swaps name it
const NATIVE = "0x0000000000000000000000000000000000000000"; // native, as a v4 pool key and a budget name it
const POOL = { currency0: NATIVE, currency1: USDC, fee: 8388608, tickSpacing: 10, hooks: "0x0559ef6bc07974bfab2149d7fbc0e898914115cf" } as const;

const GAS_RESERVE = "0.03"; // HYPE kept for fees
const RECENTRE_COOLDOWN_MS = 6 * 3600_000;
const EDGE_PCT = 2; // recentre once the price is this close to either edge of the range

export const run: RunFunction = async (agent) => {
  const width = String(agent.settings.widthPct);
  const flattenMove = Number(agent.settings.flattenMovePct) / 100;

  const holdings = () => agent.allocation.holdings;
  const token = (asset: string) => {
    const h = holdings().find((x) => x.kind === "token" && x.network === NET && x.asset === asset);
    return h?.kind === "token" ? h : null;
  };
  const position = () => {
    const h = holdings().find((x) => x.kind === "supplied" && x.network === NET && x.position !== null && x.range !== null);
    return h?.kind === "supplied" ? h : null;
  };

  // 1. The kill switch: HYPE moved more than the limit in 24 hours, so get flat and wait.
  const { price, bars } = await agent.data.prices({ network: NET, asset: HYPE, interval: "1h", bars: 24 });
  if (!price || !bars) return agent.log("HYPE has no day of price history on Elysium yet; deciding again next run.");
  const move = Number(price) / Number(bars[0].open) - 1;
  const pos = position();
  if (Math.abs(move) > flattenMove) {
    if (pos?.position) {
      await agent.log(`HYPE moved ${(move * 100).toFixed(1)}% in 24h, over the ${agent.settings.flattenMovePct}% limit: closing the range and going to USDC.`);
      await agent.liquidity.positions.change({ network: NET, action: { protocol: "uniswap-v4", kind: "remove", position: pos.position, percent: "100" } }, { once: `flatten/${pos.position}` });
    }
    const hype = token(HYPE);
    const spare = hype ? decimalSub(hype.availableQuantity, GAS_RESERVE) : "0";
    if (hype?.priceUsd && decimalCompare(decimalMultiply(spare, hype.priceUsd), MINIMUM_SWAP_USD) >= 0)
      await agent.swaps.create({ from: { network: NET, asset: HYPE }, to: { network: NET, asset: USDC }, amount: spare }, { once: "flat", per: "day" });
    return agent.log(`Flat: HYPE is ${(move * 100).toFixed(1)}% on the day. Reopens once the 24h move is back inside ${agent.settings.flattenMovePct}%.`);
  }

  // 2. A range that is still in place: hold it while the price sits inside it; recentre when the price leaves or gets near an edge.
  if (pos?.position) {
    const openedAt = Number((await agent.memory.get({ key: "openedAt" }))?.value ?? 0);
    const age = Date.now() - openedAt;
    const inRange = pos.range?.inRange ?? false;
    const lower = Math.abs(Number(pos.range?.lowerPercent ?? -100));
    const upper = Math.abs(Number(pos.range?.upperPercent ?? 100));
    const nearEdge = inRange && Math.min(lower, upper) < EDGE_PCT;
    if (inRange && !nearEdge) return agent.log(`In range (${pos.range?.lowerPercent}% to ${pos.range?.upperPercent}%), worth $${pos.valueUsd ?? "?"}; holding.`);
    const why = inRange ? `Price is within ${EDGE_PCT}% of the range edge` : "Price left the range";
    if (age < RECENTRE_COOLDOWN_MS) return agent.log(`${why} but it was opened ${Math.round(age / 60_000)} min ago; recentring no sooner than 6h after opening.`);
    await agent.log(`${why}: closing it to recentre on the current price.`);
    await agent.liquidity.positions.change({ network: NET, action: { protocol: "uniswap-v4", kind: "remove", position: pos.position, percent: "100" } }, { once: `remove/${pos.position}` });
  }

  // 3. Open a fresh range centred on the price: get to half HYPE, half USDC by value, then supply both.
  const usdc = token(USDC);
  const hype = token(HYPE);
  const usdcValue = usdc?.priceUsd ? decimalMultiply(usdc.availableQuantity, usdc.priceUsd) : "0";
  const spareHype = hype ? decimalSub(hype.availableQuantity, GAS_RESERVE) : "0";
  const hypeValue = hype?.priceUsd && decimalCompare(spareHype, "0") > 0 ? decimalMultiply(spareHype, hype.priceUsd) : "0";
  const total = decimalAdd(usdcValue, hypeValue);
  if (decimalCompare(total, decimalMultiply(MINIMUM_SWAP_USD, "2")) < 0)
    return agent.log(`Waiting for funds: $${total} between USDC and HYPE is under the $${decimalMultiply(MINIMUM_SWAP_USD, "2")} a range needs.`);
  const half = decimalDivide(total, "2", 6);
  const hour = Math.floor(Date.now() / 3600_000);
  if (decimalCompare(hypeValue, decimalMultiply(total, "0.45")) < 0 && usdc?.priceUsd) {
    const buy = decimalDivide(decimalSub(half, hypeValue), usdc.priceUsd, 6);
    if (decimalCompare(decimalSub(half, hypeValue), MINIMUM_SWAP_USD) >= 0) {
      await agent.log(`Balancing: buying $${decimalSub(half, hypeValue)} of HYPE with USDC.`);
      await agent.swaps.create({ from: { network: NET, asset: USDC }, to: { network: NET, asset: HYPE }, amount: buy }, { once: `balance/${hour}` });
    }
  } else if (decimalCompare(hypeValue, decimalMultiply(total, "0.55")) > 0 && hype?.priceUsd) {
    const sell = decimalDivide(decimalSub(hypeValue, half), hype.priceUsd, 18);
    if (decimalCompare(decimalSub(hypeValue, half), MINIMUM_SWAP_USD) >= 0) {
      await agent.log(`Balancing: selling $${decimalSub(hypeValue, half)} of HYPE for USDC.`);
      await agent.swaps.create({ from: { network: NET, asset: HYPE }, to: { network: NET, asset: USDC }, amount: sell }, { once: `balance/${hour}` });
    }
  }

  const usdcNow = token(USDC);
  const hypeNow = token(HYPE);
  const hypeBudget = hypeNow ? decimalSub(hypeNow.availableQuantity, GAS_RESERVE) : "0";
  if (!usdcNow || decimalCompare(usdcNow.availableQuantity, "0") <= 0 || decimalCompare(hypeBudget, "0") <= 0)
    return agent.log("One side of the pair is empty after balancing; opening next run.");
  await agent.log(`Opening a range ${width}% either side of ${price} USDC per HYPE with ${hypeBudget} HYPE and ${usdcNow.availableQuantity} USDC.`);
  await agent.liquidity.positions.change(
    {
      network: NET,
      action: {
        protocol: "uniswap-v4",
        kind: "open",
        pool: POOL,
        range: { lowerPercent: `-${width}`, upperPercent: width },
        budgets: [
          { token: NATIVE, amount: hypeBudget },
          { token: USDC, amount: usdcNow.availableQuantity },
        ],
        slippagePercent: "1",
      },
    },
    { once: `open/${hour}` },
  );
  await agent.memory.set({ key: "openedAt", value: String(Date.now()) });
};
