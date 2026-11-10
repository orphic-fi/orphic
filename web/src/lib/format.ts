const pct = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export const NA = 'n/a'

export function fmtPct(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return NA
  return pct.format(ratio)
}

export function fmtUsd(v: number | null | undefined, decimals: 0 | 2 = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return NA
  return decimals === 0 ? usd0.format(v) : usd2.format(v)
}

const num1 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const num4 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })

export function fmtNum(v: number | null | undefined, decimals: 0 | 1 | 2 | 4 = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return NA
  return decimals === 0 ? num0.format(v) : decimals === 1 ? num1.format(v) : decimals === 4 ? num4.format(v) : num2.format(v)
}

export function fmtUnits(v: bigint | undefined, decimals: number, places: 0 | 2 = 2): string {
  if (v === undefined) return NA
  return fmtNum(Number(v) / 10 ** decimals, places)
}

export function truncateAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export function fmtTime(ts: number | null): string {
  if (!ts) return NA
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(ts * 1000)) + ' UTC'
}
