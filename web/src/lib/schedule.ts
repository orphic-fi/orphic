const DAY = 86_400
const WEEK = 7 * DAY

/** First UTC midnight at least 7 days from `nowSec`, as the junior contract computes readyAt. */
export function noticeEnds(nowSec: number): number {
  const t = nowSec + 7 * DAY
  return Math.ceil(t / DAY) * DAY
}

/**
 * First weekly settle at or after `t`. Settles happen at lastSettle + 7d multiples.
 * Without a stored lastSettle (not deployed), assume Sunday 00:00 UTC.
 */
export function settleAtOrAfter(t: number, lastSettle: number | undefined): number {
  if (lastSettle === undefined || lastSettle <= 0) {
    const d = new Date(t * 1000)
    const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000
    const daysToSunday = (7 - d.getUTCDay()) % 7
    const sunday = midnight + daysToSunday * DAY
    return sunday >= t ? sunday : sunday + WEEK
  }
  if (t <= lastSettle) return lastSettle
  const k = Math.ceil((t - lastSettle) / WEEK)
  return lastSettle + k * WEEK
}

export function fmtDateUtc(ts: number): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(ts * 1000))
}

export function fmtClockUtc(ms: number | undefined): string {
  if (!ms) return 'n/a'
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' }).format(new Date(ms))
}
