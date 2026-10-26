import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  calculateCostPerHead,
  formatCurrency,
  normalisePercents,
  daysUntil,
  getMilestoneTargetDate,
  formatDate,
} from '@soiree/shared'

describe('Shared Utilities Property-Based Test Suite (fast-check)', () => {
  describe('normalisePercents invariants', () => {
    it('always produces an array summing to exactly 100 for non-empty positive weights', () => {
      fc.assert(
        fc.property(fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 50 }), (weights) => {
          const result = normalisePercents(weights)
          expect(result.length).toBe(weights.length)
          const sum = result.reduce((acc, val) => acc + val, 0)
          expect(sum).toBe(100)
        }),
        { numRuns: 200 },
      )
    })

    it('always sums to 100 even with all zeros or negative weights', () => {
      fc.assert(
        fc.property(fc.array(fc.integer({ min: -100, max: 0 }), { minLength: 1, maxLength: 30 }), (weights) => {
          const result = normalisePercents(weights)
          expect(result.length).toBe(weights.length)
          const sum = result.reduce((acc, val) => acc + val, 0)
          expect(sum).toBe(100)
        }),
        { numRuns: 100 },
      )
    })

    it('returns empty array when given an empty list', () => {
      expect(normalisePercents([])).toEqual([])
    })
  })

  describe('calculateCostPerHead invariants', () => {
    it('always returns null for zero or negative attendee count', () => {
      fc.assert(
        fc.property(fc.integer({ min: -1000000, max: 0 }), fc.float({ min: 0, max: 100000000 }), (guests, total) => {
          expect(calculateCostPerHead(total, guests)).toBeNull()
        }),
      )
    })

    it('returns non-negative finite cost per head for positive guests and total', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100000 }), fc.integer({ min: 0, max: 100000000 }), (guests, total) => {
          const cost = calculateCostPerHead(total, guests)
          expect(cost).not.toBeNull()
          expect(cost).toBeGreaterThanOrEqual(0)
          expect(Number.isFinite(cost)).toBe(true)
        }),
      )
    })
  })

  describe('formatCurrency invariants', () => {
    it('formats any integer amount without throwing for INR, USD, and EUR', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000000000 }),
          fc.constantFrom('INR' as const, 'USD' as const, 'EUR' as const),
          (amount, currency) => {
            const formatted = formatCurrency(amount, currency)
            expect(typeof formatted).toBe('string')
            expect(formatted.length).toBeGreaterThan(0)
          },
        ),
      )
    })
  })

  describe('date utility properties', () => {
    it('daysUntil returns finite integer difference for valid dates', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2025, max: 2035 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 }),
          (year, month, day) => {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const days = daysUntil(dateStr, Date.UTC(2026, 0, 1))
            expect(Number.isInteger(days)).toBe(true)
          },
        ),
      )
    })

    it('getMilestoneTargetDate produces valid ISO date string prior to event date', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 50 }), (weeksBefore) => {
          const eventDate = '2028-12-01'
          const target = getMilestoneTargetDate(eventDate, weeksBefore)
          expect(typeof target).toBe('string')
          expect(target).toMatch(/^\d{4}-\d{2}-\d{2}$/)
          expect(new Date(target).getTime()).toBeLessThan(new Date(eventDate).getTime())
        }),
      )
    })

    it('formatDate formats ISO date string gracefully', () => {
      const formatted = formatDate('2028-11-20')
      expect(formatted).toContain('2028')
      expect(formatted).toContain('Nov')
    })
  })
})
