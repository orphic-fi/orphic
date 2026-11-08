import { useAnimatedNumber } from '../hooks/useAnimatedNumber'
import { fmtPct } from '../lib/format'
import s from './CapRing.module.css'

const GAP_DEG = 40
const GAP_CENTRE_DEG = 45 // clockwise from top: top right
const GAP_LEFT = GAP_CENTRE_DEG - GAP_DEG / 2 // 25
const GAP_RIGHT = GAP_CENTRE_DEG + GAP_DEG / 2 // 65
const BOTTOM = 180 // both arcs meet at the ring's bottom point
// The gap sits top right, so the two sides are unequal: senior runs over the top and down the left
// (205 degrees), junior down the right (115 degrees). Each fills its own span from 0 to 100%.
const SENIOR_SPAN = 360 - BOTTOM + GAP_LEFT // 205
const JUNIOR_SPAN = BOTTOM - GAP_RIGHT // 115

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

/** Arc path from angle a to angle b (degrees clockwise from top). */
function arc(cx: number, cy: number, r: number, a: number, b: number): string {
  const [x1, y1] = polar(cx, cy, r, a)
  const [x2, y2] = polar(cx, cy, r, b)
  const sweep = b > a ? 1 : 0
  const large = Math.abs(b - a) > 180 ? 1 : 0
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

export default function CapRing({ senior, junior }: { senior: number | null; junior: number | null }) {
  const sen = useAnimatedNumber(senior) ?? 0
  const jun = useAnimatedNumber(junior) ?? 0
  // viewBox in CSS pixels at desktop size so stroke widths are literal; the mobile media query rescales them.
  const size = 560
  const c = size / 2
  const r = c - 4
  const seniorLen = (SENIOR_SPAN / 360) * 2 * Math.PI * r
  const juniorLen = (JUNIOR_SPAN / 360) * 2 * Math.PI * r
  const dash = (frac: number, len: number) => `${(Math.max(0, Math.min(1, frac)) * len).toFixed(2)} ${(len + 10).toFixed(2)}`

  // Senior: from the gap's left edge, anticlockwise over the top and down the left side to the bottom.
  const seniorPath = arc(c, c, r, GAP_LEFT, GAP_LEFT - SENIOR_SPAN)
  // Junior: from the gap's right edge, clockwise down the right side to the bottom.
  const juniorPath = arc(c, c, r, GAP_RIGHT, GAP_RIGHT + JUNIOR_SPAN)
  const track = arc(c, c, r, GAP_RIGHT, GAP_LEFT + 360)
  const [bx, by] = polar(c, c, r, BOTTOM)

  return (
    <figure className={s.ring} title="cap utilisation, live" aria-label="Cap utilisation">
      <svg viewBox={`0 0 ${size} ${size}`} className={s.svg} aria-hidden="true">
        <path d={track} className={s.track} />
        <path d={seniorPath} className={s.senior} style={{ strokeDasharray: dash(sen, seniorLen) }} />
        <path d={juniorPath} className={s.junior} style={{ strokeDasharray: dash(jun, juniorLen) }} />
        <circle cx={bx} cy={by} r={4} className={s.dot} />
      </svg>
      <figcaption className={s.caption}>
        <span>senior {senior === null ? 'n/a' : fmtPct(sen)}</span>
        <span className={s.sep}>·</span>
        <span>junior {junior === null ? 'n/a' : fmtPct(jun)}</span>
      </figcaption>
    </figure>
  )
}
