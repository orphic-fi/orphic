import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DEFAULT_CONFIG, STEPS, VENUES, loadDraft, problems, saveDraft, split, toRequest, type BuilderConfig } from '../lib/builder'
import { fmtPct, fmtUsd } from '../lib/format'
import { useFelixSpotRate, useHlp, useHyperLendUsdc, useMorphoMarketRates } from '../lib/onchainRates'
import s from './Builder.module.css'

const REQUEST_TO = 'https://t.me/ushouldcashout'
const SWATCHES = ['#7c5cff', '#4f8cff', '#ff7a2f', '#e05cff', '#1fb37a', '#f3c66f', '#ece9e1']

const TEMPLATE_NAME = { pair: 'Senior and junior', senior: 'Senior only', strategy: 'Strategy vault' } as const
const AGENT_NAME = { rotator: 'Orphic Rotator', 'rotator-ranger': 'Rotator plus Ranger', own: 'Your own agent' } as const

export default function Builder() {
  const [c, setC] = useState<BuilderConfig>(() => loadDraft())
  const [step, setStep] = useState(0)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    saveDraft(c)
  }, [c])
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])
  const set = <K extends keyof BuilderConfig>(k: K, v: BuilderConfig[K]) => setC((x) => ({ ...x, [k]: v }))

  const markets = useMorphoMarketRates()
  const felix = useFelixSpotRate(markets.data)
  const hyperlend = useHyperLendUsdc()
  const hlp = useHlp()
  const rate = (id: string) => {
    if (id === 'felix') return felix.spotApy === null ? '–' : fmtPct(felix.spotApy)
    if (id === 'hyperlend') return hyperlend.apy === null ? '–' : fmtPct(hyperlend.apy)
    if (id === 'morpho') {
      const best = (markets.data ?? []).reduce<number | null>((b, m) => (b === null || m.supplyApy > b ? m.supplyApy : b), null)
      return best === null ? '–' : `up to ${fmtPct(best)}`
    }
    if (id === 'hlp') return hlp.data?.realised30dAnnualised == null ? '–' : fmtPct(hlp.data.realised30dAnnualised)
    return 'fees, no rate'
  }

  const issues = useMemo(() => problems(c), [c])
  const issuesHere = issues.filter((i) => i.step === step)
  const sp = split(c)
  const venuesOn = c.venues.filter((v) => v.on)
  const venueName = (id: string) => VENUES.find((v) => v.id === id)?.name.split(',')[0] ?? id
  const isPair = c.template === 'pair'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toRequest(c))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard can be blocked; the text below is selectable */
    }
  }

  return (
    <div className={`wrap ${s.page}`}>
      <header className={s.top}>
        <div>
          <div className={s.k}>Builder</div>
          <h1 className={s.h1}>Your own vault, on Orphic's rails</h1>
          <p className={s.lede}>
            Six short steps, about five minutes. You choose the shape, the venues, the agent and the fees; Orphic deploys the same audited contracts it runs itself and hands ownership to your Safe.
            Nothing deploys from this page.
          </p>
        </div>
        <button type="button" className={s.reset} onClick={() => setC(DEFAULT_CONFIG)}>
          Start over
        </button>
      </header>

      <ol className={s.stepper} aria-label="Steps">
        {STEPS.map((n, i) => {
          const bad = issues.some((p) => p.step === i)
          return (
            <li key={n}>
              <button type="button" className={`${s.stepBtn} ${i === step ? s.stepNow : ''} ${i < step ? s.stepDone : ''}`} onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined}>
                <span className={`${s.c} ${bad && i < step ? s.cBad : ''}`}>{bad && i < step ? '!' : i < step ? '✓' : i + 1}</span>
                <span className={s.stepName}>{n}</span>
              </button>
            </li>
          )
        })}
      </ol>

      <div className={s.body}>
        <section className={s.main}>
          {step === 0 && (
            <Step title="Pick a template" why="A template is a pair of audited contracts Orphic already runs for itself. It decides whether your users get one door or two.">
              <div className={s.opts}>
                <Opt
                  on={c.template === 'pair'}
                  onClick={() => set('template', 'pair')}
                  tag="most common"
                  title="Senior and junior"
                  text="Two vaults, one book. Senior is first in line and earns the base rate. Junior takes the first loss and earns senior's fee on top. Your users pick their side."
                  note="This is what Orphic runs for itself."
                />
                <Opt
                  on={c.template === 'senior'}
                  onClick={() => set('template', 'senior')}
                  title="Senior only"
                  text="One audited Morpho vault with Orphic's agent rotating between venues. Simplest to explain. No first-loss layer, so a loss at a venue is the vault's loss."
                  note="Good for a treasury or a stablecoin project."
                />
                <Opt
                  on={c.template === 'strategy'}
                  onClick={() => set('template', 'strategy')}
                  title="Strategy vault"
                  text="One vault, one strategy: a range on a pool, a lending rotation. Higher risk, and shown as a bet on every page."
                  note="Needs Ranger or your own agent."
                />
              </div>
              <Help>
                Not sure? <Link to="/vaults">Orphic's own pair</Link> is the first template, live, with real numbers.
              </Help>
            </Step>
          )}

          {step === 1 && (
            <Step
              title="Venues the agent may use"
              why="The agent can only send money to venues on this list; the rules contract enforces that onchain. Turn on what you trust and cap each one so no single venue can be the whole book."
              issues={issuesHere}
            >
              <div className={s.venues}>
                {VENUES.map((v) => {
                  const ch = c.venues.find((x) => x.id === v.id)!
                  return (
                    <div key={v.id} className={`${s.venue} ${ch.on ? s.venueOn : ''}`}>
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
                      <div className={s.venueText}>
                        <div className={s.nm}>
                          {v.name}
                          {v.soon && <span className={s.pill}>adapter coming</span>}
                          {v.slow && <span className={s.pill}>slow exit</span>}
                        </div>
                        <div className={s.sub}>
                          {v.sub} · {v.chain}
                        </div>
                      </div>
                      <div className={s.venueRate}>
                        <span className={s.num}>{rate(v.id)}</span>
                        <small>{v.id === 'hlp' ? '30-day realised' : 'rate now'}, from the venue</small>
                      </div>
                      <label className={s.venueCap}>
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
                        <small>cap of the book</small>
                      </label>
                    </div>
                  )
                })}
              </div>
              <Help>
                "Adapter coming" venues can be switched on now. They start earning once their adapter is live and reviewed; the config does not change. Rates are the venues' own, as of today, and are
                estimates.
              </Help>
            </Step>
          )}

          {step === 2 && (
            <Step title="Who runs the book" why="The agent moves money between your venues on rules you can read here. It holds no keys to anything else." issues={issuesHere}>
              <div className={s.opts}>
                <Opt
                  on={c.agent === 'rotator'}
                  onClick={() => set('agent', 'rotator')}
                  title="Orphic Rotator"
                  text="Moves between your lenders on a 7-day rate net of gas, inside your caps, and settles on your schedule. The same agent that runs Orphic's own book."
                  note="Recommended for the first two templates."
                />
                <Opt
                  on={c.agent === 'rotator-ranger'}
                  onClick={() => set('agent', 'rotator-ranger')}
                  title="Rotator plus Ranger"
                  text="Rotator for the lenders, Ranger for one range on the Nest HYPE/USDC pool. The range is a bet and is labelled as one."
                  note="Needs the Nest venue on."
                />
                <Opt
                  on={c.agent === 'own'}
                  onClick={() => set('agent', 'own')}
                  title="Your own agent"
                  text="An agent you upload under your Circuit partner id. It can only call the venues you switched on."
                  note="You bring the Circuit agent id."
                />
              </div>
              {c.agent === 'own' && (
                <Field
                  label="Circuit agent id"
                  help="From Circuit's agent page, 36 characters."
                  input={<input value={c.ownAgentId ?? ''} onChange={(e) => set('ownAgentId', e.target.value.trim())} placeholder="00000000-0000-0000-0000-000000000000" />}
                />
              )}
              <div className={s.grid3}>
                <Field
                  label="Settle every"
                  help="Deposits and exits land at the settle; the agent also pays fees then."
                  input={
                    <Select
                      value={c.settleDays}
                      onChange={(v) => set('settleDays', v as 7)}
                      options={[
                        [7, '7 days'],
                        [14, '14 days'],
                        [30, '30 days'],
                      ]}
                    />
                  }
                />
                <Field
                  label="Move only if the gain beats gas by"
                  help="Stops the agent churning for pennies. 3× is what Orphic uses."
                  input={
                    <Select
                      value={c.gasMultiple}
                      onChange={(v) => set('gasMultiple', v as 3)}
                      options={[
                        [3, '3×'],
                        [5, '5×'],
                        [10, '10×'],
                      ]}
                    />
                  }
                />
                <Field
                  label="Pause if a venue loses more than"
                  help="A loss this size in one week freezes the agent until the owner looks."
                  input={
                    <Select
                      value={c.pauseLossPct}
                      onChange={(v) => set('pauseLossPct', v as 2)}
                      options={[
                        [1, '1% in a week'],
                        [2, '2% in a week'],
                        [5, '5% in a week'],
                      ]}
                    />
                  }
                />
              </div>
            </Step>
          )}

          {step === 3 && (
            <Step
              title="Tranches and fees"
              why={
                isPair
                  ? 'The tranche split decides how much loss junior absorbs before senior feels it. The fees decide who gets what, and every fee is visible onchain.'
                  : 'This template has no first-loss layer. The fees decide who gets what, and every fee is visible onchain.'
              }
              issues={issuesHere}
            >
              <div className={s.split}>
                <div className={s.stack}>
                  {isPair && (
                    <Field
                      label="Junior covers losses up to"
                      help="Senior deposits close when junior is thinner than this, so senior is never unprotected. 10% has covered every week of Orphic's own book so far."
                      input={
                        <Unit after="% of senior">
                          <input type="number" min={5} max={50} step={5} value={c.juniorCoverPct} onChange={(e) => set('juniorCoverPct', Number(e.target.value))} />
                        </Unit>
                      }
                    />
                  )}
                  <div className={s.grid2}>
                    <Field
                      label="Management fee on senior"
                      help={isPair ? 'Paid to junior in senior shares; it is what junior earns for taking the first loss.' : 'Paid to your Safe, in vault shares.'}
                      input={
                        <Unit after="% a year">
                          <input type="number" min={0} max={3} step={0.25} value={c.mgmtFeePct} onChange={(e) => set('mgmtFeePct', Number(e.target.value))} />
                        </Unit>
                      }
                    />
                    <Field
                      label="Performance fee"
                      help="A share of the yield, split 70 / 20 / 10 between you, the agent bucket and Orphic."
                      input={
                        <Unit after="% of yield">
                          <input type="number" min={0} max={30} step={1} value={c.perfFeePct} onChange={(e) => set('perfFeePct', Number(e.target.value))} />
                        </Unit>
                      }
                    />
                  </div>
                  <div className={s.grid2}>
                    <Field
                      label="Vault cap"
                      help="Total the vault accepts. Raise it later from the Safe."
                      input={
                        <Unit before="$">
                          <input type="number" min={50_000} step={50_000} value={c.seniorCapUsd} onChange={(e) => set('seniorCapUsd', Number(e.target.value))} />
                        </Unit>
                      }
                    />
                    <Field
                      label="Per wallet cap"
                      help="Keeps one depositor from being the whole vault in week one."
                      input={
                        <Unit before="$">
                          <input type="number" min={1_000} step={5_000} value={c.walletCapUsd} onChange={(e) => set('walletCapUsd', Number(e.target.value))} />
                        </Unit>
                      }
                    />
                  </div>
                </div>
                <div className={s.card}>
                  <div className={s.k}>Who gets what</div>
                  <p className={s.cardLede}>At $1M in senior earning 5% gross for a year. An illustration at a fixed rate, not a forecast.</p>
                  <Row k="Senior holders" v={fmtUsd(sp.seniorHolders)} />
                  {isPair ? <Row k="Junior holders, from the fee" v={`${fmtUsd(sp.juniorFromFee)} plus their own yield`} /> : <Row k="Your Safe, management fee" v={fmtUsd(sp.juniorFromFee)} />}
                  <Row k="You, performance" v={fmtUsd(sp.team)} />
                  <Row k="Agent bucket" v={fmtUsd(sp.agent)} />
                  <Row k="Orphic" v={fmtUsd(sp.orphic)} />
                </div>
              </div>
            </Step>
          )}

          {step === 4 && (
            <Step
              title="Name it, and say who owns it"
              why="Your name and colour go on the vault's page. The Safe you name here becomes the owner: it can change rules, raise caps and pause, each with a 24 hour delay."
              issues={issuesHere}
            >
              <div className={s.split}>
                <div className={s.stack}>
                  <div className={s.grid2}>
                    <Field
                      label="Vault name"
                      help="Shown on the page and as the token name."
                      input={<input value={c.name} onChange={(e) => set('name', e.target.value)} placeholder="pompVAULT USDC" />}
                    />
                    <Field
                      label="Symbol"
                      help="2 to 8 letters or digits; the share token's ticker."
                      input={<input value={c.symbol} onChange={(e) => set('symbol', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="PUSDC" maxLength={8} />}
                    />
                  </div>
                  <Field
                    label="Accent colour"
                    help="Used for the page's highlights. Pick one or type a hex."
                    input={
                      <div className={s.swatches}>
                        {SWATCHES.map((h) => (
                          <button
                            key={h}
                            type="button"
                            className={`${s.swatch} ${c.accent.toLowerCase() === h ? s.swatchOn : ''}`}
                            style={{ background: h }}
                            onClick={() => set('accent', h)}
                            aria-label={h}
                          />
                        ))}
                        <input value={c.accent} onChange={(e) => set('accent', e.target.value)} className={s.hex} />
                      </div>
                    }
                  />
                  <Field
                    label="Where it lives"
                    help="A domain you own, pointed at Orphic; or leave blank to embed the vault in your own app with one script tag."
                    input={<input value={c.domain} onChange={(e) => set('domain', e.target.value.trim())} placeholder="vaults.yourapp.xyz" />}
                  />
                  <Field
                    label="Disclosure line"
                    help="Required. Shown on every page of the vault. Edit the wording, keep the substance."
                    input={<textarea value={c.disclosure} onChange={(e) => set('disclosure', e.target.value)} rows={3} />}
                  />
                  <div className={s.grid2}>
                    <Field
                      label="Owner Safe on HyperEVM"
                      help="A Safe, not a single key. It accepts ownership with one signature after deploy."
                      input={
                        <input
                          value={c.ownerSafe}
                          onChange={(e) => set('ownerSafe', e.target.value.trim())}
                          placeholder="0x…"
                          className={c.ownerSafe && !/^0x[0-9a-fA-F]{40}$/.test(c.ownerSafe) ? s.bad : ''}
                        />
                      }
                    />
                    <Field
                      label="Contact for the review"
                      help="Where Orphic reaches you with questions. Telegram handle or email."
                      input={<input value={c.contact} onChange={(e) => set('contact', e.target.value)} placeholder="@handle or you@team.xyz" />}
                    />
                  </div>
                </div>
                <div className={s.card}>
                  <div className={s.k}>How it will look</div>
                  <div className={s.preview} style={{ borderTopColor: c.accent }}>
                    <div className={s.pvName}>
                      <span className={s.logo} style={{ background: c.accent }}>
                        {(c.name || 'V').slice(0, 1)}
                      </span>
                      {c.name || 'Your vault'}
                    </div>
                    <div className={s.pvLine}>
                      {TEMPLATE_NAME[c.template]} · {venuesOn.map((v) => venueName(v.id)).join(', ') || 'no venues yet'}
                    </div>
                    <div className={s.bar}>
                      <i style={{ width: isPair ? '70%' : '100%', background: c.accent }} />
                    </div>
                    <small>{c.disclosure.slice(0, 80)}…</small>
                    <small>Powered by Orphic · runs on Circuit</small>
                  </div>
                </div>
              </div>
            </Step>
          )}

          {step === 5 && (
            <Step title="Review and request" why="Check the summary, then send the config to Orphic. Nothing moves until you accept ownership from your Safe." issues={issues}>
              <div className={s.card}>
                <div className={s.k}>What will be deployed</div>
                <Row k="Template" v={TEMPLATE_NAME[c.template]} />
                <Row k="Venues and caps" v={venuesOn.map((v) => `${venueName(v.id)} ${v.capPct}%`).join(' · ') || '–'} />
                <Row k="Agent" v={c.agent === 'own' ? `Own agent ${c.ownAgentId ?? ''}` : AGENT_NAME[c.agent]} />
                <Row k="Rules" v={`settle every ${c.settleDays} days · move when gain beats gas ${c.gasMultiple}× · pause on a ${c.pauseLossPct}% weekly loss`} />
                {isPair && <Row k="Junior cover" v={`${c.juniorCoverPct}% of senior`} />}
                <Row k="Fees" v={`${c.mgmtFeePct}% a year management · ${c.perfFeePct}% of yield, 70/20/10`} />
                <Row k="Caps" v={`${fmtUsd(c.seniorCapUsd)} vault · ${fmtUsd(c.walletCapUsd)} per wallet`} />
                <Row k="Name" v={c.name ? `${c.name} (${c.symbol || '–'})` : '–'} />
                <Row k="Site" v={c.domain || 'embedded in your app'} />
                <Row k="Owner" v={c.ownerSafe || '–'} />
                <Row k="Contact" v={c.contact || '–'} />
              </div>

              <div className={s.next}>
                <div className={s.k}>What happens next</div>
                <ol className={s.timeline}>
                  <li>
                    <b>You send the config.</b> Copy it and send it to Orphic on Telegram, or paste it in your reply to the review contact.
                  </li>
                  <li>
                    <b>Orphic reviews it, usually within two working days.</b> The venues, caps and fees are checked against the adapters and the rules contract; you get questions if anything is odd.
                  </li>
                  <li>
                    <b>Orphic deploys and verifies.</b> The same scripts and signer flow Orphic uses for its own pair; the state is read back onchain and compared with this page.
                  </li>
                  <li>
                    <b>Your Safe accepts ownership, one signature.</b> Deposits open, the vault page goes live at your domain or in your app, and Orphic keeps nothing but the agent role.
                  </li>
                </ol>
              </div>

              <div className={s.actions}>
                <button type="button" className={s.primary} disabled={issues.length > 0} onClick={copy}>
                  {copied ? 'Copied' : 'Copy the config'}
                </button>
                <a href={REQUEST_TO} target="_blank" rel="noreferrer" className={s.ghost}>
                  Open Orphic on Telegram
                </a>
                {issues.length > 0 && <span className={s.hint}>Fix the items above to enable copying.</span>}
              </div>
              <details className={s.details}>
                <summary>The config itself</summary>
                <textarea className={s.json} readOnly value={toRequest(c)} rows={12} />
              </details>
              <Help>
                Phase one is a reviewed deploy, not a button. Phase two replaces it with a factory call signed from your Safe. The config format stays the same, so what you write here keeps working.
              </Help>
            </Step>
          )}

          <div className={s.navBtns}>
            {step > 0 ? (
              <button type="button" className={s.ghost} onClick={() => setStep(step - 1)}>
                Back
              </button>
            ) : (
              <span />
            )}
            {step < 5 ? (
              <button type="button" className={s.primary} onClick={() => setStep(step + 1)}>
                {step === 4 ? 'Review' : `Continue to ${STEPS[step + 1].toLowerCase()}`}
              </button>
            ) : null}
          </div>
        </section>

        <aside className={s.summary}>
          <div className={s.k}>Your vault so far</div>
          <Row k="Template" v={TEMPLATE_NAME[c.template]} hi={step === 0} />
          <Row k="Venues on" v={venuesOn.map((v) => venueName(v.id)).join(', ') || 'none'} hi={step === 1} />
          <Row k="Agent" v={AGENT_NAME[c.agent]} hi={step === 2} />
          <Row k="Settle" v={`every ${c.settleDays} days`} hi={step === 2} />
          {isPair && <Row k="Junior cover" v={`${c.juniorCoverPct}% of senior`} hi={step === 3} />}
          <Row k="Fees" v={`${c.mgmtFeePct}% a year · ${c.perfFeePct}% of yield`} hi={step === 3} />
          <Row k="Caps" v={`${fmtUsd(c.seniorCapUsd)} · ${fmtUsd(c.walletCapUsd)} per wallet`} hi={step === 3} />
          <Row k="Name" v={c.name ? `${c.name} (${c.symbol || '–'})` : '–'} hi={step === 4} />
          <Row k="Owner" v={c.ownerSafe ? `${c.ownerSafe.slice(0, 6)}…${c.ownerSafe.slice(-4)}` : '–'} hi={step === 4} />
          <div className={s.readiness}>
            {issues.length === 0 ? (
              <span className={s.ok}>Ready to request</span>
            ) : (
              <span>
                {issues.length} thing{issues.length > 1 ? 's' : ''} to fix before requesting
                <ul>
                  {issues.map((p) => (
                    <li key={p.text}>
                      <button type="button" onClick={() => setStep(p.step)}>
                        {STEPS[p.step]}
                      </button>
                      : {p.text}
                    </li>
                  ))}
                </ul>
              </span>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

function Step({ title, why, issues, children }: { title: string; why: string; issues?: { text: string }[]; children: ReactNode }) {
  return (
    <>
      <h2 className={s.h2}>{title}</h2>
      <p className={s.why}>{why}</p>
      {issues && issues.length > 0 && (
        <div className={s.issues}>
          {issues.map((i) => (
            <div key={i.text}>{i.text}</div>
          ))}
        </div>
      )}
      {children}
    </>
  )
}

function Field({ label, help, input }: { label: string; help?: string; input: ReactNode }) {
  return (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      {input}
      {help && <small>{help}</small>}
    </label>
  )
}

function Unit({ before, after, children }: { before?: string; after?: string; children: ReactNode }) {
  return (
    <span className={s.unit}>
      {before && <span>{before}</span>}
      {children}
      {after && <span>{after}</span>}
    </span>
  )
}

function Help({ children }: { children: ReactNode }) {
  return <p className={s.help}>{children}</p>
}

function Opt({ on, onClick, title, text, note, tag }: { on: boolean; onClick: () => void; title: string; text: string; note?: string; tag?: string }) {
  return (
    <button type="button" className={`${s.opt} ${on ? s.optOn : ''}`} onClick={onClick} aria-pressed={on}>
      <span className={s.optHead}>
        <span className={s.optTitle}>{title}</span>
        {tag && <span className={s.pill}>{tag}</span>}
      </span>
      <span className={s.optText}>{text}</span>
      {note && <span className={s.optNote}>{note}</span>}
    </button>
  )
}

function Select<T extends number>({ value, onChange, options }: { value: T; onChange: (v: number) => void; options: [number, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  )
}

function Row({ k, v, hi }: { k: string; v: string; hi?: boolean }) {
  return (
    <div className={`${s.row} ${hi ? s.rowHi : ''}`}>
      <span>{k}</span>
      <b>{v}</b>
    </div>
  )
}
