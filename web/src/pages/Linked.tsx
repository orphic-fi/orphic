import { Link } from 'react-router-dom'
import s from './Pages.module.css'

/** Where Circuit sends the user back after the passkey. The tab that started the link already has the permit. */
export default function Linked() {
  return (
    <div className={`wrap ${s.page}`}>
      <section className={s.hero}>
        <h1 className={s.h1}>Linked. You can close this tab.</h1>
        <p style={{ color: 'var(--muted)', maxWidth: 520 }}>
          The Orphic tab you started from has picked up the link. If you closed it, <Link to="/agents">open the agents page</Link> and link again; it takes one passkey.
        </p>
      </section>
    </div>
  )
}
