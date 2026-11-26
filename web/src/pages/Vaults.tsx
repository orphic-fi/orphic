import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import VaultArea from "../components/VaultArea";
import { MGMT_FEE_APY, useVault, type VaultState } from "../hooks/useVault";
import { fmtPct, fmtUsd } from "../lib/format";
import {
  MORPHO_MARKETS,
  useFelixSpotRate,
  useSeniorBreakup,
  useHlp,
  useHyperLendUsdc,
  useMorphoMarketRates,
} from "../lib/onchainRates";
import s from "./Vaults.module.css";

/** Junior seeded and first deployed, 8 Nov 2026 21:27 UTC; the base for realised growth. */
const JUNIOR_OPENED = 1794173220; // 8 Nov 2026, senior and the first junior
const JUNIOR_V12_OPENED = 1795278420; // 21 Nov 2026 16:27 UTC, junior v1.2 seeded; its price per share starts at 1 then

type RowId =
  | "senior"
  | "junior"
  | "credit"
  | "rotation"
  | "range"
  | "hlp"
  | "felix"
  | "hyperlend"
  | "morpho"
  | "nest";

interface Row {
  id: RowId;
  name: string;
  sub: string;
  /** Live make-up by venue, read from the chain; shown as colour-coded bullets in place of sub when present. */
  parts?: { name: string; pct: number; color: string }[];
  rate: string;
  rateLabel: string;
  realised: string;
  realisedLabel: string;
  tvl: string;
  tvlLabel: string;
  tone?: "sen" | "jun" | "down" | "soon";
}

function realised(v: VaultState) {
  if (!v.pricePerShare || !v.chainReadAt) return { text: "–", days: 0 };
  const days = Math.max(
    1,
    Math.round((v.chainReadAt / 1000 - JUNIOR_V12_OPENED) / 86_400),
  );
  const r = Number(v.pricePerShare) / 1e18 - 1;
  return {
    text: `${r >= 0 ? "+" : "−"}${Math.abs(r * 100).toFixed(2)}%`,
    days,
  };
}

export default function Vaults() {
  const senior = useVault("senior");
  const junior = useVault("junior");
  const markets = useMorphoMarketRates();
  const felix = useFelixSpotRate(markets.data);
  const hyperlend = useHyperLendUsdc();
  const hlp = useHlp();
  const [params] = useSearchParams();
  const [picked, setPicked] = useState<RowId>(
    params.get("junior") ? "junior" : "senior",
  );
  const seniorMode = params.get("senior") === "withdraw" ? "exit" : "deposit";
  const juniorMode = params.get("junior") === "exit" ? "exit" : "deposit";

  const jr = realised(junior);
  // Senior shares (18 decimals) started at 1 USDC each on 8 Nov; today's price per share is 1e18 / shares-per-USDC.
  const sr = (() => {
    if (
      !senior.seniorSharesPerUsdc ||
      senior.seniorSharesPerUsdc === 0n ||
      !senior.chainReadAt
    )
      return { text: "–", days: 0 };
    const price = 1e18 / Number(senior.seniorSharesPerUsdc);
    const days = Math.max(
      1,
      Math.round((senior.chainReadAt / 1000 - JUNIOR_OPENED) / 86_400),
    );
    return {
      text: `${price >= 1 ? "+" : "−"}${Math.abs((price - 1) * 100).toFixed(2)}%`,
      days,
    };
  })();
  const felixApy = felix.spotApy;
  const breakup = useSeniorBreakup();
  const seniorParts = (() => {
    if (!breakup || breakup.total === 0n)
      return [{ name: "Felix USDC", pct: 100, color: "var(--sen)" }];
    const pctOf = (v: bigint) => Number((v * 1000n) / breakup.total) / 10;
    const palette = ["var(--sen)", "#4f7fb3", "#7a8fb0", "#a3b3c9", "#c8d2df"];
    const parts = [
      { name: "Felix USDC", pct: pctOf(breakup.felix), color: palette[0] },
      ...breakup.markets.map((m, i) => ({
        name: m.name,
        pct: pctOf(m.usdc),
        color: palette[1 + (i % 4)],
      })),
    ];
    if (breakup.idle > 0n)
      parts.push({
        name: "idle USDC",
        pct: pctOf(breakup.idle),
        color: "var(--muted)",
      });
    return parts.filter((p) => p.pct > 0);
  })();
  const juniorParts = junior.projection
    ? [
        {
          name: "Felix USDC",
          pct: Math.round(junior.projection.felixShare * 100),
          color: "var(--sen)",
        },
        {
          name: "HyperLend USDC",
          pct: Math.round(junior.projection.hyperlendShare * 100),
          color: "#4f7fb3",
        },
        {
          name: "idle USDC",
          pct: Math.round(junior.projection.idleShare * 100),
          color: "var(--faint)",
        },
      ].filter((p) => p.pct > 0)
    : [];
  const seniorEst = senior.apy ?? (felixApy === null ? null : felixApy - MGMT_FEE_APY);
  const bestMarket = (markets.data ?? []).reduce<number | null>(
    (b, m) => (b === null || m.supplyApy > b ? m.supplyApy : b),
    null,
  );
  const khype = (markets.data ?? []).filter((m) => m.collateral === "kHYPE");
  const khypeTop = khype.reduce<(typeof khype)[number] | null>(
    (b, m) => (b === null || m.supplyApy > b.supplyApy ? m : b),
    null,
  );

  const rows: { title: string; note: string; rows: Row[] }[] = [
    {
      title: "Core",
      note: "two vaults open, a third coming",
      rows: [
        {
          id: "senior",
          name: "Senior USDC",
          sub: "Morpho Vault V2 · first in line · instant exit while liquid, else at settle",
          parts: seniorParts.map((p) => ({
            ...p,
            name: p.name.replace(" USDC", "").replace(" loans, higher LTV", " high LTV").replace(" loans", ""),
          })),
          rate: seniorEst === null ? "–" : fmtPct(seniorEst),
          rateLabel: "now · venues, net of fee · est.",
          realised: sr.text,
          realisedLabel:
            sr.text === "–" ? "reading" : `${sr.days} days, since open`,
          tvl: fmtUsd(senior.tvl),
          tvlLabel: "tvl",
          tone: "sen",
        },
        {
          id: "junior",
          name: "Junior USDC",
          sub: "takes the first loss · earns senior's 0.5% fee · exit at settle",
          parts: juniorParts.map((p) => ({ ...p, name: p.name.replace(" USDC", "") })),
          rate: junior.apy === null ? "–" : fmtPct(junior.apy),
          rateLabel: "projected · est.",
          realised: jr.text,
          realisedLabel: `${jr.days} days, since open`,
          tvl: fmtUsd(junior.tvl),
          tvlLabel: "tvl",
          tone: "jun",
        },
        {
          id: "credit",
          name: "Orphic Private Credit",
          sub: "90-day terms · KYC required · coming soon",
          parts: [{ name: "nothing allocated yet", pct: 0, color: "var(--faint)" }],
          rate: "fixed",
          rateLabel: "set per term · announced at the first window",
          realised: "not open",
          realisedLabel: "no deposits yet",
          tvl: "$0",
          tvlLabel: "first term",
          tone: "soon",
        },
      ],
    },
    {
      title: "Strategies inside junior",
      note: "junior's money, one agent each, capped",
      rows: [
        {
          id: "rotation",
          name: "Lending rotation",
          sub: "Felix and HyperLend · moves when a week of extra yield beats the gas it costs",
          rate: felixApy === null ? "–" : fmtPct(felixApy),
          rateLabel: "Felix now · est.",
          realised: jr.text,
          realisedLabel: "same as junior today",
          tvl: junior.projection
            ? fmtUsd(
                (junior.projection.juniorAssets ?? 0) *
                  (1 - junior.projection.idleShare),
              )
            : "–",
          tvlLabel: "deployed",
        },
        {
          id: "range",
          name: "HYPE/USDC range",
          sub: "one range on the Nest HYPE/USDC pool · recentres when price walks out · flattens on a 15% move · a bet",
          rate: "fees",
          rateLabel: "no rate shown",
          realised: "paper",
          realisedLabel: "paper record",
          tvl: "$0",
          tvlLabel: "coming",
        },
        {
          id: "hlp",
          name: "HLP",
          sub: "Hyperliquid's market-making vault · Hypercore · 4-day exit",
          rate:
            hlp.data?.realised30dAnnualised == null
              ? "–"
              : fmtPct(hlp.data.realised30dAnnualised),
          rateLabel: "30-day realised, annualised · from HLP",
          realised: "not yet",
          realisedLabel: "not yet held",
          tvl: "$0",
          tvlLabel: "coming",
        },
      ],
    },
    {
      title: "Venues the agents may use",
      note: "the allowlist; nothing else can receive a dollar",
      rows: [
        {
          id: "felix",
          name: "Felix USDC",
          sub: "Morpho vault · HyperEVM · audited · where senior sits today",
          rate: felixApy === null ? "–" : fmtPct(felixApy),
          rateLabel: "now · computed from its markets",
          realised: "",
          realisedLabel: "",
          tvl: fmtUsd(felix.totalAssetsUsd),
          tvlLabel: "venue tvl",
        },
        {
          id: "hyperlend",
          name: "HyperLend USDC",
          sub: "lending pool · HyperEVM · instant exit while liquid",
          rate: hyperlend.apy === null ? "–" : fmtPct(hyperlend.apy),
          rateLabel: "now · from the pool contract",
          realised: "",
          realisedLabel: "",
          tvl: fmtUsd(hyperlend.tvlUsd),
          tvlLabel: "venue tvl",
        },
        {
          id: "morpho",
          name: "Morpho markets",
          sub: `kHYPE, WHYPE and UBTC collateral · direct supply${khypeTop ? ` · kHYPE ${Math.round(khypeTop.utilization * 100)}% utilised` : ""}`,
          rate: bestMarket === null ? "–" : `up to ${fmtPct(bestMarket)}`,
          rateLabel: "now · from Morpho Blue and its IRM",
          realised: "",
          realisedLabel: "",
          tvl: fmtUsd(
            (markets.data ?? []).reduce((n, m) => n + m.supplyUsd, 0) || null,
          ),
          tvlLabel: "across 4 markets",
        },
        {
          id: "nest",
          name: "Nest HYPE/USDC",
          sub: "Uniswap v4 · Elysium · hook pool · for the range strategy",
          rate: "fees",
          rateLabel: "no rate shown",
          realised: "",
          realisedLabel: "",
          tvl: "–",
          tvlLabel: "pool",
        },
      ],
    },
  ];

  return (
    <div className={`wrap ${s.page}`}>
      <section className={s.table}>
        <h1 className={s.h1}>Agentic USDC vaults</h1>
        <p className={s.lede}>
          One book, two ways in. Senior is first in line. Junior stands behind
          it, takes the first loss, and earns more. Agents move the book between
          the venues below and settle every week. Pick a row to see where its
          money sits.
        </p>
        {rows.map((g) => (
          <div key={g.title}>
            <div className={s.sec}>
              <span>{g.title}</span>
              <span>{g.note}</span>
            </div>
            {g.rows.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`${s.row} ${picked === r.id ? s.rowOn : ""}`}
                onClick={() => setPicked(r.id)}
                aria-pressed={picked === r.id}
              >
                <span className={s.nameCell}>
                  <span className={s.name}>{r.name}</span>
                  {r.parts && r.parts.length > 0 ? (
                    <span className={s.parts} aria-label={r.sub}>
                      {r.parts.map((p) => (
                        <span key={p.name}>
                          <i style={{ background: p.color }} />
                          {p.name}
                          {p.pct > 0 ? ` ${p.pct}%` : ""}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className={s.sub}>{r.sub}</span>
                  )}
                </span>
                <span className={s.cell}>
                  {r.rate && (
                    <span
                      className={`${s.n} ${r.tone === "sen" ? s.sen : r.tone === "jun" ? s.jun : ""}`}
                    >
                      {r.rate}
                    </span>
                  )}
                  {r.rateLabel && <span className={s.l}>{r.rateLabel}</span>}
                </span>
                <span className={s.cell}>
                  {r.realised && (
                    <span
                      className={`${s.n} ${r.tone === "down" ? s.down : ""}`}
                    >
                      {r.realised}
                    </span>
                  )}
                  {r.realisedLabel && (
                    <span className={s.l}>{r.realisedLabel}</span>
                  )}
                </span>
                <span className={s.cell}>
                  <span className={s.n}>{r.tvl}</span>
                  <span className={s.l}>{r.tvlLabel}</span>
                </span>
              </button>
            ))}
          </div>
        ))}
      </section>

      <aside className={s.panel}>
        {picked === "senior" && (
          <>
            <PanelHead name="Senior USDC" tag="first in line" />
            <p className={s.ptext}>
              An audited Morpho vault. Earns the base lending rate at the venues
              the Rotator may use; junior absorbs the first loss before this
              vault does. Instant exit while the venues are liquid, otherwise at
              the weekly settle.
            </p>
            <Breakup
              parts={seniorParts}
              note="Felix and four Morpho markets, read from the venues. The agent moves when a week of extra yield beats the gas it costs."
            />
            <VaultArea
              key={`s-${seniorMode}`}
              kind="senior"
              state={senior}
              initialMode={seniorMode}
            />
          </>
        )}
        {picked === "junior" && (
          <>
            <PanelHead name="Junior USDC" tag="takes the first loss" />
            <p className={s.ptext}>
              Stands behind senior. Earns senior's 0.5% a year management fee in
              senior shares, plus whatever its own USDC earns at the same
              venues. Exits land at the weekly settle.
            </p>
            <Breakup
              parts={juniorParts}
              note={
                junior.projection
                  ? "Senior shares received as fee are counted in the price per share."
                  : "Reading the chain."
              }
            />
            <VaultArea
              key={`j-${juniorMode}`}
              kind="junior"
              state={junior}
              initialMode={juniorMode}
            />
          </>
        )}
        {picked === "credit" && (
          <Info
            name="Orphic Private Credit"
            tag="coming soon"
            text="A fixed-term vault for depositors who complete KYC. Deposit during a short window, hold for 90 days, get paid at the end or roll into the next term. The rate for each term is fixed and announced when its window opens. No deposits are open yet."
            facts={[
              ["Status", "Deposits not open"],
              ["Term", "90 days"],
              ["Who", "KYC required"],
              ["Rate", "fixed per term, announced at the window"],
              ["First window", "to be announced"],
            ]}
          />
        )}
        {picked === "rotation" && (
          <Info
            name="Lending rotation"
            tag="inside junior"
            text="Junior's agent reads each allowed venue's rate from the venue itself and moves when the gap pays for the move, keeping a reserve idle for exits and cover. Felix and HyperLend, HyperLend capped at a fifth of the book."
            facts={[
              ["Agent", "Rotator"],
              ["Settles", "weekly, see next settle above"],
              ["Moves when", "gain beats gas 3×"],
              ["Cap per venue", "HyperLend 20% of junior"],
              ["Venues", "Felix and HyperLend"],
            ]}
            link={{ to: "/agents/orphic-rotator", label: "Rotator log" }}
          />
        )}
        {picked === "range" && (
          <Info
            name="HYPE/USDC range"
            tag="a bet, inside junior"
            text="One range of liquidity on the Nest HYPE/USDC pool, 10% either side of the price, recentred when the price walks out and flattened to USDC when HYPE moves 15% in a day. Long the pair and short volatility, so it is shown as a bet and capped at 5% of junior."
            facts={[
              ["Agent", "Ranger"],
              ["Status", "coming"],
              ["Cap", "5% of junior"],
              ["Label", "shown as a bet everywhere"],
            ]}
          />
        )}
        {picked === "hlp" && (
          <Info
            name="HLP"
            tag="coming, inside junior"
            text="Hyperliquid's market-making vault on Hypercore. The largest USDC rate with real size behind it, with a 4-day withdrawal lock, so it is counted as a slow venue and the agent exits a week ahead of any settle that needs the money."
            facts={[
              [
                "30-day realised, annualised",
                hlp.data?.realised30dAnnualised == null
                  ? "–"
                  : fmtPct(hlp.data.realised30dAnnualised),
              ],
              [
                "APR Hyperliquid reports",
                hlp.data ? fmtPct(hlp.data.aprReported) : "–",
              ],
              ["Account value", fmtUsd(hlp.data?.accountValueUsd ?? null)],
              ["Exit", "4 days"],
              ["Status", "coming"],
            ]}
          />
        )}
        {picked === "felix" && (
          <Info
            name="Felix USDC"
            tag="venue"
            text="A MetaMorpho vault on HyperEVM, audited, where senior sits today. The rate is computed here from the vault's own positions: each market's borrow rate times utilisation, weighted by what Felix holds in it, net of Felix's fee. It swings hour to hour with utilisation."
            facts={[
              ["Rate now", felixApy === null ? "–" : fmtPct(felixApy)],
              ["Venue TVL", fmtUsd(felix.totalAssetsUsd)],
              ["Exit", "instant while liquid"],
            ]}
          />
        )}
        {picked === "hyperlend" && (
          <Info
            name="HyperLend USDC"
            tag="venue"
            text="HyperLend's pooled USDC market on HyperEVM. Instant exit while the pool is liquid. The rate shown is what the pool is paying this minute, read from the contract."
            facts={[
              [
                "Rate now",
                hyperlend.apy === null ? "–" : fmtPct(hyperlend.apy),
              ],
              ["USDC supplied", fmtUsd(hyperlend.tvlUsd)],
              ["Exit", "instant while liquid"],
              ["Source", "the pool contract, read each minute"],
            ]}
          />
        )}
        {picked === "morpho" && (
          <Info
            name="Morpho markets"
            tag="venue"
            text="Direct supply into four Morpho Blue markets with kHYPE, WHYPE and UBTC collateral. Higher rates when borrow demand spikes, and an exit that waits when utilisation is near 100%, which is why each market is capped."
            facts={(markets.data ?? []).map((m) => [
              `${m.name} (${MORPHO_MARKETS.find((x) => x.id === m.id)?.lltv ?? ""} LTV)`,
              `${fmtPct(m.supplyApy)} · ${Math.round(m.utilization * 100)}% utilised`,
            ])}
          />
        )}
        {picked === "nest" && (
          <Info
            name="Nest HYPE/USDC"
            tag="venue"
            text="The HYPE/USDC pool on Elysium with the volume, on Uniswap v4 with Nest's hook. Used by the range strategy only. No rate is shown because LP fees are not a rate."
            facts={[
              ["Chain", "Elysium"],
              ["Pool", "Uniswap v4, Nest hook"],
              ["Used by", "Ranger, once supported"],
            ]}
          />
        )}
      </aside>
    </div>
  );
}

function PanelHead({ name, tag }: { name: string; tag: string }) {
  return (
    <div className={s.phead}>
      <h2 className={s.pname}>{name}</h2>
      <span className={s.tag}>{tag}</span>
    </div>
  );
}

function Breakup({
  parts,
  note,
}: {
  parts: { name: string; pct: number; color: string }[];
  note: string;
}) {
  return (
    <div className={s.breakup}>
      <div className={s.k}>Where it sits now</div>
      <div className={s.bar}>
        {parts.map((p) => (
          <i key={p.name} style={{ width: `${p.pct}%`, background: p.color }} />
        ))}
      </div>
      <div className={s.legend}>
        {parts.map((p) => (
          <span key={p.name}>
            <i style={{ background: p.color }} />
            {p.name} {p.pct}%
          </span>
        ))}
      </div>
      <p className={s.l}>{note}</p>
    </div>
  );
}

function Info({
  name,
  tag,
  text,
  facts,
  link,
}: {
  name: string;
  tag: string;
  text: string;
  facts: [string, string][];
  link?: { to: string; label: string };
}) {
  return (
    <>
      <PanelHead name={name} tag={tag} />
      <p className={s.ptext}>{text}</p>
      <dl className={s.facts}>
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {link && (
        <Link to={link.to} className={s.plink}>
          {link.label}
        </Link>
      )}
    </>
  );
}
