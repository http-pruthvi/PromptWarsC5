import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import type { Request, Response } from 'express'
import { app } from '../src/app.js'
import { getDb } from '../src/db/index.js'
import { errorHandler } from '../src/middleware/errorHandler.js'
import { chatRepository } from '../src/repositories/chat.repository.js'
import { guestsRepository } from '../src/repositories/guests.repository.js'
import { moodboardRepository } from '../src/repositories/moodboard.repository.js'
import { plansRepository } from '../src/repositories/plans.repository.js'
import { chatService } from '../src/services/chat.service.js'
import { shareService } from '../src/services/share.service.js'
import { vendorsService } from '../src/services/vendors.service.js'
import { generateIdeas } from '../src/services/ai.js'
import { applyRebalanceConstraints } from '../src/services/ai/aiParsers.js'
import { getModel, callGemini } from '../src/services/ai/geminiClient.js'
import { escapeHtml } from '../src/utils/sanitize.js'
import { NotFoundError } from '../src/errors/index.js'
import type { Brief, Plan } from '@soiree/shared'

describe('Server Deep Branches Final Coverage', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  it('verifies escapeHtml handles empty and escaped characters correctly', () => {
    expect(escapeHtml('')).toBe('')
    expect(escapeHtml('Hello & <World> "quotes" / \'test\'')).toBe(
      'Hello &amp; &lt;World&gt; &quot;quotes&quot; &#x2F; &#x27;test&#x27;',
    )
  })

  it('serves SPA fallback and routes missing API endpoints to 404', async () => {
    const spaRes = await request(app).get('/dashboard')
    expect(spaRes.status).toBe(200)
    expect(spaRes.headers['cache-control']).toBe('no-cache')

    const apiRes = await request(app).get('/api/non-existent-route-for-test')
    expect(apiRes.status).toBe(404)
  })

  it('resolves error status accurately in errorHandler middleware', () => {
    const mockJson = vi.fn()
    const mockStatus = vi.fn().mockReturnValue({ json: mockJson })
    const res = { status: mockStatus, json: mockJson } as unknown as Response
    const next = vi.fn()

    const errWithStatus = Object.assign(new Error('Gateway Down'), { status: 504 })
    errorHandler(errWithStatus, {} as Request, res, next)
    expect(mockStatus).toHaveBeenCalledWith(504)

    const errInvalidStatus = Object.assign(new Error('Weird code'), { status: 301 })
    errorHandler(errInvalidStatus, {} as Request, res, next)
    expect(mockStatus).toHaveBeenCalledWith(500)
  })

  it('persists plan, milestones, moodboard, chat and guests with fallback branches', () => {
    const db = getDb()
    db.prepare(
      'INSERT OR IGNORE INTO users (id, email, password_hash, is_guest, created_at) VALUES (?, ?, ?, 0, ?)',
    ).run('test-user-branches', 'branches@example.com', 'hash', Date.now())

    const planId = `test-done-plan-${Date.now()}`
    const plan: Plan = {
      id: planId,
      createdAt: Date.now(),
      brief: {
        title: 'Party',
        type: 'birthday',
        date: '2026-12-31',
        guests: 10,
        budget: 1000,
        currency: 'EUR',
        city: 'Paris',
        vibe: 'Chic',
        notes: '',
      },
      summary: 'Summary',
      generatedBy: 'local',
      budget: [],
      timeline: [{ id: `m-done-${Date.now()}`, label: 'Done', detail: 'Done task', weeksBefore: 2, done: true }],
      vendors: [],
      ideas: [],
    }
    plansRepository.insertPlan(plan, 'test-user-branches')

    const fetched = plansRepository.findFullPlan(planId, 'test-user-branches')
    expect(fetched?.timeline[0]?.done).toBe(true)

    const missingCount = chatRepository.countByPlanId('missing-plan')
    expect(missingCount).toBe(0)

    const nobodyPlans = plansRepository.countByUserId('nobody')
    expect(nobodyPlans).toBe(0)

    const msg = chatRepository.appendMessage(planId, 'user', 'hello default timestamp')
    expect(msg.createdAt).toBeGreaterThan(0)

    const guests = guestsRepository.batchInsertGuests(planId, [
      { name: 'Alice', party: 2, status: 'attending', dietary: 'none', notes: '' },
    ])
    expect(guests[0]?.notes).toBe('')

    const mb = moodboardRepository.upsertMoodboard(
      planId,
      {
        palette: [{ name: 'White', hex: '#ffffff', role: 'Base' }],
        typography: { heading: 'Playfair', body: 'Inter', vibe: 'Chic' },
        motifs: ['Silk'],
        decor: ['Drapes', 'Candle'],
        outfitNotes: ['Smart casual'],
        playlistVibes: ['Jazz'],
      },
      'offline',
    )
    expect(typeof mb.createdAt).toBe('string')
  })

  it('reports health geminiEnabled as false when GEMINI_API_KEY is whitespace or empty', async () => {
    process.env.GEMINI_API_KEY = '   '
    const res = await request(app).get('/api/health')
    expect(res.body.geminiEnabled).toBe(false)
  })

  it('verifies geminiClient getModel configuration and text parsing fallback', async () => {
    process.env.GEMINI_MODEL = 'gemini-1.5-pro'
    expect(getModel()).toBe('gemini-1.5-pro')

    process.env.GEMINI_MODEL = '   '
    expect(getModel()).toBe('gemini-2.5-flash')

    process.env.GEMINI_API_KEY = 'mock-key'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: undefined }] } }],
        }),
      }),
    )

    await expect(callGemini('test', false)).rejects.toThrow('Empty response from Gemini')
  })

  it('tests generateIdeas with extra direction and missing group items', async () => {
    process.env.GEMINI_API_KEY = 'mock-key'
    const mockBrief: Brief = {
      title: 'Birthday Celebration',
      type: 'birthday',
      city: 'Berlin',
      date: '2026-11-20',
      guests: 20,
      budget: 2000,
      currency: 'EUR',
      vibe: 'cozy',
      notes: '',
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: { parts: [{ text: JSON.stringify([{ title: 'Vintage Theme' }]) }] },
            },
          ],
        }),
      }),
    )

    const res = await generateIdeas(mockBrief, 'Retro 80s')
    expect(res.ai).toBe(true)
    expect(res.ideas[0]?.items).toEqual([])
  })

  it('verifies service-level NotFoundError exceptions and fallback values', async () => {
    expect(() => chatService.listMessages('missing', 'user', 10, 0)).toThrow(NotFoundError)
    expect(() => shareService.getShareStatus('missing', 'user')).toThrow(NotFoundError)
    expect(() => shareService.revokeShare('missing', 'user')).toThrow(NotFoundError)
    expect(() => vendorsService.updateVendor('missing', 'user', 'v1', {})).toThrow(NotFoundError)

    const proposal = applyRebalanceConstraints(
      [
        { id: 'b1', category: 'Decor', allocated: 1000, spent: 500, note: '' },
        { id: 'b2', category: 'Music', allocated: 1000, spent: 500, note: '' },
      ],
      new Map([['decor', { to: 800, reason: 'Reduced' }]]),
      2000,
      'EUR',
    )
    expect(proposal?.changes.find((i) => i.itemId === 'b2')?.to).toBe(1200)
  })

  it('serves RFC 9116 security.txt and verifies hardened security headers', async () => {
    const res = await request(app).get('/.well-known/security.txt')
    expect(res.status).toBe(200)
    expect(res.text).toContain('Contact: mailto:security@soiree.app')
    expect(res.text).toContain('Expires:')

    const altRes = await request(app).get('/security.txt')
    expect(altRes.status).toBe(200)
    expect(altRes.text).toContain('Canonical: https://soiree.app/.well-known/security.txt')

    // Verify Helmet and Custom Headers
    expect(res.headers['permissions-policy']).toContain('camera=()')
    expect(res.headers['permissions-policy']).toContain('microphone=()')
    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin')
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin')
    expect(res.headers['content-security-policy']).toContain("default-src 'self'")
  })
})
