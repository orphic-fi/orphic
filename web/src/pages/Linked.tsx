import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import s from './Pages.module.css'

/** Where Circuit sends the user back after the passkey. Opened as a popup from Orphic, it closes itself. */
export default function Linked() {
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        window.close()
      } catch {
        /* not a popup: the message below stays */
      }
    }, 400)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className={`wrap ${s.page}`}>
      <section className={s.hero}>
        <h1 className={s.h1}>Linked.</h1>
        <p style={{ color: 'var(--muted)', maxWidth: 520 }}>
          Back to Orphic. If this window did not close on its own, close it; the page you started from has picked up the link. Or <Link to="/agents">open the agents page</Link>.
        </p>
      </section>
    </div>
  )
}
