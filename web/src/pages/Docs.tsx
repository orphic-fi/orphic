import { Navigate, NavLink, useParams } from 'react-router-dom'
import { docPages, findDoc } from '../lib/docs'
import s from './Docs.module.css'

export default function Docs() {
  const { slug } = useParams()
  const page = findDoc(slug)
  if (!page) {
    if (docPages.length === 0) return <p className={s.empty}>No docs published yet.</p>
    return <Navigate to={`/docs/${docPages[0].slug}`} replace />
  }
  return (
    <div className="wrap" style={{ paddingTop: 32, paddingBottom: 56, flex: 1, width: "100%" }}>
    <div className={s.docs}>
      <nav className={s.nav} aria-label="Docs">
        <ol>
          {docPages.map((d) => (
            <li key={d.slug}>
              <NavLink to={`/docs/${d.slug}`}>{d.title}</NavLink>
            </li>
          ))}
        </ol>
      </nav>
      <article className={s.content} dangerouslySetInnerHTML={{ __html: page.html }} />
    </div>
    </div>
  )
}
