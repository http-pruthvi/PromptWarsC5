import { useCallback, useEffect, useState } from 'react'
import type { Currency } from '../types'

export const uid = () => Math.random().toString(36).slice(2, 10)

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
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)
}

export function weeksUntil(dateStr: string, from = new Date()): number {
  const d = new Date(dateStr + 'T00:00:00')
  return Math.max(0, Math.round(((d.getTime() - from.getTime()) / 86400000 / 7) * 10) / 10)
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

export function pick<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

export function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage unavailable */
    }
  }, [key, value])
  const set = useCallback((v: T | ((p: T) => T)) => setValue(v), [])
  return [value, set]
}

export function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
