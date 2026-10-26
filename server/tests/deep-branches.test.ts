import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { app } from '../src/app.js'
import { initDb, closeDb } from '../src/db/index.js'
import { signToken } from '../src/middleware/auth.js'
import { callGemini } from '../src/services/ai/geminiClient.js'
import { parseAndBuildPlan, validateAndMapMoodboard, parseRebalanceResponse } from '../src/services/ai/aiParsers.js'
import { askAssistant } from '../src/services/ai.js'
import { generateLocalPlan, generateOfflineMoodboard } from '../src/services/generator.js'
import type { Brief } from '@soiree/shared'

const TEST_DB = path.resolve(os.tmpdir(), `soiree-branches-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`)

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

describe('Deep Branch & Edge Condition Coverage Suite', () => {
  let userCookie: string
  let sampleBrief: Brief
  let _planId: string

  beforeAll(async () => {
    cleanDb()
    initDb(TEST_DB)

    const res = await request(app).post('/api/auth/guest')
    expect(res.status).toBe(201)
    userCookie = res.headers['set-cookie'][0]

    sampleBrief = {
      type: 'birthday',
      title: 'Branch Gala',
      date: '2028-12-31',
      guests: 80,
      budget: 1500000,
      currency: 'INR',
      city: 'Delhi',
      vibe: 'Modern Sparkle',
      notes: '',
    }

    const planRes = await request(app).post('/api/plans').set('Cookie', userCookie).send(sampleBrief)
    expect(planRes.status).toBe(201)
    _planId = planRes.body.plan.id
  })

  afterAll(() => {
    closeDb()
    cleanDb()
    vi.restoreAllMocks()
  })

  describe('1. Authentication Non-Existent User Handling', () => {
    it('returns 401 and clears cookie when JWT contains non-existent user id in /api/auth/me', async () => {
      const ghostToken = signToken({ id: 'ghost-non-existent-user-id', email: null, isGuest: true })
      const res = await request(app).get('/api/auth/me').set('Cookie', `soiree_token=${ghostToken}`)

      expect(res.status).toBe(401)
      expect(res.body.error).toBe('User not found')
      const setCookie = res.headers['set-cookie']
      expect(setCookie).toBeDefined()
    })
  })

  describe('2. Gemini Client Direct Invariant & Branch Tests', () => {
    it('throws when GEMINI_API_KEY is not configured', async () => {
      const prevKey = process.env.GEMINI_API_KEY
      delete process.env.GEMINI_API_KEY
      try {
        await expect(callGemini('test prompt', true)).rejects.toThrow('No Gemini API key')
      } finally {
        if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey
      }
    })

    it('successfully calls Gemini endpoint and parses content with system prompt', async () => {
      const prevKey = process.env.GEMINI_API_KEY
      process.env.GEMINI_API_KEY = 'test-key-mock'
      const originalFetch = globalThis.fetch

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Mocked Gemini Response' }] } }],
        }),
      }) as unknown as typeof fetch

      try {
        const text = await callGemini('Generate ideas', false, 'You are an event planner')
        expect(text).toBe('Mocked Gemini Response')
      } finally {
        globalThis.fetch = originalFetch
        if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey
        else delete process.env.GEMINI_API_KEY
      }
    })

    it('throws when Gemini returns candidate with empty parts', async () => {
      const prevKey = process.env.GEMINI_API_KEY
      process.env.GEMINI_API_KEY = 'test-key-mock'
      const originalFetch = globalThis.fetch

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [] } }],
        }),
      }) as unknown as typeof fetch

      try {
        await expect(callGemini('Prompt', true)).rejects.toThrow('Empty response from Gemini')
      } finally {
        globalThis.fetch = originalFetch
        if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey
        else delete process.env.GEMINI_API_KEY
      }
    })

    it('askAssistant falls back to local responder when callGemini throws', async () => {
      const prevKey = process.env.GEMINI_API_KEY
      process.env.GEMINI_API_KEY = 'test-key-mock'
      const originalFetch = globalThis.fetch

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Gemini offline')) as unknown as typeof fetch

      try {
        const plan = generateLocalPlan(sampleBrief)
        const res = await askAssistant(plan, [], 'What is the budget?')
        expect(res.ai).toBe(false)
        expect(res.text.length).toBeGreaterThan(0)
      } finally {
        globalThis.fetch = originalFetch
        if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey
        else delete process.env.GEMINI_API_KEY
      }
    })
  })

  describe('3. AI Parser Edge Cases and Validation', () => {
    it('throws on incomplete structure in parseAndBuildPlan', () => {
      expect(() => parseAndBuildPlan('{"budget":[]}', sampleBrief)).toThrow('Incomplete structure in Gemini response')
      expect(() => parseAndBuildPlan('{"budget":[{"category":"Venue","percent":100}]}', sampleBrief)).toThrow(
        'Incomplete structure in Gemini response',
      )

      const fullJson = JSON.stringify({
        summary: 'Parsed Gemini Plan',
        budget: [
          { category: 'Venue', percent: 60, note: 'Ballroom' },
          { category: 'Food', percent: 40 },
        ],
        timeline: [
          { label: 'Book', detail: 'Advance', weeksBefore: 10 },
          { label: 'Go', weeksBefore: 0 },
        ],
        vendors: [
          { category: 'Catering', percent: 40, tips: 'Tasting' },
          { category: 'DJ', percent: 10 },
        ],
        ideas: [{ title: 'Decor', items: ['Candles'] }, { title: 'Music' }],
      })
      const parsed = parseAndBuildPlan(fullJson, sampleBrief)
      expect(parsed.summary).toBe('Parsed Gemini Plan')
      expect(parsed.budget.length).toBeGreaterThan(0)
    })

    it('returns null on invalid palette or typography, and maps valid moodboard correctly', () => {
      const offline = generateOfflineMoodboard(sampleBrief)
      expect(validateAndMapMoodboard({ palette: 'not-array' }, offline)).toBeNull()
      expect(validateAndMapMoodboard({ palette: [{ name: 'A', role: 'B', hex: 'invalid-hex' }] }, offline)).toBeNull()
      const validPalette = [
        { name: 'A', role: 'B', hex: '#ffffff' },
        { name: 'C', role: 'D', hex: '#000000' },
        { name: 'E', role: 'F', hex: '#111111' },
        { name: 'G', role: 'H', hex: '#222222' },
        { name: 'I', role: 'J', hex: '#333333' },
      ]
      expect(validateAndMapMoodboard({ palette: validPalette, typography: 'invalid' }, offline)).toBeNull()

      const mappedWithArrays = validateAndMapMoodboard(
        {
          palette: validPalette,
          typography: { heading: 'Cormorant', body: 'Inter', vibe: 'Royal' },
          motifs: ['Arch'],
          decor: ['Lights'],
          outfitNotes: ['Silk'],
          playlistVibes: ['Jazz'],
        },
        offline,
      )
      expect(mappedWithArrays?.motifs[0]).toBe('Arch')

      const mappedWithFallbacks = validateAndMapMoodboard(
        {
          palette: validPalette,
          typography: { heading: 'Cormorant', body: 'Inter', vibe: 'Royal' },
        },
        offline,
      )
      expect(mappedWithFallbacks?.motifs).toEqual(offline.motifs)
    })

    it('handles parseRebalanceResponse invalid formats', () => {
      expect(parseRebalanceResponse('not-json')).toBeNull()
      expect(parseRebalanceResponse('{"changes": "not-array"}')).toBeNull()
      const valid = parseRebalanceResponse(
        '{"changes":[{"category":"Venue","to":500000,"reason":"Booked"}],"summary":"Good"}',
      )
      expect(valid).not.toBeNull()
      expect(valid?.summary).toBe('Good')
    })
  })
})
