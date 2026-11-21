import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useVault } from '../hooks/useVault'
import { fmtUsd } from '../lib/format'
import s from './BuilderPlatform.module.css'

const TELEGRAM = 'https://t.me/ushouldcashout'

/**
 * The platform layer above the configurator: what every builder vault shares, the two ways in,
 * how fees split, who is on it, and the application form. Copy only; no rates, no promises.
 */
export default function BuilderPlatform({ onConfigure }: { onConfigure: () => void }) {
  const senior = useVault('senior')
  const junior = useVault('junior')
  const tvl = senior.tvl !== null && junior.tvl !== null ? senior.tvl + junior.tvl : null

  return (
    <div className={s.platform}>
      <header className={s.hero}>
        <div className={s.k}>Vaults as a service</div>
        <h1 className={s.h1}>One engine. Your vault, your brand, your domain.</h1>
        <p className={s.lede}>
          Launch an agentic USDC vault for your community, treasury or app without building one. Every builder vault runs on the same audited contracts, the same agent
          and the same venues Orphic uses for its own book. You choose the shape, the name and the fees; your Safe owns it; it lives on your domain.
        </p>
        <div className={s.heroActions}>
          <a href="#apply" className={s.primary}>
            Apply to build
          </a>
          <button type="button" className={s.ghost} onClick={onConfigure}>
            Configure a vault first
          </button>
        </div>
      </header>

      <section className={s.tiles} aria-label="What every builder vault shares">
        <div className={s.tile}>
          <div className={s.tileHead}>Shared engine</div>
          <p>
            Orphic's agent reads venue rates onchain, moves money only when the gain beats the gas, settles on a fixed cycle and pauses on a loss. The same rules contract
            bounds every vault on the platform.
          </p>
        </div>
        <div className={s.tile}>
          <div className={s.tileHead}>Shared venues</div>
          <p>
            Morpho markets, Felix and HyperLend today; HLP next. Builders pick from the venue list Orphic has already audited and capped; nothing outside it can receive
            funds.
          </p>
        </div>
        <div className={s.tile}>
          <div className={s.tileHead}>Your brand</div>
          <p>
            Your name, your colour, your fee, your domain. Depositors see your vault; Orphic is a line in the footer. Ownership sits with your Safe from the first
            signature.
          </p>
        </div>
      </section>

      <section className={s.ways} aria-label="Two ways to build">
        <div className={s.k}>Two ways in</div>
        <div className={s.wayGrid}>
          <div className={s.way}>
            <h2 className={s.h2}>White label</h2>
            <p>
              Orphic deploys your vault pair and hosts the vault pages. You point a domain you own at it, and that is where your depositors go. Nothing on it says
              orphic.fi except a line in the footer.
            </p>
            <ul className={s.list}>
              <li>Configured on this page, reviewed by Orphic, deployed with the same scripts Orphic uses for itself</li>
              <li>Your domain, your name and colour, your disclosure line</li>
              <li>Ownership handed to your Safe with one signature</li>
            </ul>
            <div className={s.wayFoot}>
              <button type="button" className={s.link} onClick={onConfigure}>
                Configure your vault below
              </button>
            </div>
          </div>
          <div className={s.way}>
            <h2 className={s.h2}>Embedded</h2>
            <p>
              Your app already has users and a front end. Keep it. Deposits are one ERC-4626 call against your vault's address; the rates, the venue split and the settle
              clock come from the same reads the Orphic site uses.
            </p>
            <ul className={s.list}>
              <li>Contract addresses and ABIs published after deploy</li>
              <li>A read package with the hooks behind the Orphic vault page</li>
              <li>Your UI, your wallet flow; Orphic only runs the agent</li>
            </ul>
            <div className={s.wayFoot}>
              <Link to="/docs" className={s.link}>
                Read the docs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={s.fees} aria-label="How fees work">
        <div className={s.k}>How fees work</div>
        <div className={s.feeRow}>
          <div>
            <h2 className={s.h2}>You set the fee. The split is a rule, not a negotiation.</h2>
            <p className={s.lede}>
              A builder vault charges the management and performance fee you choose inside the platform's bounds. Orphic keeps a fixed share of what the vault earns in
              fees for running the agent and the contracts; the rest is paid to your Safe onchain by the same fee router Orphic's own pair uses. Nothing is paid by hand.
            </p>
          </div>
          <dl className={s.feeList}>
            <div>
              <dt>Who sets the fee</dt>
              <dd>You, within platform bounds</dd>
            </div>
            <div>
              <dt>Who gets paid</dt>
              <dd>Your Safe, onchain, every settle</dd>
            </div>
            <div>
              <dt>Orphic's share</dt>
              <dd>A fixed slice of fee income, agreed before deploy</dd>
            </div>
            <div>
              <dt>Depositor funds</dt>
              <dd>Never touched by either side</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className={s.builders} aria-label="Builders on Orphic">
        <div className={s.k}>On the platform</div>
        <div className={s.builderGrid}>
          <Link to="/vaults" className={s.builder}>
            <div className={s.builderName}>
              <span className={s.dot} />
              Orphic
            </div>
            <div className={s.builderLine}>Senior and junior, USDC on HyperEVM. The first template, live.</div>
            <div className={s.builderStat}>{tvl === null ? 'Live' : `${fmtUsd(tvl)} in the book`}</div>
          </Link>
          <a href="#apply" className={`${s.builder} ${s.builderOpen}`}>
            <div className={s.builderName}>Your vault</div>
            <div className={s.builderLine}>The second slot is open.</div>
            <div className={s.builderStat}>Apply</div>
          </a>
          <div className={`${s.builder} ${s.builderEmpty}`} aria-hidden="true" />
          <div className={`${s.builder} ${s.builderEmpty}`} aria-hidden="true" />
        </div>
      </section>

      <ApplyForm />
    </div>
  )
}

type Form = { project: string; contact: string; kind: string; size: string; domain: string; notes: string }
const EMPTY: Form = { project: '', contact: '', kind: 'White label', size: '', domain: '', notes: '' }

function ApplyForm() {
  const [f, setF] = useState<Form>(EMPTY)
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const ok = f.project.trim().length > 1 && f.contact.trim().length > 2

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!ok || state === 'sending') return
    setState('sending')
    try {
      const r = await fetch('/api/apply', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) })
      setState(r.ok ? 'sent' : 'failed')
    } catch {
      setState('failed')
    }
  }

  return (
    <section id="apply" className={s.apply} aria-label="Apply to build">
      <div className={s.applyText}>
        <div className={s.k}>Apply</div>
        <h2 className={s.h2}>Tell us what you want to launch.</h2>
        <p className={s.lede}>
          The first builders are onboarded by hand. Send the basics here; Orphic replies within two working days with questions, then a config to review. Nothing deploys
          until your Safe signs.
        </p>
      </div>
      {state === 'sent' ? (
        <div className={s.sent}>
          <b>Received.</b> Orphic will reply to {f.contact.trim()} within two working days.
        </div>
      ) : (
        <form className={s.form} onSubmit={submit}>
          <label>
            <span>Project or community</span>
            <input value={f.project} onChange={set('project')} placeholder="Name" required />
          </label>
          <label>
            <span>How to reach you</span>
            <input value={f.contact} onChange={set('contact')} placeholder="@telegram, @x or email" required />
          </label>
          <label>
            <span>Which way in</span>
            <select value={f.kind} onChange={set('kind')}>
              <option>White label</option>
              <option>Embedded</option>
              <option>Not sure yet</option>
            </select>
          </label>
          <label>
            <span>Expected size</span>
            <select value={f.size} onChange={set('size')}>
              <option value="">Prefer not to say</option>
              <option>Under $100k</option>
              <option>$100k to $1m</option>
              <option>$1m to $10m</option>
              <option>Over $10m</option>
            </select>
          </label>
          <label className={s.wide}>
            <span>Domain or app it will live on</span>
            <input value={f.domain} onChange={set('domain')} placeholder="vaults.yourapp.xyz, or the app's name" />
          </label>
          <label className={s.wide}>
            <span>Anything else</span>
            <textarea value={f.notes} onChange={set('notes')} rows={3} placeholder="Who the depositors are, venues you care about, timing" />
          </label>
          <div className={`${s.wide} ${s.formFoot}`}>
            <button type="submit" className={s.primary} disabled={!ok || state === 'sending'}>
              {state === 'sending' ? 'Sending' : 'Send application'}
            </button>
            {state === 'failed' && (
              <span className={s.fail}>
                Could not send just now. Message{' '}
                <a href={TELEGRAM} target="_blank" rel="noreferrer">
                  Orphic on Telegram
                </a>{' '}
                instead.
              </span>
            )}
          </div>
        </form>
      )}
    </section>
  )
}
