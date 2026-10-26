import type { Currency } from '../types.js'

/**
 * Currency configuration metadata.
 */
export const CURRENCY_CONFIG: Record<Currency, { locale: string; symbol: string; fractionDigits: number }> = {
  INR: { locale: 'en-IN', symbol: '₹', fractionDigits: 0 },
  USD: { locale: 'en-US', symbol: '$', fractionDigits: 0 },
  EUR: { locale: 'de-DE', symbol: '€', fractionDigits: 0 },
}

/**
 * Format a numeric amount into localized currency string representation.
 *
 * @param amount - Number to format
 * @param currency - Supported currency code (default: 'INR')
 * @returns Localized currency string
 */
export function formatCurrency(amount: number, currency: Currency = 'INR'): string {
  const config = CURRENCY_CONFIG[currency] ?? CURRENCY_CONFIG.INR
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: config.fractionDigits,
    }).format(amount)
  } catch {
    return `${config.symbol}${Math.round(amount).toLocaleString()}`
  }
}

/**
 * Normalise a set of percentages or relative weights so that their sum equals exactly 100.
 *
 * @param weights - Array of non-negative numeric weights
 * @returns Array of integer percentages summing to 100
 */
export function normalisePercents(weights: readonly number[]): number[] {
  if (weights.length === 0) return []
  const totalWeight = weights.reduce((acc, w) => acc + Math.max(0, w), 0)
  if (totalWeight <= 0) {
    const equalShare = Math.floor(100 / weights.length)
    const result = Array<number>(weights.length).fill(equalShare)
    const remainder = 100 - equalShare * weights.length
    for (let i = 0; i < remainder; i++) {
      const current = result[i] ?? 0
      result[i] = current + 1
    }
    return result
  }

  const rawPercents = weights.map((w) => (Math.max(0, w) / totalWeight) * 100)
  const floored = rawPercents.map((p) => Math.floor(p))
  const remainder = 100 - floored.reduce((sum, p) => sum + p, 0)

  // Distribute residual based on highest fractions
  const fractionalOrder = rawPercents
    .map((p, index) => ({ frac: p - Math.floor(p), index }))
    .sort((a, b) => b.frac - a.frac)

  for (let i = 0; i < remainder && i < fractionalOrder.length; i++) {
    const item = fractionalOrder[i]
    if (item !== undefined) {
      const idx = item.index
      const curr = floored[idx] ?? 0
      floored[idx] = curr + 1
    }
  }

  return floored
}

/**
 * Safely compute cost per head with handling for zero guests.
 *
 * @param totalSpentOrAllocated - Total amount
 * @param confirmedGuests - Count of confirmed attendees
 * @returns Cost per attendee or null if headcount is non-positive
 */
export function calculateCostPerHead(totalSpentOrAllocated: number, confirmedGuests: number): number | null {
  if (confirmedGuests <= 0) return null
  return Math.round((totalSpentOrAllocated / confirmedGuests) * 100) / 100
}
