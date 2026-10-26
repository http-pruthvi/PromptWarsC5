import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import path from 'path'
import os from 'os'
import fs from 'fs'
import Database from 'better-sqlite3'
import { initDb, closeDb } from '../src/db/index.js'
import { generateLocalPlan } from '../src/services/generator.js'
import { guestsService } from '../src/services/guests.service.js'
import { vendorsService } from '../src/services/vendors.service.js'
import { generateMoodboard, rebalanceBudget } from '../src/services/ai.js'
import { NotFoundError } from '../src/errors/index.js'
import type { Brief, BudgetItem } from '@soiree/shared'

const TEST_DB = path.resolve(os.tmpdir(), `soiree-final-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`)

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

describe('Server Invariants & Branch Final Polish Suite', () => {
  let planId: string
  const userId = 'final-test-user-id'

  beforeAll(() => {
    cleanDb()
    const db = initDb(TEST_DB)
    db.prepare('INSERT INTO users (id, email, password_hash, is_guest, created_at) VALUES (?, ?, ?, 0, ?)').run(
      userId,
      'final@example.com',
      'hash',
      Date.now(),
    )
    planId = 'plan-final-123'
    db.prepare(
      'INSERT INTO plans (id, user_id, created_at, title, event_type, date, guests, budget, currency, city, vibe, notes, summary, generated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      planId,
      userId,
      Date.now(),
      'Final Gala',
      'wedding',
      '2028-09-01',
      100,
      1000000,
      'INR',
      'Delhi',
      'Royal Heritage',
      '',
      'Summary',
      'local',
    )
  })

  afterAll(() => {
    closeDb()
    cleanDb()
    vi.restoreAllMocks()
  })

  describe('1. Generator Timeline Compression Branch', () => {
    it('compresses timeline in summary when event is less than 8 weeks away', () => {
      const nearDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const brief: Brief = {
        type: 'wedding',
        title: 'Rush Wedding',
        date: nearDate,
        guests: 50,
        budget: 500000,
        currency: 'INR',
        city: 'Mumbai',
        vibe: 'Modern Sparkle',
        notes: '',
      }
      const plan = generateLocalPlan(brief)
      expect(plan.summary).toContain('timeline is tight')
    })
  })

  describe('2. Database Migrations on Legacy Schema', () => {
    it('runs migrations to add share_token and share_enabled to legacy plans table', () => {
      const legacyPath = path.resolve(os.tmpdir(), `legacy-db-${Date.now()}.db`)
      const rawDb = new Database(legacyPath)
      rawDb.exec(`
        CREATE TABLE plans (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          title TEXT NOT NULL,
          event_type TEXT NOT NULL,
          date TEXT NOT NULL,
          guests INTEGER NOT NULL,
          budget REAL NOT NULL,
          currency TEXT NOT NULL,
          city TEXT NOT NULL,
          vibe TEXT NOT NULL,
          notes TEXT NOT NULL,
          summary TEXT NOT NULL,
          generated_by TEXT NOT NULL
        );
      `)
      rawDb.close()

      // Opening via initDb runs runMigrations
      const migratedDb = initDb(legacyPath)
      const cols = migratedDb.pragma('table_info(plans)') as Array<{ name: string }>
      const colNames = new Set(cols.map((c) => c.name))
      expect(colNames.has('share_token')).toBe(true)
      expect(colNames.has('share_enabled')).toBe(true)

      closeDb()
      initDb(TEST_DB)
      try {
        fs.unlinkSync(legacyPath)
      } catch {
        // ignore
      }
    })

    it('creates missing nested directories when customPath is in non-existent directory', () => {
      const nestedPath = path.resolve(os.tmpdir(), `nested-${Date.now()}`, 'deep', 'test.db')
      const nestedDb = initDb(nestedPath)
      expect(nestedDb).toBeDefined()
      closeDb()
      initDb(TEST_DB)
      try {
        fs.rmSync(path.resolve(os.tmpdir(), `nested-${Date.now()}`), { recursive: true, force: true })
      } catch {
        // ignore
      }
    })
  })

  describe('3. Guests and Vendors Full Service Branches', () => {
    it('handles guestsService update and delete branches', () => {
      const guest = guestsService.addGuest(planId, userId, {
        name: 'Initial Guest',
        party: 2,
        status: 'pending',
        dietary: 'veg',
        notes: 'Needs ride',
      })

      const updated = guestsService.updateGuest(planId, userId, guest.id, {
        name: 'Updated Guest',
        party: 3,
        status: 'attending',
        dietary: 'vegan',
        notes: 'Has ride',
      })
      expect(updated.name).toBe('Updated Guest')
      expect(updated.party).toBe(3)
      expect(updated.status).toBe('attending')

      const gNoNotes = guestsService.addGuest(planId, userId, {
        name: 'G2',
        party: 1,
        status: 'pending',
        dietary: 'none',
        notes: '',
      })
      expect(gNoNotes.notes).toBe('')

      const unchanged = guestsService.updateGuest(planId, userId, guest.id, {})
      expect(unchanged.name).toBe('Updated Guest')

      expect(() => guestsService.updateGuest('missing-plan', userId, guest.id, {})).toThrow(NotFoundError)
      expect(() => guestsService.updateGuest(planId, userId, 'missing-guest-id', {})).toThrow(NotFoundError)
      expect(() => guestsService.deleteGuest('missing-plan', userId, guest.id)).toThrow(NotFoundError)
      expect(() => guestsService.deleteGuest(planId, userId, 'missing-guest-id')).toThrow(NotFoundError)

      guestsService.deleteGuest(planId, userId, guest.id)
    })

    it('handles vendorsService list and update edge branches', () => {
      expect(() => vendorsService.listVendors('missing-plan', userId, 10, 0)).toThrow(NotFoundError)

      const vendor = vendorsService.addVendor(planId, userId, {
        category: 'Florist',
        name: 'Petal Co',
        status: 'todo',
        estimate: 50000,
        tips: 'Get orchids',
      })

      const updated = vendorsService.updateVendor(planId, userId, vendor.id, {
        category: 'Decor & Florist',
        name: 'Petal Co Luxury',
        status: 'booked',
        estimate: 60000,
        tips: 'Confirmed orchids',
      })
      expect(updated.category).toBe('Decor & Florist')
      expect(updated.status).toBe('booked')
      expect(updated.estimate).toBe(60000)
    })
  })

  describe('4. AI Moodboard and Rebalance Warning Fallback Branches', () => {
    it('falls back with warning when Gemini moodboard validation fails', async () => {
      const prevKey = process.env.GEMINI_API_KEY
      process.env.GEMINI_API_KEY = 'test-key'
      const originalFetch = globalThis.fetch

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify({ palette: 'invalid-not-array' }) }] } }],
        }),
      }) as unknown as typeof fetch

      try {
        const brief: Brief = {
          type: 'wedding',
          title: 'Warn Test',
          date: '2028-09-01',
          guests: 100,
          budget: 1000000,
          currency: 'INR',
          city: 'Delhi',
          vibe: 'Modern',
          notes: '',
        }
        const res = await generateMoodboard(brief)
        expect(res.generatedBy).toBe('offline')
      } finally {
        globalThis.fetch = originalFetch
        if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey
        else delete process.env.GEMINI_API_KEY
      }
    })

    it('handles rebalanceBudget network rejection with warning fallback', async () => {
      const prevKey = process.env.GEMINI_API_KEY
      process.env.GEMINI_API_KEY = 'test-key'
      const originalFetch = globalThis.fetch

      globalThis.fetch = vi
        .fn()
        .mockRejectedValue(new Error('Network offline during rebalance')) as unknown as typeof fetch

      try {
        const brief: Brief = {
          type: 'wedding',
          title: 'Rebalance Warn Test',
          date: '2028-09-01',
          guests: 100,
          budget: 1000000,
          currency: 'INR',
          city: 'Delhi',
          vibe: 'Modern',
          notes: '',
        }
        const budget: BudgetItem[] = [{ id: 'b1', category: 'Venue', allocated: 500000, spent: 400000, note: '' }]
        const res = await rebalanceBudget(brief, budget)
        expect(res.ai).toBe(false)
        expect(res.proposal.changes.length).toBeGreaterThan(0)
      } finally {
        globalThis.fetch = originalFetch
        if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey
        else delete process.env.GEMINI_API_KEY
      }
    })
  })
})
