import type { Currency } from '@soiree/shared'

const LOCALES: Record<Currency, string> = { INR: 'en-IN', USD: 'en-US', EUR: 'de-DE' }

export function money(n: number, currency: Currency = 'INR'): string {
  return new Intl.NumberFormat(LOCALES[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

export function compactMoney(n: number, currency: Currency = 'INR'): string {
  if (currency === 'INR') {
    // Indian shorthand: K / L (lakh) / Cr (crore)
    const trim = (x: number) => String(Math.round(x * 10) / 10)
    if (n >= 1e7) return `₹${trim(n / 1e7)}Cr`
    if (n >= 1e5) return `₹${trim(n / 1e5)}L`
    if (n >= 1e3) return `₹${trim(n / 1e3)}K`
    return `₹${Math.round(n)}`
  }
  return new Intl.NumberFormat(LOCALES[currency], {
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)
}

export function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function todayISO(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}
