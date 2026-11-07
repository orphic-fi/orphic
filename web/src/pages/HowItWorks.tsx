import { useEffect, useRef, useState } from 'react'
import s from './Pages.module.css'

export default function HowItWorks() {
  const ref = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(1200)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let ro: ResizeObserver | undefined
    const measure = () => {
      try {
        const doc = el.contentDocument
        if (!doc) return
        const h = Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0)
        if (h > 0) setHeight(h)
        if (!ro && doc.body) {
          ro = new ResizeObserver(() => measure())
          ro.observe(doc.body)
        }
      } catch {
        // Same-origin file; nothing to catch in practice.
      }
    }
    el.addEventListener('load', measure)
    measure()
    return () => {
      el.removeEventListener('load', measure)
      ro?.disconnect()
    }
  }, [])

  return (
    <>
      <div className={s.pageHead}>
        <h1 className={s.title}>How it works</h1>
      </div>
      <ul className={s.lines}>
        <li>
          <span>Senior</span>
          <span>USDC sits in a Morpho Vault V2 on HyperEVM that we curate, allocated to whitelisted USDC markets with at least 10% kept idle.</span>
        </li>
        <li>
          <span>Junior</span>
          <span>USDC sits in the Orphic junior contract on HyperEVM. 20% of each deposit is staked in ORPH. Junior takes the first loss and is paid after senior.</span>
        </li>
        <li>
          <span>Agents</span>
          <span>
            Agents can move funds only between venues on an allowlist and only within caps. They cannot withdraw to any other address, change caps, or
            pause withdrawals.
          </span>
        </li>
        <li>
          <span>Unaudited</span>
          <span>The junior contract, the keeper and the agent allowlist are unaudited. Morpho Vault V2 is audited upstream; our curation of it is not.</span>
        </li>
      </ul>
      <iframe ref={ref} className={s.frame} src="/flow/how-it-works.html" title="Flow of funds" style={{ height }} scrolling="no" />
    </>
  )
}
