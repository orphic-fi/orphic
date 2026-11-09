import { decimalCompare, decimalDivide, decimalMultiply, decimalSub, type RunFunction } from "circuit:sdk";

/**
 * Orphic Neutral: funding capture on HYPE with no price view. Holds spot HYPE and an equal short in the HYPE perp,
 * so price moves cancel and the book earns what longs pay shorts. Enters when funding is worth it, leaves when it is
 * not, and de-risks the short before it can be liquidated. Hourly, on HyperCore, one coin.
 *
 * This is a test agent: it runs on paper money first. Nothing here is a rate promise; the result is whatever funding was.
 */
const COIN = "HYPE";
const HOURS_8 = 8;
const HOURS_24 = 24;

export const run: RunFunction = async (agent) => {
  const minApy = agent.settings.minFundingApy; // percent
  const spotShare = agent.settings.spotShare / 100;
  const liqBuffer = agent.settings.liqBufferPct / 100;

  // 1. Funding: trailing 8h and 24h, annualised in percent (hourly settlements on Hyperliquid).
  const rows: { settlesAt: string; fundingRate: string }[] = [];
  for await (const r of agent.data.fundingRates({ venue: "hyperliquid", venueSymbol: [COIN], lookbackMs: 25 * 3600_000 })) {
    rows.push({ settlesAt: r.settlesAt, fundingRate: r.fundingRate });
  }
  rows.sort((a, b) => (a.settlesAt < b.settlesAt ? -1 : 1));
  const settled = rows.filter((r) => new Date(r.settlesAt).getTime() <= Date.now());
  const ann = (xs: typeof settled) => (xs.length ? (xs.reduce((s, r) => s + Number(r.fundingRate), 0) / xs.length) * 24 * 365 * 100 : NaN);
  const apy8 = ann(settled.slice(-HOURS_8));
  const apy24 = ann(settled.slice(-HOURS_24));
  const negativeDay = settled.length >= HOURS_24 && settled.slice(-HOURS_24).every((r) => Number(r.fundingRate) < 0);
  await agent.log(`funding ${COIN}: 8h ${apy8.toFixed(2)}% annualised, 24h ${apy24.toFixed(2)}%, ${settled.length} settled hours read`);

  // 2. What the session holds.
  const h = agent.allocation.holdings;
  const usdc = h.find((x) => x.kind === "token" && x.network === "hypercore" && x.asset === "0");
  const spotMarkets = await agent.hyperliquid.spotMarkets.list();
  const spotMarket = spotMarkets.find((m) => m.baseSymbol === COIN && m.quoteSymbol === "USDC");
  if (!spotMarket) return agent.log(`no ${COIN}/USDC spot market on HyperCore`, { error: true });
  const spot = h.find((x) => x.kind === "token" && x.network === "hypercore" && x.asset === String(spotMarket.baseToken));
  const perp = h.find((x) => x.kind === "perp" && x.asset === COIN);
  const spotQty = spot?.quantity ?? "0";
  const perpQty = perp?.quantity ?? "0"; // negative when short
  const inPosition = decimalCompare(spotQty, "0") > 0 || decimalCompare(perpQty, "0") < 0;

  // 3. Exit: a full day of negative funding means the book pays instead of earns.
  if (inPosition && negativeDay) {
    await agent.log("funding negative for 24h: unwinding both legs");
    if (decimalCompare(perpQty, "0") < 0) await agent.hyperliquid.orders.create({ kind: "perpReduce", asset: COIN, expectedSide: "short", amount: { size: "max" } }, { once: "unwind-perp" });
    if (decimalCompare(spotQty, "0") > 0) await agent.hyperliquid.orders.create({ kind: "spotSell", asset: spotMarket.asset, amount: { size: "max" } }, { once: "unwind-spot" });
    return;
  }

  // 4. In position: keep the hedge equal in units and the short away from liquidation.
  if (inPosition) {
    const shortSize = decimalMultiply(perpQty, "-1");
    const drift = decimalCompare(spotQty, "0") > 0 ? Number(decimalDivide(decimalSub(spotQty, shortSize), spotQty, 6)) : 1;
    if (Math.abs(drift) > 0.03) {
      // Re-hedge: bring the short to the spot size.
      const diff = decimalSub(spotQty, shortSize);
      if (decimalCompare(diff, "0") > 0) await agent.hyperliquid.orders.create({ kind: "perpOpen", asset: COIN, side: "short", amount: { size: diff } }, { once: `rehedge-${settled.at(-1)?.settlesAt}` });
      else await agent.hyperliquid.orders.create({ kind: "perpReduce", asset: COIN, expectedSide: "short", amount: { size: decimalMultiply(diff, "-1") } }, { once: `rehedge-${settled.at(-1)?.settlesAt}` });
      await agent.log(`re-hedged: spot ${spotQty}, short was ${shortSize}, drift ${(drift * 100).toFixed(1)}%`);
    }
    if (perp && perp.kind === "perp" && perp.liquidationPrice && perp.priceUsd) {
      const room = (Number(perp.liquidationPrice) - Number(perp.priceUsd)) / Number(perp.priceUsd);
      if (room < liqBuffer) {
        const cut = decimalMultiply(spotQty, "0.25");
        await agent.hyperliquid.orders.create({ kind: "perpReduce", asset: COIN, expectedSide: "short", amount: { size: cut } }, { once: `derisk-perp-${settled.at(-1)?.settlesAt}` });
        await agent.hyperliquid.orders.create({ kind: "spotSell", asset: spotMarket.asset, amount: { size: cut } }, { once: `derisk-spot-${settled.at(-1)?.settlesAt}` });
        await agent.log(`short within ${(room * 100).toFixed(1)}% of liquidation: cut both legs by a quarter`, { error: true });
      } else {
        await agent.log(`holding: spot ${spotQty} ${COIN}, short ${shortSize}, liquidation ${(room * 100).toFixed(0)}% away, funding since open ${perp.cumFundingSinceOpenCollateral ?? "n/a"} USDC`);
      }
    }
    return;
  }

  // 5. Flat: enter when funding clears the bar.
  if (!(apy8 > minApy && apy24 > 0)) return agent.log(`flat: funding ${apy8.toFixed(2)}% below the ${minApy}% bar, waiting`);
  const cash = usdc && usdc.kind === "token" ? usdc.availableQuantity : "0";
  if (decimalCompare(cash, "50") < 0) return agent.log(`flat: only ${cash} USDC available, below the 50 USDC minimum book`);
  const spotValue = decimalMultiply(cash, String(spotShare));
  const buy = await agent.hyperliquid.orders.create({ kind: "spotBuy", asset: spotMarket.asset, amount: { value: spotValue } }, { once: `enter-spot-${settled.at(-1)?.settlesAt}` });
  const bought = buy.result.filled;
  if (decimalCompare(bought, "0") <= 0) return agent.log("spot buy did not fill; no hedge placed", { error: true });
  await agent.hyperliquid.orders.create({ kind: "perpOpen", asset: COIN, side: "short", amount: { size: bought }, margin: { mode: "isolated", leverage: 2 } }, { once: `enter-perp-${settled.at(-1)?.settlesAt}` });
  await agent.log(`entered: bought ${bought} ${COIN} spot for ${spotValue} USDC and shorted ${bought} ${COIN} perp at 2x isolated; funding ${apy8.toFixed(2)}% annualised`);
};
