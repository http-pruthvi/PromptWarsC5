import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import jwt from 'jsonwebtoken'
import { app } from '../src/app.js'
import { initDb, closeDb, getDb } from '../src/db/index.js'
import {
  generateLocalPlan,
  money,
  weeksUntil,
  localAnswer,
  localIdeas,
  generateOfflineMoodboard,
  generateOfflineBudgetRebalance,
} from '../src/services/generator.js'
import { generatePlan, askAssistant, generateMoodboard, generateIdeas, rebalanceBudget } from '../src/services/ai.js'
import { escapeHtml, sanitizeText } from '../src/utils/sanitize.js'
import type { Brief, BudgetItem } from '@soiree/shared'

const TEST_DB = path.resolve(os.tmpdir(), `soiree-cov-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`)

function cleanDb() {
  for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`, `${TEST_DB}-journal`]) {
    if (fs.existsSync(f)) {
      try {
        fs.unlinkSync(f)
      } catch {
        // ignore
      }
    }
  }
}

describe('Server Comprehensive Branch & Service Coverage Suite', () => {
  let userCookie: string
  let planId: string
  let initialBudgetItemId: string

  beforeAll(async () => {
    cleanDb()
    initDb(TEST_DB)

    const res = await request(app).post('/api/auth/guest')
    userCookie = res.headers['set-cookie'][0]

    const planRes = await request(app).post('/api/plans').set('Cookie', userCookie).send({
      type: 'wedding',
      title: 'Coverage Test Gala',
      date: '2028-06-15',
      guests: 150,
      budget: 3000000,
      currency: 'INR',
      city: 'Mumbai',
      vibe: 'Modern Bollywood Elegance',
    })
    planId = planRes.body.plan.id
    initialBudgetItemId = planRes.body.plan.budget[0].id
  })

  afterAll(() => {
    closeDb()
    cleanDb()
    vi.restoreAllMocks()
  })

  describe('1. Vendor Routes & Mutations', () => {
    let createdVendorId: string

    it('lists vendors with pagination via GET /api/plans/:id/vendors', async () => {
      const res = await request(app).get(`/api/plans/${planId}/vendors?limit=5&offset=0`).set('Cookie', userCookie)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.vendors)).toBe(true)
      expect(res.body.total).toBeGreaterThanOrEqual(1)
    })

    it('creates a custom vendor via POST /api/plans/:id/vendors', async () => {
      const res = await request(app).post(`/api/plans/${planId}/vendors`).set('Cookie', userCookie).send({
        category: 'Live Music',
        name: 'The Royal Strings Quartet',
        status: 'contacted',
        estimate: 120000,
        tips: 'Confirm acoustics with venue stage manager',
      })

      expect(res.status).toBe(201)
      expect(res.body.vendor).toBeDefined()
      expect(res.body.vendor.name).toBe('The Royal Strings Quartet')
      createdVendorId = res.body.vendor.id
    })

    it('updates vendor status and details via PATCH /api/plans/:id/vendors/:vendorId', async () => {
      const res = await request(app)
        .patch(`/api/plans/${planId}/vendors/${createdVendorId}`)
        .set('Cookie', userCookie)
        .send({
          status: 'booked',
          estimate: 110000,
          tips: 'Signed agreement and 20% advance released',
        })

      expect(res.status).toBe(200)
      expect(res.body.vendor.status).toBe('booked')
      expect(res.body.vendor.estimate).toBe(110000)
    })

    it('returns 404 for updating nonexistent vendor', async () => {
      const res = await request(app)
        .patch(`/api/plans/${planId}/vendors/non-existent-vendor-id`)
        .set('Cookie', userCookie)
        .send({ status: 'booked' })

      expect(res.status).toBe(404)
    })

    it('deletes vendor via DELETE /api/plans/:id/vendors/:vendorId', async () => {
      const res = await request(app).delete(`/api/plans/${planId}/vendors/${createdVendorId}`).set('Cookie', userCookie)

      expect(res.status).toBe(200)
      expect(res.body.message).toContain('Vendor removed')
    })

    it('returns 404 for deleting nonexistent vendor', async () => {
      const res = await request(app)
        .delete(`/api/plans/${planId}/vendors/non-existent-vendor-id`)
        .set('Cookie', userCookie)

      expect(res.status).toBe(404)
    })
  })

  describe('2. Milestone Routes & Mutations', () => {
    it('returns 404 for nonexistent milestone update', async () => {
      const res = await request(app)
        .patch(`/api/plans/${planId}/milestones/bad-milestone-id`)
        .set('Cookie', userCookie)
        .send({ done: true })

      expect(res.status).toBe(404)
    })
  })

  describe('3. Ideas Routes & Mutations', () => {
    it('regenerates ideas via POST /api/plans/:id/ideas/regenerate', async () => {
      const res = await request(app).post(`/api/plans/${planId}/ideas/regenerate`).set('Cookie', userCookie).send({
        extra: 'Include artisanal dessert stations and live jazz',
      })

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.ideas)).toBe(true)
      expect(res.body.ideas.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('4. Budget Extra Mutations & Edge Cases', () => {
    it('returns 404 for nonexistent budget item update', async () => {
      const res = await request(app)
        .patch(`/api/plans/${planId}/budget/nonexistent-item-id`)
        .set('Cookie', userCookie)
        .send({ allocated: 50000 })

      expect(res.status).toBe(404)
    })

    it('rejects budget apply when allocation is negative', async () => {
      const res = await request(app)
        .post(`/api/plans/${planId}/budget/apply`)
        .set('Cookie', userCookie)
        .send({
          changes: [{ itemId: initialBudgetItemId, to: -500 }],
        })

      expect(res.status).toBe(400)
    })
  })

  describe('5. Share Status Routes', () => {
    it('returns share status via GET /api/plans/:id/share when disabled', async () => {
      const res = await request(app).get(`/api/plans/${planId}/share`).set('Cookie', userCookie)

      expect(res.status).toBe(200)
      expect(res.body.shareEnabled).toBe(false)
    })

    it('enables share and retrieves active share token via GET /api/plans/:id/share', async () => {
      const postRes = await request(app).post(`/api/plans/${planId}/share`).set('Cookie', userCookie)
      expect(postRes.status).toBe(200)
      expect(postRes.body.shareEnabled).toBe(true)
      expect(postRes.body.shareToken).toBeTruthy()

      const getRes = await request(app).get(`/api/plans/${planId}/share`).set('Cookie', userCookie)

      expect(getRes.status).toBe(200)
      expect(getRes.body.shareEnabled).toBe(true)
      expect(getRes.body.shareToken).toBe(postRes.body.shareToken)
    })
  })

  describe('6. Auth Edge Cases & Security', () => {
    it('rejects duplicate email registration with 409', async () => {
      const email = `test-${Date.now()}@soiree.luxury`
      const password = 'StrongPassword123!'

      const reg1 = await request(app).post('/api/auth/register').send({ email, password })
      expect(reg1.status).toBe(201)

      const reg2 = await request(app).post('/api/auth/register').send({ email, password })
      expect(reg2.status).toBe(409)
      expect(reg2.body.error).toContain('already exists')
    })

    it('rejects login with wrong password (401)', async () => {
      const email = `login-fail-${Date.now()}@soiree.luxury`
      await request(app).post('/api/auth/register').send({ email, password: 'Password123!' })

      const res = await request(app).post('/api/auth/login').send({ email, password: 'WrongPassword999!' })

      expect(res.status).toBe(401)
      expect(res.body.error).toContain('Invalid email or password')
    })

    it('rejects login with non-existent email (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@soiree.luxury', password: 'SomePassword123!' })

      expect(res.status).toBe(401)
    })

    it('clears invalid/tampered token on protected route (401)', async () => {
      const forgedToken = jwt.sign({ id: 'forged-user-id' }, 'wrong-secret-key-12345')

      const res = await request(app).get('/api/plans').set('Cookie', `soiree_token=${forgedToken}`)

      expect(res.status).toBe(401)
      expect(res.headers['set-cookie']).toBeDefined()
    })

    it('logs out and clears session cookie', async () => {
      const res = await request(app).post('/api/auth/logout').set('Cookie', userCookie)

      expect(res.status).toBe(200)
      expect(res.body.message).toContain('Logged out')
    })
  })

  describe('7. Local Generator Service Comprehensive Coverage', () => {
    it('generates local plan for birthday party', () => {
      const brief: Brief = {
        type: 'birthday',
        title: 'Maya 30th Birthday Sunset Bash',
        date: '2027-08-20',
        guests: 40,
        budget: 450000,
        currency: 'INR',
        city: 'Goa',
        vibe: 'Boho Beach, Acoustic, Sunset Cocktail',
        notes: 'Oceanfront deck, vegan catering options',
      }

      const plan = generateLocalPlan(brief)
      expect(plan.brief.type).toBe('birthday')
      expect(plan.budget.length).toBeGreaterThan(0)
      expect(plan.timeline.length).toBeGreaterThan(0)
      expect(plan.vendors.length).toBeGreaterThan(0)
      expect(plan.ideas.length).toBeGreaterThan(0)
    })

    it('generates local plan for community festival', () => {
      const brief: Brief = {
        type: 'community',
        title: 'Spring Blossom Neighborhood Carnival',
        date: '2027-04-10',
        guests: 350,
        budget: 800000,
        currency: 'INR',
        city: 'Bengaluru',
        vibe: 'Lively, Family-Friendly, Food Stalls',
        notes: 'Permits required, safety barriers',
      }

      const plan = generateLocalPlan(brief)
      expect(plan.brief.type).toBe('community')
      expect(plan.budget.length).toBeGreaterThan(0)
      expect(plan.timeline.length).toBeGreaterThan(0)
    })

    it('formats currencies accurately (INR, USD, EUR)', () => {
      expect(money(1500000, 'INR')).toBeTruthy()
      expect(money(25000, 'USD')).toContain('$')
      expect(money(20000, 'EUR')).toBeTruthy()
    })

    it('computes weeksUntil correctly for past and future dates', () => {
      expect(weeksUntil('2020-01-01')).toBe(0)
      expect(weeksUntil('2030-01-01')).toBeGreaterThan(100)
    })

    it('generates contextual local answers and ideas', () => {
      const mockPlan = generateLocalPlan({
        type: 'wedding',
        title: 'Test Wedding',
        date: '2028-01-01',
        guests: 100,
        budget: 2000000,
        currency: 'INR',
        city: 'Jaipur',
        vibe: 'Regal Palace',
        notes: '',
      })

      const budgetAns = localAnswer(mockPlan, 'How can I save budget?')
      expect(budgetAns).toContain('spent')

      const vendorAns = localAnswer(mockPlan, 'Recommend some vendor questions')
      expect(vendorAns).toBeTruthy()

      const timelineAns = localAnswer(mockPlan, 'When should I finish the next todo?')
      expect(timelineAns).toBeTruthy()

      const genericAns = localAnswer(mockPlan, 'What is the best month for weddings?')
      expect(genericAns).toBeTruthy()

      const ideas = localIdeas(mockPlan.brief)
      expect(ideas.length).toBeGreaterThanOrEqual(3)
    })

    it('generates offline moodboard with valid palettes and motifs', () => {
      const moodboard = generateOfflineMoodboard({
        type: 'wedding',
        title: 'Test Wedding',
        date: '2028-01-01',
        guests: 100,
        budget: 2000000,
        currency: 'INR',
        city: 'Udaipur',
        vibe: 'Royal Rajputana Heritage',
        notes: '',
      })

      expect(moodboard.palette).toHaveLength(5)
      expect(moodboard.motifs.length).toBeGreaterThanOrEqual(3)
      expect(moodboard.outfitNotes.length).toBeGreaterThan(0)
      expect(moodboard.typography.heading).toBeTruthy()
    })

    it('generates offline budget rebalance proposal accurately', () => {
      const brief: Brief = {
        type: 'wedding',
        title: 'Rebalance Test',
        date: '2028-01-01',
        guests: 100,
        budget: 1000000,
        currency: 'INR',
        city: 'Jaipur',
        vibe: '',
        notes: '',
      }
      const budget: BudgetItem[] = [
        { id: 'v', category: 'Venue', allocated: 500000, spent: 650000, note: '' },
        { id: 'f', category: 'Food', allocated: 400000, spent: 200000, note: '' },
        { id: 'c', category: 'Contingency Reserve', allocated: 100000, spent: 0, note: '' },
      ]

      const proposal = generateOfflineBudgetRebalance(brief, budget)
      expect(proposal.changes.length).toBe(3)
      const sum = proposal.changes.reduce((s, c) => s + c.to, 0)
      expect(sum).toBe(1000000)
    })
  })

  describe('8. AI Services with Mock & Fallback Paths', () => {
    const brief: Brief = {
      type: 'wedding',
      title: 'AI Gala Test',
      date: '2028-11-20',
      guests: 120,
      budget: 2500000,
      currency: 'INR',
      city: 'Delhi',
      vibe: 'Minimalist Luxe',
      notes: '',
    }

    it('gracefully falls back to deterministic generator when GEMINI_API_KEY is not set', async () => {
      const prevKey = process.env.GEMINI_API_KEY
      delete process.env.GEMINI_API_KEY

      const plan = await generatePlan(brief)
      expect(plan.generatedBy).toBe('local')
      expect(plan.budget.length).toBeGreaterThan(0)

      const ans = await askAssistant(plan, [], 'What is my catering cost per person?')
      expect(ans.text).toBeTruthy()

      const mbRes = await generateMoodboard(brief)
      expect(mbRes.moodboard.palette).toHaveLength(5)

      const rebRes = await rebalanceBudget(brief, plan.budget)
      expect(rebRes.proposal.changes.length).toBe(plan.budget.length)

      const ideasRes = await generateIdeas(brief)
      expect(ideasRes.ideas.length).toBeGreaterThan(0)

      process.env.GEMINI_API_KEY = prevKey
    })

    it('parses valid Gemini API candidate JSON responses', async () => {
      process.env.GEMINI_API_KEY = 'test-mock-gemini-key'

      const mockPlanJson = {
        summary: 'AI curated dream celebration in Delhi.',
        budget: [
          { category: 'Venue', percent: 40, note: 'Ballroom' },
          { category: 'Catering', percent: 30, note: 'Multi-course menu' },
          { category: 'Decor', percent: 20, note: 'Floral installations' },
          { category: 'Contingency', percent: 10, note: 'Buffer' },
        ],
        timeline: [{ label: 'Venue Lock', detail: 'Reserve ballroom', weeksBefore: 24 }],
        vendors: [
          { category: 'Venue', name: 'Grand Ballroom', status: 'todo', estimate: 1000000, tips: 'Ask for setup hours' },
        ],
        ideas: [{ title: 'Culinary Highlights', items: ['Live truffle station', 'Signature mocktails'] }],
      }

      const originalFetch = global.fetch
      global.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(mockPlanJson) }],
              },
            },
          ],
        }),
      })) as unknown as typeof fetch

      const plan = await generatePlan(brief)
      expect(plan.generatedBy).toBe('gemini')
      expect(plan.summary).toBe('AI curated dream celebration in Delhi.')
      expect(plan.budget.length).toBe(4)

      // Test askAssistant with Gemini API
      global.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Here is your custom timeline recommendation for Delhi.' }],
              },
            },
          ],
        }),
      })) as unknown as typeof fetch

      const assistantReply = await askAssistant(plan, [], 'What is the schedule?')
      expect(assistantReply.ai).toBe(true)
      expect(assistantReply.text).toContain('Delhi')

      // Test generateMoodboard with Gemini API
      const mockMoodboardJson = {
        palette: [
          { name: 'Gold', hex: '#ffd700', role: 'Accent' },
          { name: 'Ivory', hex: '#fffff0', role: 'Base' },
          { name: 'Rose', hex: '#ff007f', role: 'Vibrant' },
          { name: 'Emerald', hex: '#50c878', role: 'Contrast' },
          { name: 'Onyx', hex: '#0f0f0f', role: 'Depth' },
        ],
        typography: { heading: 'Playfair', body: 'Inter', vibe: 'Regal' },
        motifs: ['Paisley', 'Marigold', 'Lotus'],
        decor: ['Velvet drapes', 'Brass lanterns'],
        outfitNotes: ['Raw silk sherwani', 'Embroidered lehenga'],
        playlistVibes: ['Sufi lounge', 'Classical sitar'],
      }

      global.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(mockMoodboardJson) }],
              },
            },
          ],
        }),
      })) as unknown as typeof fetch

      const mbRes = await generateMoodboard(brief)
      expect(mbRes.generatedBy).toBe('gemini')
      expect(mbRes.moodboard.palette).toHaveLength(5)

      // Test rebalanceBudget with Gemini API
      const mockRebalanceJson = {
        changes: plan.budget.map((b) => ({
          itemId: b.id,
          category: b.category,
          from: b.allocated,
          to: b.allocated,
          reason: 'Balanced allocation',
        })),
        summary: 'Smart rebalanced budget preserves buffer',
      }

      global.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(mockRebalanceJson) }],
              },
            },
          ],
        }),
      })) as unknown as typeof fetch

      const rebRes = await rebalanceBudget(brief, plan.budget)
      expect(rebRes.ai).toBe(true)
      expect(rebRes.proposal.changes.length).toBe(plan.budget.length)

      // Test generateIdeas with Gemini API
      global.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify([
                      { title: 'Royal Highlights', items: ['Elephant welcome', 'Floral canopy entry'] },
                    ]),
                  },
                ],
              },
            },
          ],
        }),
      })) as unknown as typeof fetch

      const ideasRes = await generateIdeas(brief)
      expect(ideasRes.ai).toBe(true)
      expect(ideasRes.ideas.length).toBe(1)

      // Test Gemini API error branch triggers fallback
      global.fetch = vi.fn().mockImplementation(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })) as unknown as typeof fetch

      const fallbackPlan = await generatePlan(brief)
      expect(fallbackPlan.generatedBy).toBe('local')

      const fallbackIdeas = await generateIdeas(brief)
      expect(fallbackIdeas.ai).toBe(false)

      const fallbackMb = await generateMoodboard(brief)
      expect(fallbackMb.generatedBy).toBe('offline')

      const fallbackReb = await rebalanceBudget(brief, plan.budget)
      expect(fallbackReb.ai).toBe(false)

      global.fetch = originalFetch
      delete process.env.GEMINI_API_KEY
    })
  })

  describe('9. Comprehensive Moodboard Style & Generator Coverage', () => {
    it('covers all moodboard aesthetic themes (pastel, minimalist, vibrant)', () => {
      const pastelMb = generateOfflineMoodboard({
        type: 'wedding',
        title: 'Pastel Garden',
        date: '2028-04-12',
        guests: 80,
        budget: 1500000,
        currency: 'INR',
        city: 'Shimla',
        vibe: 'Pastel, Floral, Lavender, Vintage French Garden',
        notes: '',
      })
      expect(pastelMb.palette).toHaveLength(5)
      expect(pastelMb.typography.heading).toBe('Playfair Display')

      const minMb = generateOfflineMoodboard({
        type: 'wedding',
        title: 'Urban Modern',
        date: '2028-09-10',
        guests: 100,
        budget: 2000000,
        currency: 'USD',
        city: 'New York',
        vibe: 'Modern Minimalist Monochrome Chic Architectural',
        notes: '',
      })
      expect(minMb.palette).toHaveLength(5)
      expect(minMb.typography.heading).toBe('Prata')

      const neonMb = generateOfflineMoodboard({
        type: 'birthday',
        title: 'Neon Carnival',
        date: '2028-07-22',
        guests: 50,
        budget: 300000,
        currency: 'INR',
        city: 'Pune',
        vibe: 'Neon Carnival Festive Vibrant Bollywood Party',
        notes: '',
      })
      expect(neonMb.palette).toHaveLength(5)
      expect(neonMb.typography.heading).toBe('Rozha One')

      // Default wedding moodboard
      const defaultWeddingMb = generateOfflineMoodboard({
        type: 'wedding',
        title: 'Nuptials',
        date: '2028-05-01',
        guests: 100,
        budget: 1000000,
        currency: 'INR',
        city: 'Jaipur',
        vibe: 'simple',
        notes: '',
      })
      expect(defaultWeddingMb.typography.heading).toBe('Cormorant Garamond')

      // Default birthday moodboard
      const defaultBirthdayMb = generateOfflineMoodboard({
        type: 'birthday',
        title: 'Birthday',
        date: '2028-05-01',
        guests: 30,
        budget: 100000,
        currency: 'INR',
        city: 'Goa',
        vibe: 'simple',
        notes: '',
      })
      expect(defaultBirthdayMb.typography.heading).toBe('Playfair Display')

      // Default community moodboard
      const defaultCommunityMb = generateOfflineMoodboard({
        type: 'community',
        title: 'Fair',
        date: '2028-05-01',
        guests: 200,
        budget: 500000,
        currency: 'INR',
        city: 'Delhi',
        vibe: 'simple',
        notes: '',
      })
      expect(defaultCommunityMb.typography.heading).toBe('Fraunces')
    })

    it('covers offline budget rebalance adjustments when diff is non-zero', () => {
      const brief: Brief = {
        type: 'wedding',
        title: 'Diff Adjustment Test',
        date: '2028-01-01',
        guests: 100,
        budget: 1050000,
        currency: 'INR',
        city: 'Jaipur',
        vibe: '',
        notes: '',
      }
      const budget: BudgetItem[] = [
        { id: 'v', category: 'Venue', allocated: 500000, spent: 650000, note: '' },
        { id: 'f', category: 'Catering', allocated: 400000, spent: 200000, note: '' },
        { id: 'c', category: 'Contingency Reserve', allocated: 100000, spent: 0, note: '' },
      ]

      const proposal = generateOfflineBudgetRebalance(brief, budget)
      const sum = proposal.changes.reduce((s, c) => s + c.to, 0)
      expect(sum).toBe(1050000)
    })
  })

  describe('10. Utilities, ICS Export & DB Error Branches', () => {
    it('initializes db via getDb when closed', () => {
      closeDb()
      const reopened = getDb()
      expect(reopened).toBeDefined()
    })
    it('escapes dangerous HTML characters', () => {
      const dangerous = '<script>alert("xss & \'injection\'")</script>'
      const safe = escapeHtml(dangerous)
      expect(safe).not.toContain('<script>')
      expect(safe).toContain('&lt;script&gt;')
      expect(safe).toContain('&amp;')
      expect(safe).toContain('&quot;')
      expect(safe).toContain('&#x27;')
    })

    it('sanitizes text removing script blocks and HTML tags', () => {
      const text = sanitizeText('<b>Hello</b> <script>alert(1)</script> World')
      expect(text).toBe('Hello  World')
    })

    it('returns 404 for ICS export of nonexistent plan', async () => {
      const res = await request(app).get('/api/plans/nonexistent-plan-id/export/ics').set('Cookie', userCookie)

      expect(res.status).toBe(404)
    })

    it('handles database transaction rollback on throw', () => {
      const db = getDb()
      expect(db).toBeDefined()

      const failingTx = db.transaction(() => {
        db.prepare(
          "INSERT INTO users (id, email, password_hash, created_at) VALUES ('temp-user', 'temp@soiree.luxury', 'hash', ?)",
        ).run(Date.now())
        throw new Error('Forced failure to trigger rollback')
      })

      expect(() => failingTx()).toThrow('Forced failure to trigger rollback')

      const found = db.prepare("SELECT * FROM users WHERE id = 'temp-user'").get()
      expect(found).toBeUndefined()
    })
  })
})
