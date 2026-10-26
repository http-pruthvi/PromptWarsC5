import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { money, compactMoney, addDays, fmtDate, todayISO } from '../lib/utils.js'
import { api, ApiError } from '../lib/api.js'

describe('Client Lib Utils & Api Client Suite', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      }),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('formats currencies and handles compact Indian shorthand properly', () => {
    expect(money(5000, 'INR')).toContain('5,000')
    expect(money(120, 'USD')).toContain('120')
    expect(money(45, 'EUR')).toContain('45')

    expect(compactMoney(500, 'INR')).toBe('₹500')
    expect(compactMoney(5000, 'INR')).toBe('₹5K')
    expect(compactMoney(250000, 'INR')).toBe('₹2.5L')
    expect(compactMoney(15000000, 'INR')).toBe('₹1.5Cr')
    expect(compactMoney(50000, 'USD')).toContain('50')
  })

  it('performs date operations correctly', () => {
    const d = addDays('2026-06-01', 5)
    expect(d.getDate()).toBe(6)
    expect(fmtDate(d)).toContain('2026')
    expect(todayISO(0)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('constructs ApiError correctly with status and details', () => {
    const err = new ApiError('Not Found', 404, { field: 'id' })
    expect(err.name).toBe('ApiError')
    expect(err.status).toBe(404)
    expect(err.details).toEqual({ field: 'id' })
  })

  it('throws ApiError when fetch response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid payload', details: ['bad email'] }),
      }),
    )

    await expect(api.auth.login('bad', 'pwd')).rejects.toThrow('Invalid payload')

    // Non-JSON error body fallback
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('Not JSON')
        },
      }),
    )

    await expect(api.auth.me()).rejects.toThrow('Request failed (502)')
  })

  it('invokes all authentication api endpoints successfully', async () => {
    await api.auth.me()
    await api.auth.login('u@test.com', 'pass')
    await api.auth.register('u@test.com', 'pass')
    await api.auth.guest()
    await api.auth.logout()
    expect(fetch).toHaveBeenCalledTimes(5)
  })

  it('invokes plan, budget, vendor, and guest endpoints', async () => {
    await api.plans.list()
    await api.plans.get('p1')
    await api.plans.create({
      type: 'birthday',
      title: 'D',
      date: '2026-10-10',
      guests: 10,
      budget: 1000,
      currency: 'EUR',
      city: 'Paris',
      vibe: 'Chic',
      notes: '',
    })
    await api.plans.delete('p1')
    await api.plans.updateMilestone('p1', 'm1', true)
    await api.plans.updateBudget('p1', 'b1', { spent: 200 })
    await api.plans.addVendor('p1', { category: 'Decor' })
    await api.plans.updateVendor('p1', 'v1', { status: 'booked' })
    await api.plans.deleteVendor('p1', 'v1')
    await api.plans.regenerateIdeas('p1', 'fancy')
    await api.plans.getChat('p1')
    await api.plans.sendChat('p1', 'hello')
    expect(api.plans.getIcsUrl('p1')).toBe('/api/plans/p1/export.ics')
    await api.plans.getMoodboard('p1')
    await api.plans.generateMoodboard('p1', 'vintage')
    await api.plans.getShare('p1')
    await api.plans.enableShare('p1')
    await api.plans.revokeShare('p1')
    await api.plans.listGuests('p1')
    await api.plans.addGuest('p1', { name: 'Bob' })
    await api.plans.updateGuest('p1', 'g1', { status: 'declined' })
    await api.plans.deleteGuest('p1', 'g1')
    await api.plans.importGuests('p1', 'Name,1')
    await api.plans.getGuestSummary('p1')
    await api.plans.rebalanceBudget('p1')
    await api.plans.applyRebalance('p1', [{ itemId: 'b1', to: 800 }])
    await api.public.getPlan('token123')
    expect(fetch).toHaveBeenCalled()
  })
})
