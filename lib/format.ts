const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'USD'

const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 })
const compactFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY, notation: 'compact', maximumFractionDigits: 1 })
const numberFmt = new Intl.NumberFormat('en-US')

export function formatCurrency(value: unknown, compact = false): string {
  if (value === null || value === undefined || value === '') return ''
  const n = Number(value)
  if (Number.isNaN(n)) return ''
  return compact ? compactFmt.format(n) : currencyFmt.format(n)
}

export function formatNumber(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  const n = Number(value)
  return Number.isNaN(n) ? '' : numberFmt.format(n)
}

/** Formats a YYYY-MM-DD date without shifting it across time zones. */
export function formatDate(value: unknown): string {
  if (!value) return ''
  const s = String(value).slice(0, 10)
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return s
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Today (UTC) as YYYY-MM-DD, offset by `days`. */
export function isoDate(days = 0): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function str(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

/** Strip characters that would break a PostgREST `or=` filter. */
export function safeSearch(q: string): string {
  return q.replace(/[,()*%\\:"']/g, ' ').trim().slice(0, 100)
}
