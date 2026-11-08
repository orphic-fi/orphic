import { useQuery } from '@tanstack/react-query'
import { NA, fmtPct, fmtTime } from '../lib/format'
import s from './Pages.module.css'

interface Agent {
  id: string
  name: string
  status: string
  mandate: string
  cap: string
  weeklyReturn: number | null
}

interface AgentsFile {
  updatedAt: number | null
  agents: Agent[]
}

async function fetchAgents(): Promise<AgentsFile> {
  const res = await fetch('/agents.json', { cache: 'no-store' })
  if (!res.ok) throw new Error(`agents.json ${res.status}`)
  return (await res.json()) as AgentsFile
}

export default function Agents() {
  const q = useQuery({ queryKey: ['agents'], queryFn: fetchAgents, staleTime: 60_000 })

  return (
    <>
      <div className={s.pageHead}>
        <h1 className={s.title}>Agents</h1>
        <p className={s.lead}>Each agent runs under a fixed mandate and a cap. The keeper publishes this table after every weekly settle.</p>
      </div>
      {q.isLoading && <p className={`${s.mono} ${s.muted}`}>loading</p>}
      {q.isError && <p className={`${s.mono} ${s.muted}`}>Could not load agents.json. Reload to retry.</p>}
      {q.data && (
        <>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Status</th>
                <th>Mandate</th>
                <th>Cap</th>
                <th>realised, weekly</th>
              </tr>
            </thead>
            <tbody>
              {q.data.agents.map((a) => (
                <tr key={a.id}>
                  <td data-label="Agent" className={s.mono}>
                    {a.name}
                  </td>
                  <td data-label="Status" className={`${s.mono} ${a.status === 'live' ? '' : s.muted}`}>
                    <span className={`${s.square} ${a.status === 'live' ? s.squareLive : a.status.startsWith('week') ? s.squareSoon : ''}`} aria-hidden="true" />
                    {a.status}
                  </td>
                  <td data-label="Mandate" className={s.mandate}>
                    {a.mandate}
                  </td>
                  <td data-label="Cap">{a.cap}</td>
                  <td data-label="Weekly return" className={s.mono}>
                    {a.weeklyReturn === null ? 'n/a until first settle' : fmtPct(a.weeklyReturn)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={s.foot}>Published after each Sunday settle from the keeper's report. Last published: {q.data.updatedAt ? fmtTime(q.data.updatedAt) : NA}</p>
        </>
      )}
    </>
  )
}
