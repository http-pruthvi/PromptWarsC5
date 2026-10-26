import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { app } from '../src/app.js'
import { initDb, closeDb } from '../src/db/index.js'
import { vendorsService } from '../src/services/vendors.service.js'
import { guestsService } from '../src/services/guests.service.js'
import { guestsRepository } from '../src/repositories/guests.repository.js'
import { milestonesRepository } from '../src/repositories/milestones.repository.js'
import { chatRepository } from '../src/repositories/chat.repository.js'
import { moodboardRepository } from '../src/repositories/moodboard.repository.js'
import { budgetRepository } from '../src/repositories/budget.repository.js'
import { vendorsRepository } from '../src/repositories/vendors.repository.js'
import { generateOfflineMoodboard, localAnswer, generateLocalPlan } from '../src/services/generator.js'
import { escapeHtml } from '../src/utils/sanitize.js'
import { escapeICSText, buildICS } from '../src/services/ics.js'
import { briefLine, buildMoodboardPrompt } from '../src/services/ai/prompts.js'
import { ValidationError, NotFoundError } from '../src/errors/index.js'
import type { Brief, Plan } from '@soiree/shared'

const TEST_DB = path.resolve(os.tmpdir(), `soiree-extra-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`)

function cleanDb() {
  for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`, `${TEST_DB}-journal`]) {
    if (fs.existsSync(f))
      try {
        fs.unlinkSync(f)
      } catch {
        /* ignore */
      }
  }
}

describe('Deep Branches Extra & Utilities Coverage Suite', () => {
  let userCookie: string
  let userId: string
  let planId: string
  let sampleBrief: Brief

  beforeAll(async () => {
    cleanDb()
    initDb(TEST_DB)

    const res = await request(app).post('/api/auth/guest')
    expect(res.status).toBe(201)
    userCookie = res.headers['set-cookie']?.[0] ?? ''
    userId = res.body.user.id

    sampleBrief = {
      type: 'community',
      title: 'Extra Gala',
      date: '2028-04-10',
      guests: 120,
      budget: 800000,
      currency: 'INR',
      city: 'Delhi',
      vibe: 'Modern Sparkle',
      notes: '',
    }

    const planRes = await request(app).post('/api/plans').set('Cookie', userCookie).send(sampleBrief)
    expect(planRes.status).toBe(201)
    planId = planRes.body.plan.id
  })

  afterAll(() => {
    closeDb()
    cleanDb()
    vi.restoreAllMocks()
  })

  describe('1. Vendors and Guests Service Branch Coverage', () => {
    it('handles vendor add default fallbacks and partial updates', () => {
      const created = vendorsService.addVendor(planId, userId, { category: 'Lighting' })
      expect(created.category).toBe('Lighting')
      expect(created.name).toBe('')
      expect(created.status).toBe('todo')

      const updated = vendorsService.updateVendor(planId, userId, created.id, {
        estimate: 150000,
        tips: 'Book early',
      })
      expect(updated.estimate).toBe(150000)
      expect(updated.tips).toBe('Book early')
      expect(updated.name).toBe('')

      expect(() => vendorsService.updateVendor(planId, userId, 'non-existent-vendor-id', { name: 'Fail' })).toThrow(
        NotFoundError,
      )
    })

    it('validates guest pasted import limits and empty input', () => {
      expect(() => guestsService.importPastedGuests(planId, userId, '')).toThrow(ValidationError)

      const excessiveLines = Array.from({ length: 501 }, (_, i) => `Guest ${i}`).join('\n')
      expect(() => guestsService.importPastedGuests(planId, userId, excessiveLines)).toThrow(ValidationError)
    })

    it('tests guestsRepository clearAll and catering allocation fallback', () => {
      guestsRepository.clearAll(planId)
      const count = guestsRepository.findByPlanId(planId).length
      expect(count).toBe(0)

      const cateringAlloc = guestsRepository.getCateringAllocation('non-existent-plan')
      expect(cateringAlloc).toBe(0)
    })
  })

  describe('2. Repositories Direct Coverage', () => {
    it('tests milestones and chat repositories', () => {
      const milestones = milestonesRepository.findByPlanId(planId)
      expect(Array.isArray(milestones)).toBe(true)
      expect(milestones.length).toBeGreaterThan(0)

      expect(chatRepository.countByPlanId('non-existent-plan')).toBe(0)
      chatRepository.appendMessage(planId, 'user', 'Hello there')
      const history = chatRepository.getFullHistory(planId)
      expect(history.length).toBeGreaterThanOrEqual(1)
      expect(history[0]?.role).toBe('user')
    })

    it('upserts and retrieves moodboard via repository and service', () => {
      const offline = generateOfflineMoodboard(sampleBrief)
      const upserted = moodboardRepository.upsertMoodboard(planId, offline, 'offline')
      expect(upserted.generatedBy).toBe('offline')

      const loaded = moodboardRepository.findByPlanId(planId)
      expect(loaded).not.toBeNull()
      expect(loaded?.moodboard.palette.length).toBe(5)

      const nonExistent = moodboardRepository.findByPlanId('missing-plan-id')
      expect(nonExistent).toBeNull()
    })

    it('tests budget, vendors and guests repository default fallbacks', () => {
      const budgetData = { category: 'Decor', allocated: 10000, spent: 0, note: '' }
      expect(budgetRepository.updateItem(planId, 'missing-item', budgetData)).toBe(false)
      expect(milestonesRepository.updateDone(planId, 'missing-m', false)).toBe(false)

      const v = vendorsRepository.insertVendor(planId, {
        category: 'DJ',
        name: 'DJ Beat',
        status: 'todo',
        estimate: 0,
        tips: '',
      })
      expect(v.estimate).toBe(0)
      expect(v.tips).toBe('')
      const vUpdate = { category: 'DJ', name: 'DJ Pro', status: 'booked' as const, estimate: 0, tips: '' }
      expect(vendorsRepository.updateVendor(planId, v.id, vUpdate)).toBe(true)

      const g1 = guestsRepository.insertGuest(planId, {
        name: 'VIP Guest',
        party: 1,
        status: 'attending',
        dietary: 'veg',
        notes: 'VIP',
      })
      expect(g1.notes).toBe('VIP')
      const plainGuest = {
        name: 'Guest Plain',
        party: 1,
        status: 'pending' as const,
        dietary: 'none' as const,
        notes: '',
      }
      const g2 = guestsRepository.insertGuest(planId, plainGuest)
      expect(g2.notes).toBe('')
      const gUpdate = { name: 'G', party: 1, status: 'pending' as const, dietary: 'none' as const, notes: '' }
      expect(guestsRepository.updateGuest(planId, 'missing-g', gUpdate)).toBe(false)
    })
  })

  describe('3. Route Parameter Validation Catch Branches', () => {
    it('catches invalid params and handles error in plan sub-routes', async () => {
      const longId = 'a'.repeat(65)
      const r1 = await request(app).get(`/api/plans/${longId}/chat`).set('Cookie', userCookie)
      expect(r1.status).toBe(400)

      const r2 = await request(app).patch(`/api/plans/${planId}/guests/${longId}`).set('Cookie', userCookie).send({})
      expect(r2.status).toBe(400)

      const r3 = await request(app).delete(`/api/plans/${planId}/guests/${longId}`).set('Cookie', userCookie)
      expect(r3.status).toBe(400)

      const r4 = await request(app).post(`/api/plans/${longId}/ideas/regenerate`).set('Cookie', userCookie).send({})
      expect(r4.status).toBe(400)

      const r5 = await request(app).get(`/api/plans/${longId}/share`).set('Cookie', userCookie)
      expect(r5.status).toBe(400)

      const r6 = await request(app).get(`/api/plans/${longId}/vendors`).set('Cookie', userCookie)
      expect(r6.status).toBe(400)
    })
  })

  describe('4. Utilities Branch Coverage', () => {
    it('handles escapeHtml and escapeICSText empty string branches', () => {
      expect(escapeHtml('')).toBe('')
      expect(escapeICSText('')).toBe('')
      expect(escapeICSText('Line 1\nLine 2; and, backslash\\')).toBe('Line 1\\nLine 2\\; and\\, backslash\\\\')
    })

    it('handles briefLine and buildMoodboardPrompt fallbacks', () => {
      const emptyBrief: Brief = {
        type: 'birthday',
        title: '',
        date: '2028-01-01',
        guests: 10,
        budget: 10000,
        currency: 'INR',
        city: '',
        vibe: '',
        notes: '',
      }
      const line = briefLine(emptyBrief)
      expect(line).toContain('untitled')
      expect(line).toContain('unspecified')
      expect(line).toContain('none')

      const promptNoExtra = buildMoodboardPrompt(emptyBrief)
      expect(promptNoExtra).not.toContain('Additional user vision')
      const promptWithExtra = buildMoodboardPrompt(emptyBrief, 'Warm tones')
      expect(promptWithExtra).toContain('Warm tones')
    })

    it('handles localAnswer all milestones done and all vendors contacted branches', () => {
      const plan: Plan = generateLocalPlan(sampleBrief)
      plan.timeline.forEach((m) => {
        m.done = true
      })
      const ansTimeline = localAnswer(plan, 'What is next on timeline?')
      expect(ansTimeline).toBe('All milestones are done — enjoy the day!')

      plan.vendors.forEach((v) => {
        v.status = 'booked'
      })
      const ansVendors = localAnswer(plan, 'Which vendor to book?')
      expect(ansVendors).toContain('Every vendor is at least contacted')

      const ics = buildICS({ ...plan, brief: { ...sampleBrief, title: '' } })
      expect(ics).toContain('The big day')
    })
  })
})
