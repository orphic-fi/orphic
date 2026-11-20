import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fmtPct, fmtUsd } from '../lib/format'
import { useLlamaRates, useMorphoMarkets } from '../lib/venues'
import { useMorphoVaultV1 } from '../lib/morpho'
import { addresses } from '../config/addresses'
import { DEFAULT_CONFIG, STEPS, VENUES, loadDraft, problems, saveDraft, split, toRequest, type AgentChoice, type BuilderConfig, type Template } from '../lib/builder'
import s from './Builder.module.css'

const REQUEST_TO = 'https://t.me/ushouldcashout'

export default function Builder() {
  const [c, setC] = useState<BuilderConfig>(() => loadDraft())
  const [step, setStep] = useState(0)
  const [copied, setCopied] = useState(false)
  useEffect(() => saveDraft(c), [c])
  const set = <K extends keyof BuilderConfig>(k: K, v: BuilderConfig[K]) => setC((x) => ({ ...x, [k]: v }))
  const felix = useMorphoVaultV1(addresses.hyperEvm.felixVault)
  const markets = useMorphoMarkets()
  const llama = useLlamaRates()
  const rate = (id: string) => {
    if (id === 'felix') return felix.data?.netApy == null ? '–' : fmtPct(felix.data.netApy)
    if (id === 'hyperlend') return llama.data?.hyperlendUsdc.apy == null ? '–' : fmtPct(llama.data.hyperlendUsdc.apy)
    if (id === 'morpho') {
      const best = (markets.data ?? []).reduce<number | null>((b, m) => (b === null || m.supplyApy > b ? m.supplyApy : b), null)
      return best === null ? '–' : `up to ${fmtPct(best)}`
    }
    if (id === 'hlp') return llama.data?.hlp.apy == null ? '–' : fmtPct(llama.data.hlp.apy)
    return 'fees'
  }
  const issues = useMemo(() => problems(c), [c])
  const sp = split(c)
  const venuesOn = c.venues.filter((v) => v.on)
  const venueName = (id: string) => VENUES.find((v) => v.id === id)?.name.split(',')[0] ?? id

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toRequest(c))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard can be blocked; the textarea below is selectable */
    }
  }

  return (
    <div className={`wrap ${s.page}`}>
      <aside className={s.rail}>
        <div className={s.k}>New vault</div>
        <ol className={s.steps}>
          {STEPS.map((n, i) => (
            <li key={n}>
              <button type="button" className={`${s.step} ${i < step ? s.done : ''} ${i === step ? s.now : ''}`} onClick={() => setStep(i)}>
                <span className={s.c}>{i < step ? '✓' : i + 1}</span>
                {n}
              </button>
            </li>
          ))}
        </ol>
        <p className={s.railNote}>
          Nothing deploys from this page. Step 6 sends the config to Orphic for review; Orphic deploys the same audited pair it runs itself and hands ownership to your Safe. Everything here can be
          changed later by the owner, with a 24 hour delay.
        </p>
        <button type="button" className={s.reset} onClick={() => setC(DEFAULT_CONFIG)}>
          Start over
        </button>
      </aside>

      <section className={s.main}>
        <div className={s.k}>Step {step + 1} of 6</div>

        {step === 0 && (
          <>
            <h1 className={s.h1}>Pick a template</h1>
            <p className={s.lede}>A template is a pair of audited contracts Orphic already runs for itself. Pick the shape; the venues come next.</p>
            <div className={s.opts}>
              <Opt
                on={c.template === 'pair'}
                onClick={() => set('template', 'pair')}
                tag="most common"
                title="Senior and junior"
                text="Two vaults, one book. Senior is first in line and earns the base rate. Junior takes the first loss and earns senior's fee on top. Your users pick their side."
                note="Orphic runs this pair itself."
              />
              <Opt
                on={c.template === 'senior'}
                onClick={() => set('template', 'senior')}
                title="Senior only"
                text="One audited Morpho vault with Orphic's agent rotating between venues. Simplest to explain, no first-loss layer."
                note="Good for a treasury or a stablecoin project."
              />
              <Opt
                on={c.template === 'strategy'}
                onClick={() => set('template', 'strategy')}
                title="Strategy vault"
                text="One vault, one strategy: a range on a pool, a lending rotation. Higher risk, shown as such on every page."
                note="Needs Ranger or your own agent."
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className={s.h1}>Venues the agent may use</h1>
            <p className={s.lede}>Every venue is an adapter Orphic has already shipped and had reviewed. The agent can never send money anywhere else. Turn on what you trust and cap each one.</p>
            <div className={s.card}>
              <div className={s.th}>
                <span>Venue</span>
                <span>Chain</span>
                <span>Rate now</span>
                <span>Cap</span>
                <span />
              </div>
              {VENUES.map((v) => {
                const ch = c.venues.find((x) => x.id === v.id)!
                return (
                  <div key={v.id} className={`${s.tr} ${ch.on ? '' : s.off}`}>
                    <div>
                      <div className={s.nm}>
                        {v.name} {v.soon && <span className={s.pill}>soon</span>}
                      </div>
                      <div className={s.sub}>{v.sub}</div>
                    </div>
                    <span>{v.chain}</span>
                    <span className={s.num}>{rate(v.id)}</span>
                    <span className={s.num}>
                      <input
                        type="number"
                        min={5}
                        max={100}
                        step={5}
                        value={ch.capPct}
                        disabled={!ch.on}
                        onChange={(e) =>
                          set(
                            'venues',
                            c.venues.map((x) => (x.id === v.id ? { ...x, capPct: Number(e.target.value) } : x)),
                          )
                        }
                      />
                      %
                    </span>
                    <button
                      type="button"
                      className={`${s.tog} ${ch.on ? s.togOn : ''}`}
                      aria-pressed={ch.on}
                      aria-label={`${v.name} ${ch.on ? 'on' : 'off'}`}
                      onClick={() =>
                        set(
                          'venues',
                          c.venues.map((x) => (x.id === v.id ? { ...x, on: !x.on } : x)),
                        )
                      }
                    />
                  </div>
                )
              })}
            </div>
            <p className={s.note}>"Soon" venues can be switched on now; they start earning once their adapter is live, and the config does not need to change.</p>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className={s.h1}>Who runs the book</h1>
            <p className={s.lede}>The agent moves money between your venues on rules you can read. It never holds keys to anything but the moves the rules allow.</p>
            <div className={s.opts}>
              <Opt
                on={c.agent === 'rotator'}
                onClick={() => set('agent', 'rotator')}
                title="Orphic Rotator"
                text="Moves between your venues on a 7-day rate net of gas, inside your caps, settles weekly. The same agent that runs Orphic's own book."
              />
              <Opt
                on={c.agent === 'rotator-ranger'}
                onClick={() => set('agent', 'rotator-ranger')}
                title="Rotator plus Ranger"
                text="Rotator for the lenders, Ranger for a range on one pool. Needs the Nest venue switched on. A bet, labelled as such."
              />
              <Opt
                on={c.agent === 'own'}
                onClick={() => set('agent', 'own')}
                title="Your own agent"
                text="An agent you upload under your Circuit partner id. It can only call the venues above; the rules contract enforces that onchain."
              />
            </div>
            {c.agent === 'own' && (
              <label className={s.field}>
                <span>Circuit agent id</span>
                <input value={c.ownAgentId ?? ''} onChange={(e) => set('ownAgentId', e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" />
              </label>
            )}
            <div className={s.grid3}>
              <Select
                label="Settle every"
                value={c.settleDays}
                onChange={(v) => set('settleDays', v as 7)}
                options={[
                  [7, '7 days'],
                  [14, '14 days'],
                  [30, '30 days'],
                ]}
              />
              <Select
                label="Move only if the gain beats gas by"
                value={c.gasMultiple}
                onChange={(v) => set('gasMultiple', v as 3)}
                options={[
                  [3, '3×'],
                  [5, '5×'],
                  [10, '10×'],
                ]}
              />
              <Select
                label="Pause if a venue loses more than"
                value={c.pauseLossPct}
                onChange={(v) => set('pauseLossPct', v as 2)}
                options={[
                  [1, '1% in a week'],
                  [2, '2% in a week'],
                  [5, '5% in a week'],
                ]}
              />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className={s.h1}>Tranches and fees</h1>
            <p className={s.lede}>
              {c.template === 'pair'
                ? 'The tranche split decides how much loss junior absorbs before senior feels it. The fees decide who gets what.'
                : 'No first-loss layer in this template; the fees decide who gets what.'}
            </p>
            <div className={s.split}>
              <div className={s.stack}>
                {c.template === 'pair' && (
                  <label className={s.field}>
                    <span>Junior covers losses up to</span>
                    <span className={s.inline}>
                      <input type="number" min={5} max={50} step={5} value={c.juniorCoverPct} onChange={(e) => set('juniorCoverPct', Number(e.target.value))} />% of senior
                    </span>
                    <small>Senior deposits close when junior is thinner than this. 10% has covered every week of Orphic's own book so far.</small>
                  </label>
                )}
                <div className={s.grid2}>
                  <label className={s.field}>
                    <span>Management fee, senior</span>
                    <span className={s.inline}>
                      <input type="number" min={0} max={3} step={0.25} value={c.mgmtFeePct} onChange={(e) => set('mgmtFeePct', Number(e.target.value))} />% a year
                    </span>
                    <small>{c.template === 'pair' ? 'paid to junior, in senior shares' : 'paid to your Safe'}</small>
                  </label>
                  <label className={s.field}>
                    <span>Performance fee</span>
                    <span className={s.inline}>
                      <input type="number" min={0} max={30} step={1} value={c.perfFeePct} onChange={(e) => set('perfFeePct', Number(e.target.value))} />% of yield
                    </span>
                    <small>split 70 / 20 / 10: you, agent bucket, Orphic</small>
                  </label>
                </div>
                <div className={s.grid2}>
                  <label className={s.field}>
                    <span>Senior cap</span>
                    <span className={s.inline}>
                      $<input type="number" min={50_000} step={50_000} value={c.seniorCapUsd} onChange={(e) => set('seniorCapUsd', Number(e.target.value))} />
                    </span>
                  </label>
                  <label className={s.field}>
                    <span>Per wallet cap</span>
                    <span className={s.inline}>
                      $<input type="number" min={1_000} step={5_000} value={c.walletCapUsd} onChange={(e) => set('walletCapUsd', Number(e.target.value))} />
                    </span>
                  </label>
                </div>
              </div>
              <div className={s.card}>
                <div className={s.k}>Who gets what, at $1M senior and 5% gross</div>
                <Row k="Senior holders" v={fmtUsd(sp.seniorHolders)} />
                {c.template === 'pair' ? (
                  <Row k="Junior holders, from the fee" v={`${fmtUsd(sp.juniorFromFee)} + their own yield`} />
                ) : (
                  <Row k="Your Safe, management fee" v={fmtUsd(sp.juniorFromFee)} />
                )}
                <Row k="You, performance" v={fmtUsd(sp.team)} />
                <Row k="Agent bucket" v={fmtUsd(sp.agent)} />
                <Row k="Orphic" v={fmtUsd(sp.orphic)} />
                <p className={s.note}>Illustration at a fixed rate. Not a forecast.</p>
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className={s.h1}>Name it</h1>
            <p className={s.lede}>Your name, your colour, your domain. The disclosure line is required and shows on every page.</p>
            <div className={s.split}>
              <div className={s.stack}>
                <div className={s.grid2}>
                  <label className={s.field}>
                    <span>Vault name</span>
                    <input value={c.name} onChange={(e) => set('name', e.target.value)} placeholder="pompVAULT USDC" />
                  </label>
                  <label className={s.field}>
                    <span>Symbol</span>
                    <input value={c.symbol} onChange={(e) => set('symbol', e.target.value.toUpperCase())} placeholder="pUSDC" maxLength={8} />
                  </label>
                </div>
                <div className={s.grid2}>
                  <label className={s.field}>
                    <span>Accent</span>
                    <span className={s.inline}>
                      <input type="color" value={c.accent} onChange={(e) => set('accent', e.target.value)} className={s.color} />
                      <input value={c.accent} onChange={(e) => set('accent', e.target.value)} />
                    </span>
                  </label>
                  <label className={s.field}>
                    <span>Where it lives</span>
                    <input value={c.domain} onChange={(e) => set('domain', e.target.value)} placeholder="vaults.yourapp.xyz, or leave blank to embed" />
                  </label>
                </div>
                <label className={s.field}>
                  <span>Disclosure line</span>
                  <textarea value={c.disclosure} onChange={(e) => set('disclosure', e.target.value)} rows={3} />
                </label>
                <div className={s.grid2}>
                  <label className={s.field}>
                    <span>Owner Safe, HyperEVM</span>
                    <input value={c.ownerSafe} onChange={(e) => set('ownerSafe', e.target.value.trim())} placeholder="0x…" />
                  </label>
                  <label className={s.field}>
                    <span>Contact for the review</span>
                    <input value={c.contact} onChange={(e) => set('contact', e.target.value)} placeholder="@telegram or email" />
                  </label>
                </div>
              </div>
              <div className={s.card}>
                <div className={s.k}>Preview</div>
                <div className={s.preview} style={{ borderTopColor: c.accent }}>
                  <div className={s.pvName}>
                    <span className={s.logo} style={{ background: c.accent }}>
                      {(c.name || 'V').slice(0, 1)}
                    </span>
                    {c.name || 'Your vault'}
                  </div>
                  <div className={s.pvLine}>
                    {c.template === 'pair' ? 'Senior and junior' : c.template === 'senior' ? 'Senior only' : 'Strategy vault'} · {venuesOn.map((v) => venueName(v.id)).join(', ') || 'no venues yet'}
                  </div>
                  <div className={s.bar}>
                    <i style={{ width: c.template === 'pair' ? '70%' : '100%', background: c.accent }} />
                  </div>
                  <small>Powered by Orphic · runs on Circuit</small>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h1 className={s.h1}>Review and request</h1>
            <p className={s.lede}>
              This sends the config to Orphic. Orphic reviews it, deploys the pair from it with the same scripts and signer flow it uses for its own vaults, verifies the state onchain, and hands
              ownership to your Safe. You sign one acceptance from the Safe. Deposits open once the readback matches this page.
            </p>
            {issues.length > 0 && (
              <div className={s.issues}>
                <div className={s.k}>Before it can be requested</div>
                <ul>
                  {issues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className={s.card}>
              <div className={s.k}>What will be deployed</div>
              <Row k="Template" v={c.template === 'pair' ? 'Senior and junior' : c.template === 'senior' ? 'Senior only' : 'Strategy vault'} />
              <Row k="Venues" v={venuesOn.map((v) => `${venueName(v.id)} ${v.capPct}%`).join(' · ') || '–'} />
              <Row k="Agent" v={c.agent === 'rotator' ? 'Orphic Rotator' : c.agent === 'rotator-ranger' ? 'Rotator plus Ranger' : `Own agent ${c.ownAgentId ?? ''}`} />
              <Row k="Rules" v={`settle every ${c.settleDays} days · move when gain beats gas ${c.gasMultiple}× · pause on a ${c.pauseLossPct}% weekly loss`} />
              {c.template === 'pair' && <Row k="Junior cover" v={`${c.juniorCoverPct}% of senior`} />}
              <Row k="Fees" v={`${c.mgmtFeePct}% a year management · ${c.perfFeePct}% of yield, 70/20/10`} />
              <Row k="Caps" v={`${fmtUsd(c.seniorCapUsd)} vault · ${fmtUsd(c.walletCapUsd)} per wallet`} />
              <Row k="Name" v={c.name ? `${c.name} (${c.symbol || '–'})` : '–'} />
              <Row k="Site" v={c.domain || 'embedded'} />
              <Row k="Owner" v={c.ownerSafe || '–'} />
            </div>
            <div className={s.actions}>
              <button type="button" className={s.primary} disabled={issues.length > 0} onClick={copy}>
                {copied ? 'Copied' : 'Copy the config'}
              </button>
              <a href={REQUEST_TO} target="_blank" rel="noreferrer" className={s.ghost}>
                Send it to Orphic
              </a>
            </div>
            <textarea className={s.json} readOnly value={toRequest(c)} rows={10} />
            <p className={s.note}>
              Phase one is a reviewed deploy, not a button. Phase two replaces it with a factory call signed from your Safe. The config format is the same, so what you write here keeps working.
            </p>
          </>
        )}

        <div className={s.navBtns}>
          {step > 0 && (
            <button type="button" className={s.ghost} onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {step < 5 && (
            <button type="button" className={s.primary} onClick={() => setStep(step + 1)}>
              Continue
            </button>
          )}
        </div>
      </section>

      <aside className={s.summary}>
        <div className={s.k}>Your vault so far</div>
        <Row k="Template" v={c.template === 'pair' ? 'Senior and junior' : c.template === 'senior' ? 'Senior only' : 'Strategy vault'} />
        <Row k="Venues on" v={venuesOn.map((v) => venueName(v.id)).join(', ') || 'none'} />
        <Row k="Slow venues" v={venuesOn.some((v) => v.id === 'hlp') ? 'HLP' : 'none'} />
        <Row k="Agent" v={c.agent === 'rotator' ? 'Orphic Rotator' : c.agent === 'rotator-ranger' ? 'Rotator plus Ranger' : 'your own'} />
        <Row k="Settle" v={`every ${c.settleDays} days`} />
        {c.template === 'pair' && <Row k="Junior cover" v={`${c.juniorCoverPct}% of senior`} />}
        <Row k="Fees" v={`${c.mgmtFeePct}% mgmt · ${c.perfFeePct}% perf`} />
        <Row k="Caps" v={`${fmtUsd(c.seniorCapUsd)} · ${fmtUsd(c.walletCapUsd)} per wallet`} />
        <Row k="Name" v={c.name || '–'} />
        <Row k="Owner" v={c.ownerSafe ? `${c.ownerSafe.slice(0, 6)}…${c.ownerSafe.slice(-4)}` : '–'} />
        <p className={s.note}>
          Want to see one running first? <Link to="/vaults">Orphic's own pair</Link> is the same template with Felix on.
        </p>
      </aside>
    </div>
  )
}

function Opt({ on, onClick, title, text, note, tag }: { on: boolean; onClick: () => void; title: string; text: string; note?: string; tag?: string }) {
  return (
    <button type="button" className={`${s.opt} ${on ? s.optOn : ''}`} onClick={onClick} aria-pressed={on}>
      {tag && <span className={s.pill}>{tag}</span>}
      <span className={s.optTitle}>{title}</span>
      <span className={s.optText}>{text}</span>
      {note && <span className={s.optNote}>{note}</span>}
    </button>
  )
}

function Select<T extends number>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: number) => void; options: [number, string][] }) {
  return (
    <label className={s.field}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className={s.row}>
      <span>{k}</span>
      <b>{v}</b>
    </div>
  )
}

export type { AgentChoice, Template }
