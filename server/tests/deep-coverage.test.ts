import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import jwt from 'jsonwebtoken'
import { ZodError, z } from 'zod'
import type { Request, Response } from 'express'
import { app } from '../src/app.js'
import { initDb, closeDb, getDb, getStatement } from '../src/db/index.js'
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  PayloadTooLargeError,
  RateLimitError,
} from '../src/errors/index.js'
import { errorHandler } from '../src/middleware/errorHandler.js'
import {
  extractToken,
  getAuthUserId,
  clearAuthCookie,
  requireAuth,
  signToken,
  DEFAULT_JWT_SECRET,
} from '../src/middleware/auth.js'
import { logger } from '../src/utils/logger.js'
import { generatePlan, generateMoodboard, rebalanceBudget } from '../src/services/ai.js'
import { applyRebalanceConstraints } from '../src/services/ai/aiParsers.js'
import { budgetRepository } from '../src/repositories/budget.repository.js'
import { vendorsRepository } from '../src/repositories/vendors.repository.js'
import { chatRepository } from '../src/repositories/chat.repository.js'
import { calculateCostPerHead } from '@soiree/shared'
import type { BudgetItem, Brief } from '@soiree/shared'

const TEST_DB = path.resolve(os.tmpdir(), `soiree-deep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`)

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

describe('Deep Coverage & Security Invariant Test Suite', () => {
  let userACookie: string
  let userBCookie: string
  let planAId: string
  let budgetItemAId: string

  beforeAll(async () => {
    cleanDb()
    initDb(TEST_DB)

    // User A setup
    const resA = await request(app).post('/api/auth/guest')
    userACookie = resA.headers['set-cookie'][0]

    const planRes = await request(app).post('/api/plans').set('Cookie', userACookie).send({
      type: 'wedding',
      title: 'Deep Coverage Plan',
      date: '2028-09-20',
      guests: 200,
      budget: 5000000,
      currency: 'INR',
      city: 'Jaipur',
      vibe: 'Royal Heritage',
      notes: 'Secret planner notes that must never leak to public view',
    })
    expect(planRes.status).toBe(201)
    planAId = planRes.body.plan.id
    budgetItemAId = planRes.body.plan.budget[0].id

    // User B setup
    const resB = await request(app).post('/api/auth/guest')
    expect(resB.status).toBe(201)
    userBCookie = resB.headers['set-cookie'][0]
  })

  afterAll(() => {
    closeDb()
    cleanDb()
  })

  describe('1. Error Hierarchy and Error Handler Middleware', () => {
    it('instantiates all custom error classes with correct status codes and codes', () => {
      const valErr = new ValidationError('Invalid name', { field: 'name' })
      expect(valErr.statusCode).toBe(400)
      expect(valErr.code).toBe('VALIDATION_ERROR')
      expect(valErr.details).toEqual({ field: 'name' })

      const unauthErr = new UnauthorizedError('Custom unauth')
      expect(unauthErr.statusCode).toBe(401)
      expect(unauthErr.code).toBe('UNAUTHORIZED')

      const forbErr = new ForbiddenError('No access')
      expect(forbErr.statusCode).toBe(403)
      expect(forbErr.code).toBe('FORBIDDEN')

      const notFoundErr = new NotFoundError('Item missing')
      expect(notFoundErr.statusCode).toBe(404)
      expect(notFoundErr.code).toBe('NOT_FOUND')

      const conflictErr = new ConflictError('Already exists')
      expect(conflictErr.statusCode).toBe(409)
      expect(conflictErr.code).toBe('CONFLICT')

      const payloadErr = new PayloadTooLargeError('Too big')
      expect(payloadErr.statusCode).toBe(413)
      expect(payloadErr.code).toBe('PAYLOAD_TOO_LARGE')

      const rateErr = new RateLimitError('Too fast')
      expect(rateErr.statusCode).toBe(429)
      expect(rateErr.code).toBe('RATE_LIMIT_EXCEEDED')
    })

    it('errorHandler handles AppError with and without details', () => {
      const mockRes = {
        statusCode: 200,
        body: null as unknown,
        status(c: number) {
          this.statusCode = c
          return this
        },
        json(b: unknown) {
          this.body = b
          return this
        },
      }

      errorHandler(
        new AppError('Custom error', 418, 'I_AM_A_TEAPOT'),
        {} as Request,
        mockRes as unknown as Response,
        vi.fn(),
      )
      expect(mockRes.statusCode).toBe(418)
      expect(mockRes.body).toEqual({ error: 'Custom error', code: 'I_AM_A_TEAPOT' })

      errorHandler(
        new AppError('With details', 400, 'BAD_REQ', { extra: 123 }),
        {} as Request,
        mockRes as unknown as Response,
        vi.fn(),
      )
      expect(mockRes.body).toEqual({ error: 'With details', code: 'BAD_REQ', details: { extra: 123 } })
    })

    it('errorHandler handles ZodError and payload entity size errors', () => {
      const mockRes = {
        statusCode: 200,
        body: null as unknown,
        status(c: number) {
          this.statusCode = c
          return this
        },
        json(b: unknown) {
          this.body = b
          return this
        },
      }

      const schema = z.object({ age: z.number() })
      try {
        schema.parse({ age: 'invalid' })
      } catch (err) {
        errorHandler(err as ZodError, {} as Request, mockRes as unknown as Response, vi.fn())
        expect(mockRes.statusCode).toBe(400)
        expect((mockRes.body as { code: string }).code).toBe('VALIDATION_ERROR')
      }

      const largeErr = Object.assign(new Error('Body too large'), { type: 'entity.too.large' })
      errorHandler(largeErr, {} as Request, mockRes as unknown as Response, vi.fn())
      expect(mockRes.statusCode).toBe(413)
      expect((mockRes.body as { code: string }).code).toBe('PAYLOAD_TOO_LARGE')
    })

    it('errorHandler resolves unknown status codes and production mode message', () => {
      const mockRes = {
        statusCode: 200,
        body: null as unknown,
        status(c: number) {
          this.statusCode = c
          return this
        },
        json(b: unknown) {
          this.body = b
          return this
        },
      }

      const unkErr = Object.assign(new Error('Unknown status err'), { status: 999 })
      errorHandler(unkErr, {} as Request, mockRes as unknown as Response, vi.fn())
      expect(mockRes.statusCode).toBe(500)

      const prevEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      try {
        errorHandler(new Error('Sensitive internal details'), {} as Request, mockRes as unknown as Response, vi.fn())
        expect(mockRes.statusCode).toBe(500)
        expect((mockRes.body as { error: string }).error).toBe('Something went wrong')
      } finally {
        process.env.NODE_ENV = prevEnv
      }
    })
  })

  describe('2. Authentication Middleware Deep Branch Tests', () => {
    it('extracts token from Bearer authorization header', () => {
      const token = signToken({ id: 'test-user', email: 'test@example.com', isGuest: false })
      const req = {
        cookies: {},
        headers: { authorization: `Bearer ${token}` },
      } as unknown as Request

      const extracted = extractToken(req)
      expect(extracted).toBe(token)
    })

    it('returns null for missing, non-bearer or invalid authorization header', () => {
      const req1 = { cookies: {}, headers: { authorization: 'Basic dXNlcjpwYXNz' } } as unknown as Request
      expect(extractToken(req1)).toBeNull()

      const req2 = { cookies: {}, headers: {} } as unknown as Request
      expect(extractToken(req2)).toBeNull()
    })

    it('getAuthUserId throws UnauthorizedError when user is not attached to request', () => {
      const req = { user: undefined } as unknown as Request
      expect(() => getAuthUserId(req)).toThrow(UnauthorizedError)
    })

    it('requireAuth rejects requests with expired or invalid tokens', () => {
      const expiredToken = jwt.sign({ id: 'exp', email: null, isGuest: true }, DEFAULT_JWT_SECRET, { expiresIn: -10 })
      const req = {
        cookies: { soiree_token: expiredToken },
        headers: {},
      } as unknown as Request

      const res = {
        statusCode: 200,
        body: null as unknown,
        status(c: number) {
          this.statusCode = c
          return this
        },
        json(b: unknown) {
          this.body = b
          return this
        },
        clearCookie: vi.fn(),
      } as unknown as Response

      const next = vi.fn()
      requireAuth(req, res, next)
      expect(res.statusCode).toBe(401)
      expect(next).not.toHaveBeenCalled()
    })

    it('clearAuthCookie clears the cookie with proper path and httpOnly flags', () => {
      const res = { clearCookie: vi.fn() } as unknown as Response
      clearAuthCookie(res)
      expect(res.clearCookie).toHaveBeenCalledWith(
        'soiree_token',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      )
    })
  })

  describe('3. Database & Statement Cache Deep Coverage', () => {
    it('initDb returns existing instance when called without customPath', () => {
      const db1 = getDb()
      const db2 = initDb()
      expect(db1).toBe(db2)
    })

    it('getStatement retrieves cached statement efficiently on second call', () => {
      const sql = 'SELECT 1 as num'
      const stmt1 = getStatement(sql)
      const stmt2 = getStatement(sql)
      expect(stmt1).toBe(stmt2)
      expect(stmt1.get()).toEqual({ num: 1 })
    })

    it('closeDb closes instance safely and handles redundant calls', () => {
      const tempPath = path.resolve(os.tmpdir(), `soiree-temp-close-${Date.now()}.db`)
      const tempDb = initDb(tempPath)
      expect(tempDb).toBeDefined()
      closeDb()
      closeDb() // idempotent
      // restore active test db
      initDb(TEST_DB)
      expect(getDb()).toBeDefined()
      try {
        fs.unlinkSync(tempPath)
      } catch {
        // ignore
      }
    })

    it('replaces budget items atomically in budgetRepository', () => {
      const items: BudgetItem[] = [
        { id: 'b-new-1', category: 'Catering', allocated: 2500000, spent: 500000, note: 'Dinner' },
        { id: 'b-new-2', category: 'Decor', allocated: 1500000, spent: 0, note: 'Florals' },
      ]
      budgetRepository.replaceBudgetItems(planAId, items)

      const reloaded = budgetRepository.findByPlanId(planAId)
      expect(reloaded.length).toBe(2)
      expect(reloaded[0]?.category).toBe('Catering')
    })

    it('tests vendorsRepository updateVendor default fallbacks and chatRepository pagination', () => {
      const vendor = vendorsRepository.insertVendor(planAId, {
        category: 'Photography',
        name: 'Lens Studio',
        status: 'todo',
        estimate: 0,
        tips: '',
      })

      const updated = vendorsRepository.updateVendor(planAId, vendor.id, {
        category: 'Photography',
        name: 'Lens Studio Updated',
        status: 'contacted',
      })
      expect(updated).toBe(true)

      const chatCount = chatRepository.countByPlanId(planAId)
      const chatList = chatRepository.listByPlanId(planAId, 10, 0)
      expect(chatCount).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(chatList)).toBe(true)
    })
  })

  describe('4. Logger Branch Coverage', () => {
    it('formats log messages across all levels and handles error objects with context', () => {
      const prevDebug = process.env.DEBUG_LOGS
      const prevLevel = process.env.LOG_LEVEL
      process.env.DEBUG_LOGS = 'true'
      process.env.LOG_LEVEL = 'debug'
      try {
        const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

        logger.debug('Testing debug message', { meta: 'val' })
        logger.info('Testing info message')
        logger.warn('Testing warning message')
        logger.error('Testing error message', new Error('Test log failure'), { reqId: 'req-1' })

        expect(stdoutSpy).toHaveBeenCalled()
        expect(stderrSpy).toHaveBeenCalled()

        stdoutSpy.mockRestore()
        stderrSpy.mockRestore()
      } finally {
        process.env.DEBUG_LOGS = prevDebug
        process.env.LOG_LEVEL = prevLevel
      }
    })
  })

  describe('5. Gemini Failure & Malformed-JSON Fallbacks (Mock Fetch)', () => {
    it('generatePlan gracefully falls back to local procedural generation on Gemini 500 HTTP error', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }) as unknown as typeof fetch

      try {
        const brief: Brief = {
          type: 'wedding',
          title: 'Fallback Test Wedding',
          date: '2028-10-10',
          guests: 100,
          budget: 2000000,
          currency: 'INR',
          city: 'Delhi',
          vibe: 'Classic',
          notes: '',
        }

        const plan = await generatePlan(brief)
        expect(plan).toBeDefined()
        expect(plan.generatedBy).toBe('local')
        expect(plan.budget.length).toBeGreaterThan(0)
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('generatePlan gracefully falls back on malformed JSON returned by AI', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'This is not valid JSON at all!' }] } }],
        }),
      }) as unknown as typeof fetch

      try {
        const brief: Brief = {
          type: 'birthday',
          title: 'Malformed JSON Test',
          date: '2028-11-15',
          guests: 50,
          budget: 500000,
          currency: 'INR',
          city: 'Goa',
          vibe: 'Fun Party',
          notes: '',
        }

        const plan = await generatePlan(brief)
        expect(plan).toBeDefined()
        expect(plan.generatedBy).toBe('local')
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('generateMoodboard gracefully falls back to offline preset on Gemini fetch error', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline simulation')) as unknown as typeof fetch

      try {
        const brief: Brief = {
          type: 'community',
          title: 'Eco Gathering',
          date: '2028-05-01',
          guests: 300,
          budget: 800000,
          currency: 'INR',
          city: 'Bangalore',
          vibe: 'Eco Friendly',
          notes: '',
        }

        const result = await generateMoodboard(brief)
        expect(result.generatedBy).toBe('offline')
        expect(result.moodboard.palette.length).toBeGreaterThan(0)
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('rebalanceBudget gracefully falls back to offline rebalancer on malformed AI response', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'MALFORMED_NON_JSON_RESPONSE' }] } }],
        }),
      }) as unknown as typeof fetch

      try {
        const brief: Brief = {
          type: 'wedding',
          title: 'Rebalance Fallback',
          date: '2028-08-08',
          guests: 100,
          budget: 1000000,
          currency: 'INR',
          city: 'Pune',
          vibe: 'Traditional',
          notes: '',
        }
        const budget: BudgetItem[] = [
          { id: 'b1', category: 'Venue', allocated: 500000, spent: 600000, note: '' },
          { id: 'b2', category: 'Contingency', allocated: 100000, spent: 0, note: '' },
          { id: 'b3', category: 'Decor', allocated: 400000, spent: 200000, note: '' },
        ]

        const result = await rebalanceBudget(brief, budget)
        expect(result.proposal).toBeDefined()
        expect(result.proposal.changes.length).toBeGreaterThan(0)
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })

  describe('6. Rebalancer Invariants & Reason String Generation', () => {
    it('enforces total budget conservation, spent protection, and untouched contingency', () => {
      const budget: BudgetItem[] = [
        { id: 'b1', category: 'Catering', allocated: 1000000, spent: 1200000, note: '' },
        { id: 'b2', category: 'Contingency Reserve', allocated: 200000, spent: 0, note: '' },
        { id: 'b3', category: 'Decor & Florals', allocated: 600000, spent: 300000, note: '' },
        { id: 'b4', category: 'Music', allocated: 200000, spent: 50000, note: '' },
      ]
      const totalBudget = 2000000

      const changesMap = new Map([
        ['catering', { to: 800000, reason: '' }],
        ['contingency reserve', { to: 50000, reason: 'steal contingency' }],
        ['decor & florals', { to: 400000, reason: '' }],
        ['music', { to: 200000, reason: '' }],
      ])

      const proposal = applyRebalanceConstraints(budget, changesMap, totalBudget, 'INR')
      expect(proposal).not.toBeNull()
      if (proposal) {
        // Total conserved
        const sum = proposal.changes.reduce((acc, c) => acc + c.to, 0)
        expect(sum).toBe(totalBudget)

        // Preserved reason tested
        const musicItem = proposal.changes.find((c) => c.category === 'Music')
        expect(musicItem?.reason).toContain('Preserved target allocation')

        // Contingency untouched
        const cont = proposal.changes.find((c) => c.category.includes('Contingency'))
        expect(cont?.to).toBe(200000)

        // No category below spent
        const cat = proposal.changes.find((c) => c.category.includes('Catering'))
        expect(cat?.to).toBeGreaterThanOrEqual(1200000)

        // Auto-generated reasons exist
        proposal.changes.forEach((c) => {
          expect(c.reason.length).toBeGreaterThan(0)
        })
      }
    })

    it('returns null when rebalance diff cannot be absorbed by any adjustable category', () => {
      const budget: BudgetItem[] = [{ id: 'b1', category: 'Contingency', allocated: 1000000, spent: 1000000, note: '' }]
      const changesMap = new Map([['contingency', { to: 1000000, reason: '' }]])
      const proposal = applyRebalanceConstraints(budget, changesMap, 2000000, 'INR')
      expect(proposal).toBeNull()
    })
  })

  describe('7. Public Share Whitelist & Anti-Leak Protection', () => {
    it('guarantees public shared plan response strictly omits private fields', async () => {
      // Enable share on Plan A
      const shareRes = await request(app).post(`/api/plans/${planAId}/share`).set('Cookie', userACookie)
      expect(shareRes.status).toBe(200)
      const token = shareRes.body.shareToken
      expect(token).toBeDefined()

      // Fetch public plan via token without authentication
      const pubRes = await request(app).get(`/api/public/plans/${token}`)
      expect(pubRes.status).toBe(200)
      const pubPlan = pubRes.body.plan

      // Assert whitelist structure exists
      expect(pubPlan.title).toBe('Deep Coverage Plan')
      expect(pubPlan.eventType).toBe('wedding')
      expect(pubPlan.timeline).toBeDefined()
      expect(pubPlan.vendors).toBeDefined()
      expect(pubPlan.ideas).toBeDefined()

      // Strict anti-leak assertion: a test MUST fail if any private field leaks
      const rawJson = JSON.stringify(pubRes.body)
      expect(rawJson).not.toContain('Secret planner notes')
      expect(rawJson).not.toContain('budget_items')
      expect(rawJson).not.toContain('user_id')
      expect(rawJson).not.toContain('password')
      expect(pubPlan.budget).toBeUndefined()
      expect(pubPlan.notes).toBeUndefined()
      expect(pubPlan.brief?.notes).toBeUndefined()
      expect(pubPlan.brief?.budget).toBeUndefined()
      expect(pubPlan.userId).toBeUndefined()
      expect(pubPlan.user).toBeUndefined()
    })
  })

  describe('8. Cross-User Authorization Matrix (Prevent IDOR on every route)', () => {
    it('denies User B access to User A plan on all route operations (returns 404)', async () => {
      // 1. Get plan
      const getRes = await request(app).get(`/api/plans/${planAId}`).set('Cookie', userBCookie)
      expect(getRes.status).toBe(404)

      // 2. Delete plan
      const delRes = await request(app).delete(`/api/plans/${planAId}`).set('Cookie', userBCookie)
      expect(delRes.status).toBe(404)

      // 3. Update budget
      const bRes = await request(app)
        .patch(`/api/plans/${planAId}/budget/${budgetItemAId}`)
        .set('Cookie', userBCookie)
        .send({ allocated: 999999 })
      expect(bRes.status).toBe(404)

      // 4. Propose rebalance
      const rebRes = await request(app).post(`/api/plans/${planAId}/budget/rebalance`).set('Cookie', userBCookie)
      expect(rebRes.status).toBe(404)

      // 5. Apply rebalance
      const appRebRes = await request(app)
        .post(`/api/plans/${planAId}/budget/apply`)
        .set('Cookie', userBCookie)
        .send({ changes: [{ itemId: budgetItemAId, to: 1000 }] })
      expect(appRebRes.status).toBe(404)

      // 6. Update milestone
      const mRes = await request(app)
        .patch(`/api/plans/${planAId}/milestones/milestone-1`)
        .set('Cookie', userBCookie)
        .send({ done: true })
      expect(mRes.status).toBe(404)

      // 7. Add vendor
      const vRes = await request(app)
        .post(`/api/plans/${planAId}/vendors`)
        .set('Cookie', userBCookie)
        .send({ category: 'DJ', name: 'Malicious DJ' })
      expect(vRes.status).toBe(404)

      // 8. Delete vendor
      const delVRes = await request(app).delete(`/api/plans/${planAId}/vendors/v-1`).set('Cookie', userBCookie)
      expect(delVRes.status).toBe(404)

      // 9. List guests
      const gListRes = await request(app).get(`/api/plans/${planAId}/guests`).set('Cookie', userBCookie)
      expect(gListRes.status).toBe(404)

      // 10. Add guest
      const gAddRes = await request(app)
        .post(`/api/plans/${planAId}/guests`)
        .set('Cookie', userBCookie)
        .send({ name: 'Intruder' })
      expect(gAddRes.status).toBe(404)

      // 11. Guest summary
      const gSumRes = await request(app).get(`/api/plans/${planAId}/guests/summary`).set('Cookie', userBCookie)
      expect(gSumRes.status).toBe(404)

      // 12. Chat
      const chatRes = await request(app)
        .post(`/api/plans/${planAId}/chat`)
        .set('Cookie', userBCookie)
        .send({ message: 'Hello intruder' })
      expect(chatRes.status).toBe(404)

      // 13. Export ICS
      const icsRes = await request(app).get(`/api/plans/${planAId}/export.ics`).set('Cookie', userBCookie)
      expect(icsRes.status).toBe(404)

      // 14. Moodboard
      const moodRes = await request(app).get(`/api/plans/${planAId}/moodboard`).set('Cookie', userBCookie)
      expect(moodRes.status).toBe(404)

      // 15. Share link management
      const shareRes = await request(app).post(`/api/plans/${planAId}/share`).set('Cookie', userBCookie)
      expect(shareRes.status).toBe(404)
    })
  })

  describe('9. Guest Cost-Per-Head Edge Cases & ICS Export Route', () => {
    it('returns null for 0 confirmed attendees and handles catering headroom', () => {
      expect(calculateCostPerHead(500000, 0)).toBeNull()
      expect(calculateCostPerHead(500000, -5)).toBeNull()
      expect(calculateCostPerHead(500000, 50)).toBe(10000)
    })

    it('exports RFC 5545 calendar file for owner successfully', async () => {
      const res = await request(app).get(`/api/plans/${planAId}/export.ics`).set('Cookie', userACookie)
      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toContain('text/calendar')
      expect(res.text).toContain('BEGIN:VCALENDAR')
      expect(res.text).toContain('END:VCALENDAR')
    })

    it('fetches chat history with pagination for owner', async () => {
      const res = await request(app).get(`/api/plans/${planAId}/chat?limit=5&offset=0`).set('Cookie', userACookie)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.messages)).toBe(true)
    })
  })
})
