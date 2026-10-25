import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'
import { app } from '../src/app.js'
import { initDb, closeDb } from '../src/db/index.js'
import { escapeICSText, foldICSLine } from '../src/services/ics.js'
import { sanitizeText } from '../src/utils/sanitize.js'

const TEST_DB = path.resolve(os.tmpdir(), `soiree-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`)

function cleanTestDb() {
  for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`, `${TEST_DB}-journal`]) {
    if (fs.existsSync(f)) {
      try { fs.unlinkSync(f) } catch {}
    }
  }
}

describe('Soirée Fullstack Backend Test Suite', () => {
  beforeAll(() => {
    cleanTestDb()
    initDb(TEST_DB)
  })

  afterAll(() => {
    closeDb()
    cleanTestDb()
  })

  describe('1. Health Check', () => {
    it('returns status ok', async () => {
      const res = await request(app).get('/api/health')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
    })
  })

  describe('2. Authentication Flow & Guest Access', () => {
    let authCookie: string

    it('creates an instant guest session via /api/auth/guest', async () => {
      const res = await request(app).post('/api/auth/guest')
      expect(res.status).toBe(201)
      expect(res.body.user).toBeDefined()
      expect(res.body.user.isGuest).toBe(true)

      const cookies = res.headers['set-cookie']
      expect(cookies).toBeDefined()
      expect(cookies[0]).toContain('soiree_token=')
      authCookie = cookies[0]
    })

    it('verifies authenticated session via /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie)

      expect(res.status).toBe(200)
      expect(res.body.user.isGuest).toBe(true)
    })

    it('registers a new user with email and password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'host@soiree.luxury', password: 'password123' })

      expect(res.status).toBe(201)
      expect(res.body.user.email).toBe('host@soiree.luxury')
      expect(res.body.user.isGuest).toBe(false)
    })

    it('rejects duplicate email registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'host@soiree.luxury', password: 'password123' })

      expect(res.status).toBe(409)
      expect(res.body.error).toContain('already exists')
    })

    it('logs in the registered user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'host@soiree.luxury', password: 'password123' })

      expect(res.status).toBe(200)
      expect(res.body.user.email).toBe('host@soiree.luxury')
    })

    it('logs out and clears session cookie', async () => {
      const res = await request(app).post('/api/auth/logout')
      expect(res.status).toBe(200)
      const cookies = res.headers['set-cookie']
      expect(cookies[0]).toContain('soiree_token=;')
    })
  })

  describe('3. Plan Creation with Offline Fallback & CRUD', () => {
    let guestCookie: string
    let createdPlanId: string
    let milestoneId: string
    let budgetItemId: string

    beforeAll(async () => {
      const res = await request(app).post('/api/auth/guest')
      guestCookie = res.headers['set-cookie'][0]
    })

    it('creates a complete plan using the offline generator fallback', async () => {
      const res = await request(app)
        .post('/api/plans')
        .set('Cookie', guestCookie)
        .send({
          type: 'wedding',
          title: 'Aria & Rohan Nuptials',
          date: '2027-02-14',
          guests: 200,
          budget: 2500000,
          currency: 'INR',
          city: 'Udaipur',
          vibe: 'Royal traditional',
          notes: 'Lakefront ceremony and royal banquet',
        })

      expect(res.status).toBe(201)
      const plan = res.body.plan
      expect(plan).toBeDefined()
      expect(plan.brief.title).toBe('Aria & Rohan Nuptials')
      expect(plan.budget.length).toBeGreaterThanOrEqual(6)
      expect(plan.timeline.length).toBeGreaterThanOrEqual(8)
      expect(plan.vendors.length).toBeGreaterThanOrEqual(6)
      expect(plan.ideas.length).toBeGreaterThanOrEqual(3)

      // Verify budget totals
      const totalAllocated = plan.budget.reduce((s: number, b: any) => s + b.allocated, 0)
      expect(totalAllocated).toBe(2500000)

      createdPlanId = plan.id
      milestoneId = plan.timeline[0].id
      budgetItemId = plan.budget[0].id
    })

    it('retrieves the plan list for the user', async () => {
      const res = await request(app)
        .get('/api/plans')
        .set('Cookie', guestCookie)

      expect(res.status).toBe(200)
      expect(res.body.plans.length).toBe(1)
      expect(res.body.plans[0].id).toBe(createdPlanId)
    })

    it('retrieves full plan details by ID', async () => {
      const res = await request(app)
        .get(`/api/plans/${createdPlanId}`)
        .set('Cookie', guestCookie)

      expect(res.status).toBe(200)
      expect(res.body.plan.id).toBe(createdPlanId)
      expect(res.body.plan.brief.city).toBe('Udaipur')
    })

    it('updates milestone completion state (optimistic tick)', async () => {
      const res = await request(app)
        .patch(`/api/plans/${createdPlanId}/milestones/${milestoneId}`)
        .set('Cookie', guestCookie)
        .send({ done: true })

      expect(res.status).toBe(200)
      expect(res.body.done).toBe(true)

      // Confirm persistence in DB
      const getRes = await request(app)
        .get(`/api/plans/${createdPlanId}`)
        .set('Cookie', guestCookie)
      const m = getRes.body.plan.timeline.find((x: any) => x.id === milestoneId)
      expect(m.done).toBe(true)
    })

    it('updates budget item allocation and spent amounts', async () => {
      const res = await request(app)
        .patch(`/api/plans/${createdPlanId}/budget/${budgetItemId}`)
        .set('Cookie', guestCookie)
        .send({ allocated: 750000, spent: 250000 })

      expect(res.status).toBe(200)
      expect(res.body.item.allocated).toBe(750000)
      expect(res.body.item.spent).toBe(250000)
    })

    it('handles Ask Soirée chat and persists history', async () => {
      const res = await request(app)
        .post(`/api/plans/${createdPlanId}/chat`)
        .set('Cookie', guestCookie)
        .send({ message: 'What is the biggest lever to save money?' })

      expect(res.status).toBe(200)
      expect(res.body.reply.text).toBeDefined()
      expect(res.body.reply.role).toBe('assistant')

      // Check chat history retrieval
      const chatRes = await request(app)
        .get(`/api/plans/${createdPlanId}/chat`)
        .set('Cookie', guestCookie)

      expect(chatRes.status).toBe(200)
      expect(chatRes.body.messages.length).toBe(2)
      expect(chatRes.body.messages[0].role).toBe('user')
      expect(chatRes.body.messages[1].role).toBe('assistant')
    })

    it('exports RFC 5545 calendar (.ics)', async () => {
      const res = await request(app)
        .get(`/api/plans/${createdPlanId}/export.ics`)
        .set('Cookie', guestCookie)

      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toContain('text/calendar')
      expect(res.text).toContain('BEGIN:VCALENDAR')
      expect(res.text).toContain('BEGIN:VEVENT')
      expect(res.text).toContain('END:VCALENDAR')
    })
  })

  describe('4. User Ownership & Data Isolation Security Checks', () => {
    let userACookie: string
    let userBCookie: string
    let planAId: string

    beforeAll(async () => {
      // User A
      const resA = await request(app)
        .post('/api/auth/register')
        .send({ email: 'user.a@soiree.com', password: 'passwordA123' })
      userACookie = resA.headers['set-cookie'][0]

      // User B
      const resB = await request(app)
        .post('/api/auth/register')
        .send({ email: 'user.b@soiree.com', password: 'passwordB123' })
      userBCookie = resB.headers['set-cookie'][0]

      // User A creates a plan
      const planRes = await request(app)
        .post('/api/plans')
        .set('Cookie', userACookie)
        .send({
          type: 'birthday',
          title: "Secret 30th Birthday for User A",
          date: '2027-05-20',
          guests: 50,
          budget: 150000,
          currency: 'INR',
          city: 'Mumbai',
          vibe: 'Retro party',
          notes: 'Top secret surprise',
        })
      planAId = planRes.body.plan.id
    })

    it("User B CANNOT read User A's plan list", async () => {
      const res = await request(app)
        .get('/api/plans')
        .set('Cookie', userBCookie)

      expect(res.status).toBe(200)
      const found = res.body.plans.find((p: any) => p.id === planAId)
      expect(found).toBeUndefined()
    })

    it("User B CANNOT fetch User A's plan details (404/Isolated)", async () => {
      const res = await request(app)
        .get(`/api/plans/${planAId}`)
        .set('Cookie', userBCookie)

      expect(res.status).toBe(404)
      expect(res.body.error).toContain('not found')
    })

    it("User B CANNOT mutate User A's milestones", async () => {
      const res = await request(app)
        .patch(`/api/plans/${planAId}/milestones/some-milestone`)
        .set('Cookie', userBCookie)
        .send({ done: true })

      expect(res.status).toBe(404)
    })

    it("User B CANNOT delete User A's plan", async () => {
      const res = await request(app)
        .delete(`/api/plans/${planAId}`)
        .set('Cookie', userBCookie)

      expect(res.status).toBe(404)
    })

    it("User A CAN delete their own plan, cascading to all sub-tables", async () => {
      const res = await request(app)
        .delete(`/api/plans/${planAId}`)
        .set('Cookie', userACookie)

      expect(res.status).toBe(200)

      // Confirm plan is deleted
      const checkRes = await request(app)
        .get(`/api/plans/${planAId}`)
        .set('Cookie', userACookie)
      expect(checkRes.status).toBe(404)
    })
  })

  describe('5. Feature 1: AI Moodboard & Palette Endpoints', () => {
    let userCookie: string
    let otherCookie: string
    let testPlanId: string

    beforeAll(async () => {
      // Create user 1 and a plan
      const userRes = await request(app).post('/api/auth/guest')
      userCookie = userRes.headers['set-cookie'][0]

      const planRes = await request(app)
        .post('/api/plans')
        .set('Cookie', userCookie)
        .send({
          type: 'wedding',
          title: 'Royal Udaipur Nuptials',
          date: '2027-11-20',
          guests: 200,
          budget: 5000000,
          currency: 'INR',
          city: 'Udaipur',
          vibe: 'Royal Heritage Velvet & Gilded Gold',
          notes: 'Lakeside palace ceremony',
        })
      testPlanId = planRes.body.plan.id

      // Create user 2
      const otherRes = await request(app).post('/api/auth/guest')
      otherCookie = otherRes.headers['set-cookie'][0]
    })

    it('requires authentication for GET /api/plans/:id/moodboard (401)', async () => {
      const res = await request(app).get(`/api/plans/${testPlanId}/moodboard`)
      expect(res.status).toBe(401)
    })

    it('requires authentication for POST /api/plans/:id/moodboard (401)', async () => {
      const res = await request(app).post(`/api/plans/${testPlanId}/moodboard`).send({})
      expect(res.status).toBe(401)
    })

    it('returns 404 when fetching moodboard before it is generated', async () => {
      const res = await request(app)
        .get(`/api/plans/${testPlanId}/moodboard`)
        .set('Cookie', userCookie)
      expect(res.status).toBe(404)
    })

    it('enforces ownership check: User B cannot generate moodboard on User A plan (404)', async () => {
      const res = await request(app)
        .post(`/api/plans/${testPlanId}/moodboard`)
        .set('Cookie', otherCookie)
        .send({ extra: 'Make it neon carnival' })
      expect(res.status).toBe(404)
    })

    it('generates a valid moodboard with 5 colors, typography, and styling notes (offline fallback)', async () => {
      const res = await request(app)
        .post(`/api/plans/${testPlanId}/moodboard`)
        .set('Cookie', userCookie)
        .send({ extra: 'Royal gold and crimson accents' })

      expect(res.status).toBe(200)
      expect(res.body.moodboard).toBeDefined()

      const mb = res.body.moodboard
      expect(mb.palette).toHaveLength(5)
      const hexRegex = /^#[0-9a-f]{6}$/i
      for (const color of mb.palette) {
        expect(color.name).toBeTruthy()
        expect(color.role).toBeTruthy()
        expect(color.hex).toMatch(hexRegex)
      }

      expect(mb.typography.heading).toBeTruthy()
      expect(mb.typography.body).toBeTruthy()
      expect(mb.typography.vibe).toBeTruthy()

      expect(Array.isArray(mb.motifs)).toBe(true)
      expect(mb.motifs.length).toBeGreaterThan(0)
      expect(Array.isArray(mb.decor)).toBe(true)
      expect(mb.decor.length).toBeGreaterThan(0)
      expect(Array.isArray(mb.outfitNotes)).toBe(true)
      expect(mb.outfitNotes.length).toBeGreaterThan(0)
      expect(Array.isArray(mb.playlistVibes)).toBe(true)
      expect(mb.playlistVibes.length).toBeGreaterThan(0)
    })

    it('retrieves the saved moodboard via GET /api/plans/:id/moodboard', async () => {
      const res = await request(app)
        .get(`/api/plans/${testPlanId}/moodboard`)
        .set('Cookie', userCookie)

      expect(res.status).toBe(200)
      expect(res.body.moodboard).toBeDefined()
      expect(res.body.moodboard.palette).toHaveLength(5)
    })

    it('enforces ownership check: User B cannot retrieve User A moodboard (404)', async () => {
      const res = await request(app)
        .get(`/api/plans/${testPlanId}/moodboard`)
        .set('Cookie', otherCookie)

      expect(res.status).toBe(404)
    })
  })

  describe('6. Feature 2: Shareable Read-Only Plan Link Endpoints', () => {
    let ownerCookie: string
    let otherCookie: string
    let planId: string
    let shareToken: string

    beforeAll(async () => {
      const ownerRes = await request(app).post('/api/auth/guest')
      ownerCookie = ownerRes.headers['set-cookie'][0]

      const planRes = await request(app)
        .post('/api/plans')
        .set('Cookie', ownerCookie)
        .send({
          type: 'birthday',
          title: 'Ayaan 30th Golden Milestone',
          date: '2027-09-15',
          guests: 75,
          budget: 1500000,
          currency: 'INR',
          city: 'Mumbai',
          vibe: 'Modern Black Tie & Rose Gold',
          notes: 'Rooftop celebration with live jazz and private chef',
        })
      planId = planRes.body.plan.id

      // Also generate moodboard for this plan so we can test public moodboard visibility
      await request(app)
        .post(`/api/plans/${planId}/moodboard`)
        .set('Cookie', ownerCookie)
        .send({})

      const otherRes = await request(app).post('/api/auth/guest')
      otherCookie = otherRes.headers['set-cookie'][0]
    })

    it('requires auth to enable share link (401)', async () => {
      const res = await request(app).post(`/api/plans/${planId}/share`)
      expect(res.status).toBe(401)
    })

    it('requires auth to revoke share link (401)', async () => {
      const res = await request(app).delete(`/api/plans/${planId}/share`)
      expect(res.status).toBe(401)
    })

    it('enforces ownership check: User B cannot enable share for User A plan (404)', async () => {
      const res = await request(app)
        .post(`/api/plans/${planId}/share`)
        .set('Cookie', otherCookie)
      expect(res.status).toBe(404)
    })

    it('enforces ownership check: User B cannot revoke share for User A plan (404)', async () => {
      const res = await request(app)
        .delete(`/api/plans/${planId}/share`)
        .set('Cookie', otherCookie)
      expect(res.status).toBe(404)
    })

    it('returns 404 on public route when share is not yet enabled', async () => {
      const res = await request(app).get('/api/public/plans/random-unregistered-token-xyz')
      expect(res.status).toBe(404)
      expect(res.body.error).toContain('not found')
    })

    it('enables share and returns a 24-char URL-safe token', async () => {
      const res = await request(app)
        .post(`/api/plans/${planId}/share`)
        .set('Cookie', ownerCookie)

      expect(res.status).toBe(200)
      expect(res.body.shareEnabled).toBe(true)
      expect(typeof res.body.shareToken).toBe('string')
      expect(res.body.shareToken).toHaveLength(24)
      shareToken = res.body.shareToken
    })

    it('fetches sanitized read-only plan via public route without exposing budget or confidential fields', async () => {
      const res = await request(app).get(`/api/public/plans/${shareToken}`)

      expect(res.status).toBe(200)
      expect(res.body.plan).toBeDefined()
      const p = res.body.plan

      expect(p.title).toBe('Ayaan 30th Golden Milestone')
      expect(p.eventType).toBe('birthday')
      expect(p.city).toBe('Mumbai')
      expect(p.summary).toBeTruthy()
      expect(Array.isArray(p.timeline)).toBe(true)
      expect(Array.isArray(p.vendors)).toBe(true)
      expect(Array.isArray(p.ideas)).toBe(true)
      expect(p.moodboard).toBeDefined()
      expect(p.moodboard.palette).toHaveLength(5)

      // Strict sanitization checks
      expect((p as any).budget).toBeUndefined()
      expect((p as any).spent).toBeUndefined()
      expect((p as any).notes).toBeUndefined()
      expect((p as any).chat).toBeUndefined()
      expect((p as any).email).toBeUndefined()
      expect((p as any).userId).toBeUndefined()
      expect((p as any).user_id).toBeUndefined()

      // Vendor sanitization: check that vendors have NO estimate or tips
      for (const v of p.vendors) {
        expect(v.category).toBeTruthy()
        expect(v.status).toBeTruthy()
        expect((v as any).estimate).toBeUndefined()
        expect((v as any).tips).toBeUndefined()
      }
    })

    it('revokes share link and returns 404 for subsequent public requests', async () => {
      const revokeRes = await request(app)
        .delete(`/api/plans/${planId}/share`)
        .set('Cookie', ownerCookie)

      expect(revokeRes.status).toBe(200)
      expect(revokeRes.body.shareEnabled).toBe(false)

      // Revoked token must return the same 404 as unknown token
      const checkRes = await request(app).get(`/api/public/plans/${shareToken}`)
      expect(checkRes.status).toBe(404)
      expect(checkRes.body.error).toContain('not found')
    })
  })

  describe('7. Feature 3: Guest List & RSVP Tracker Endpoints', () => {
    let ownerCookie: string
    let otherCookie: string
    let planId: string
    let createdGuestId: string

    beforeAll(async () => {
      const ownerRes = await request(app).post('/api/auth/guest')
      ownerCookie = ownerRes.headers['set-cookie'][0]

      const planRes = await request(app)
        .post('/api/plans')
        .set('Cookie', ownerCookie)
        .send({
          type: 'wedding',
          title: 'Kabir & Rhea Royal Rajputana',
          date: '2027-11-20',
          guests: 150,
          budget: 5000000,
          currency: 'INR',
          city: 'Udaipur',
          vibe: 'Royal, Regal, Intimate',
        })
      planId = planRes.body.plan.id

      const otherRes = await request(app).post('/api/auth/guest')
      otherCookie = otherRes.headers['set-cookie'][0]
    })

    it('requires authentication for guest endpoints (401)', async () => {
      const getRes = await request(app).get(`/api/plans/${planId}/guests`)
      expect(getRes.status).toBe(401)

      const postRes = await request(app)
        .post(`/api/plans/${planId}/guests`)
        .send({ name: 'Ananya Sharma' })
      expect(postRes.status).toBe(401)

      const summaryRes = await request(app).get(`/api/plans/${planId}/guests/summary`)
      expect(summaryRes.status).toBe(401)
    })

    it('enforces ownership checks (404 for other user)', async () => {
      const getRes = await request(app)
        .get(`/api/plans/${planId}/guests`)
        .set('Cookie', otherCookie)
      expect(getRes.status).toBe(404)

      const postRes = await request(app)
        .post(`/api/plans/${planId}/guests`)
        .set('Cookie', otherCookie)
        .send({ name: 'Hacker Guest' })
      expect(postRes.status).toBe(404)

      const importRes = await request(app)
        .post(`/api/plans/${planId}/guests/import`)
        .set('Cookie', otherCookie)
        .send({ text: 'Guest One\nGuest Two' })
      expect(importRes.status).toBe(404)
    })

    it('validates guest input (400 for invalid party size or empty name)', async () => {
      const resEmpty = await request(app)
        .post(`/api/plans/${planId}/guests`)
        .set('Cookie', ownerCookie)
        .send({ name: '   ', party: 2 })
      expect(resEmpty.status).toBe(400)

      const resParty = await request(app)
        .post(`/api/plans/${planId}/guests`)
        .set('Cookie', ownerCookie)
        .send({ name: 'Valid Name', party: 15 })
      expect(resParty.status).toBe(400)

      const resDietary = await request(app)
        .post(`/api/plans/${planId}/guests`)
        .set('Cookie', ownerCookie)
        .send({ name: 'Valid Name', dietary: 'unknown-diet' })
      expect(resDietary.status).toBe(400)
    })

    it('adds a new guest via POST /api/plans/:id/guests', async () => {
      const res = await request(app)
        .post(`/api/plans/${planId}/guests`)
        .set('Cookie', ownerCookie)
        .send({
          name: 'Vikram & Sunita Malhotra',
          party: 2,
          status: 'pending',
          dietary: 'veg',
          notes: 'VIP Family Table',
        })

      expect(res.status).toBe(201)
      expect(res.body.guest).toBeDefined()
      expect(res.body.guest.name).toBe('Vikram & Sunita Malhotra')
      expect(res.body.guest.party).toBe(2)
      expect(res.body.guest.status).toBe('pending')
      expect(res.body.guest.dietary).toBe('veg')
      expect(res.body.guest.notes).toBe('VIP Family Table')

      createdGuestId = res.body.guest.id
    })

    it('lists guests via GET /api/plans/:id/guests', async () => {
      const res = await request(app)
        .get(`/api/plans/${planId}/guests`)
        .set('Cookie', ownerCookie)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.guests)).toBe(true)
      expect(res.body.guests.length).toBeGreaterThanOrEqual(1)
      expect(res.body.guests.some((g: any) => g.id === createdGuestId)).toBe(true)
    })

    it('updates guest details via PATCH /api/plans/:id/guests/:guestId', async () => {
      const res = await request(app)
        .patch(`/api/plans/${planId}/guests/${createdGuestId}`)
        .set('Cookie', ownerCookie)
        .send({
          party: 3,
          status: 'attending',
          dietary: 'jain',
          notes: 'Updated Table 1',
        })

      expect(res.status).toBe(200)
      expect(res.body.guest.party).toBe(3)
      expect(res.body.guest.status).toBe('attending')
      expect(res.body.guest.dietary).toBe('jain')
      expect(res.body.guest.notes).toBe('Updated Table 1')
    })

    it('imports guests via bulk paste POST /api/plans/:id/guests/import', async () => {
      const pasteList = `
        Aarav Mehta
        Rohan & Neha Joshi
        Devendra Rajput
      `
      const res = await request(app)
        .post(`/api/plans/${planId}/guests/import`)
        .set('Cookie', ownerCookie)
        .send({ text: pasteList })

      expect(res.status).toBe(201)
      expect(res.body.count).toBe(3)
      expect(res.body.guests).toHaveLength(3)
      expect(res.body.guests.map((g: any) => g.name)).toContain('Aarav Mehta')
    })

    it('rejects bulk paste when exceeding 500 lines (400)', async () => {
      const longList = Array.from({ length: 502 }, (_, i) => `Guest #${i + 1}`).join('\n')
      const res = await request(app)
        .post(`/api/plans/${planId}/guests/import`)
        .set('Cookie', ownerCookie)
        .send({ text: longList })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('500')
    })

    it('calculates summary, headcount and cost-per-head via GET /api/plans/:id/guests/summary', async () => {
      const res = await request(app)
        .get(`/api/plans/${planId}/guests/summary`)
        .set('Cookie', ownerCookie)

      expect(res.status).toBe(200)
      expect(res.body.summary).toBeDefined()
      const s = res.body.summary

      expect(s.totalGuests).toBe(4) // 1 created + 3 imported
      expect(s.confirmedHeadcount).toBe(3) // createdGuest is attending with party 3, imported guests are pending
      expect(s.countsByStatus.attending).toBe(1)
      expect(s.countsByStatus.pending).toBe(3)
      expect(s.countsByDietary.jain).toBe(1)

      // Catering allocation should be positive from generated budget
      expect(s.cateringAllocation).toBeGreaterThan(0)
      expect(s.costPerHead).toBe(Math.round(s.cateringAllocation / 3))
    })

    it('deletes a guest via DELETE /api/plans/:id/guests/:guestId', async () => {
      const delRes = await request(app)
        .delete(`/api/plans/${planId}/guests/${createdGuestId}`)
        .set('Cookie', ownerCookie)

      expect(delRes.status).toBe(200)

      const listRes = await request(app)
        .get(`/api/plans/${planId}/guests`)
        .set('Cookie', ownerCookie)

      expect(listRes.body.guests.some((g: any) => g.id === createdGuestId)).toBe(false)
    })
  })

  describe('8. Feature 4: Overspend Alerts & AI Budget Rebalancer Endpoints', () => {
    let ownerCookie: string
    let otherCookie: string
    let planId: string
    let budgetTotal: number
    let overspentItemId: string
    let contingencyItemId: string

    beforeAll(async () => {
      const ownerRes = await request(app).post('/api/auth/guest')
      ownerCookie = ownerRes.headers['set-cookie'][0]

      budgetTotal = 2000000
      const planRes = await request(app)
        .post('/api/plans')
        .set('Cookie', ownerCookie)
        .send({
          type: 'wedding',
          title: 'Diya & Neil Heritage Palace Soirée',
          date: '2027-12-10',
          guests: 100,
          budget: budgetTotal,
          currency: 'INR',
          city: 'Jaipur',
          vibe: 'Heritage, Floral, Pastel',
        })

      const plan = planRes.body.plan
      planId = plan.id

      // Find an item to artificially overspend and find contingency
      const decorItem = plan.budget.find((b: any) => !b.category.toLowerCase().includes('contingency'))
      const contItem = plan.budget.find((b: any) => b.category.toLowerCase().includes('contingency'))

      overspentItemId = decorItem.id
      contingencyItemId = contItem.id

      // Set decorItem spent to be higher than its allocated amount (overspend by 100,000)
      await request(app)
        .patch(`/api/plans/${planId}/budget/${overspentItemId}`)
        .set('Cookie', ownerCookie)
        .send({ spent: decorItem.allocated + 100000 })

      const otherRes = await request(app).post('/api/auth/guest')
      otherCookie = otherRes.headers['set-cookie'][0]
    })

    it('requires authentication for budget rebalance (401)', async () => {
      const res = await request(app).post(`/api/plans/${planId}/budget/rebalance`)
      expect(res.status).toBe(401)
    })

    it('enforces ownership checks (404 for other user)', async () => {
      const res = await request(app)
        .post(`/api/plans/${planId}/budget/rebalance`)
        .set('Cookie', otherCookie)
      expect(res.status).toBe(404)
    })

    it('returns a proposal without writing to the database', async () => {
      const planBefore = await request(app)
        .get(`/api/plans/${planId}`)
        .set('Cookie', ownerCookie)

      const res = await request(app)
        .post(`/api/plans/${planId}/budget/rebalance`)
        .set('Cookie', ownerCookie)

      expect(res.status).toBe(200)
      expect(res.body.proposal).toBeDefined()
      expect(Array.isArray(res.body.proposal.changes)).toBe(true)

      // Verify NO write occurred on GET
      const planAfter = await request(app)
        .get(`/api/plans/${planId}`)
        .set('Cookie', ownerCookie)

      expect(planAfter.body.plan.budget).toEqual(planBefore.body.plan.budget)
    })

    it('satisfies all rebalancing rules: total equals budget, to >= spent, contingency untouched', async () => {
      const res = await request(app)
        .post(`/api/plans/${planId}/budget/rebalance`)
        .set('Cookie', ownerCookie)

      expect(res.status).toBe(200)
      const proposal = res.body.proposal
      const changes = proposal.changes

      // Rule 1: The total of all proposed 'to' amounts must equal the plan budget
      const sumProposed = changes.reduce((s: number, c: any) => s + c.to, 0)
      expect(sumProposed).toBe(budgetTotal)

      // Rule 2: No category goes below what has already been spent
      for (const change of changes) {
        expect(change.to).toBeGreaterThanOrEqual(0)
        expect(change.reason).toBeTruthy()
      }

      // Check the specifically overspent category
      const overspentChange = changes.find((c: any) => c.itemId === overspentItemId)
      expect(overspentChange).toBeDefined()
      expect(overspentChange.to).toBeGreaterThanOrEqual(overspentChange.from + 100000)

      // Rule 3: The contingency row stays strictly untouched
      const contChange = changes.find((c: any) => c.itemId === contingencyItemId)
      expect(contChange).toBeDefined()
      expect(contChange.to).toBe(contChange.from)
      expect(contChange.reason).toContain('untouched')
    })

    it('applies the proposed changes atomically via POST /api/plans/:id/budget/apply', async () => {
      const rebRes = await request(app)
        .post(`/api/plans/${planId}/budget/rebalance`)
        .set('Cookie', ownerCookie)

      const proposal = rebRes.body.proposal
      const payload = {
        changes: proposal.changes.map((c: any) => ({ itemId: c.itemId, to: c.to })),
      }

      const applyRes = await request(app)
        .post(`/api/plans/${planId}/budget/apply`)
        .set('Cookie', ownerCookie)
        .send(payload)

      expect(applyRes.status).toBe(200)
      expect(Array.isArray(applyRes.body.budget)).toBe(true)

      // Verify the updated plan reflects new allocations
      const updatedPlan = await request(app)
        .get(`/api/plans/${planId}`)
        .set('Cookie', ownerCookie)

      const newSumAllocated = updatedPlan.body.plan.budget.reduce((s: number, b: any) => s + b.allocated, 0)
      expect(newSumAllocated).toBe(budgetTotal)

      const updatedOverspent = updatedPlan.body.plan.budget.find((b: any) => b.id === overspentItemId)
      expect(updatedOverspent.allocated).toBeGreaterThanOrEqual(updatedOverspent.spent)
    })
  })

  describe('9. Server Performance & Efficiency Controls (A.4)', () => {
    let authCookie: string
    let planId: string

    beforeAll(async () => {
      const res = await request(app).post('/api/auth/guest')
      authCookie = res.headers['set-cookie'][0]

      const planRes = await request(app)
        .post('/api/plans')
        .set('Cookie', authCookie)
        .send({
          type: 'birthday',
          title: 'Performance Benchmark Soiree',
          date: '2027-08-15',
          guests: 50,
          budget: 200000,
          currency: 'INR',
          city: 'Mumbai',
        })
      planId = planRes.body.plan.id
    })

    it('sets Cache-Control: no-store and ETag on /api routes', async () => {
      const res = await request(app).get('/api/health')
      expect(res.headers['cache-control']).toContain('no-store')
      expect(res.headers['etag']).toBeDefined()
    })

    it('paginates GET /api/plans with limit, offset and total', async () => {
      const res = await request(app)
        .get('/api/plans?limit=1&offset=0')
        .set('Cookie', authCookie)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.plans)).toBe(true)
      expect(res.body.limit).toBe(1)
      expect(res.body.offset).toBe(0)
      expect(typeof res.body.total).toBe('number')
      expect(res.body.plans.length).toBeLessThanOrEqual(1)
    })

    it('paginates GET /api/plans/:id/vendors and supports limit/offset', async () => {
      const res = await request(app)
        .get(`/api/plans/${planId}/vendors?limit=2&offset=0`)
        .set('Cookie', authCookie)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.vendors)).toBe(true)
      expect(res.body.limit).toBe(2)
      expect(res.body.offset).toBe(0)
      expect(typeof res.body.total).toBe('number')
      expect(res.body.vendors.length).toBeLessThanOrEqual(2)
    })

    it('paginates GET /api/plans/:id/guests and GET /api/plans/:id/chat', async () => {
      const guestRes = await request(app)
        .get(`/api/plans/${planId}/guests?limit=5&offset=0`)
        .set('Cookie', authCookie)

      expect(guestRes.status).toBe(200)
      expect(Array.isArray(guestRes.body.guests)).toBe(true)
      expect(guestRes.body.limit).toBe(5)
      expect(guestRes.body.offset).toBe(0)

      const chatRes = await request(app)
        .get(`/api/plans/${planId}/chat?limit=5&offset=0`)
        .set('Cookie', authCookie)

      expect(chatRes.status).toBe(200)
      expect(Array.isArray(chatRes.body.messages)).toBe(true)
      expect(chatRes.body.limit).toBe(5)
      expect(chatRes.body.offset).toBe(0)
    })
  })

  describe('11. Section B.2 Security & Robustness Verification', () => {
    let authCookie: string
    let testPlanId: string

    beforeAll(async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({ email: 'secb2@soiree.com', password: 'password123' })
      authCookie = reg.headers['set-cookie'][0]

      const planRes = await request(app)
        .post('/api/plans')
        .set('Cookie', authCookie)
        .send({
          type: 'wedding',
          title: 'Royal Palace Celebration',
          date: '2027-04-10',
          guests: 150,
          budget: 5000000,
          currency: 'INR',
          city: 'Jaipur',
        })
      testPlanId = planRes.body.plan.id
    })

    describe('Strict Zod Validation (rejects unexpected keys, invalid params, invalid queries)', () => {
      it('rejects unexpected body keys on brief creation with 400', async () => {
        const res = await request(app)
          .post('/api/plans')
          .set('Cookie', authCookie)
          .send({
            type: 'wedding',
            date: '2027-04-10',
            guests: 100,
            budget: 1000000,
            unexpectedField: 'malicious-data',
          })

        expect(res.status).toBe(400)
        expect(res.body.error).toBe('Validation failed')
      })

      it('rejects unexpected body keys on register and login with 400', async () => {
        const regRes = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'hacker@soiree.com',
            password: 'password123',
            isAdmin: true,
          })
        expect(regRes.status).toBe(400)

        const loginRes = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'hacker@soiree.com',
            password: 'password123',
            role: 'superuser',
          })
        expect(loginRes.status).toBe(400)
      })

      it('rejects invalid pagination queries with 400', async () => {
        const res = await request(app)
          .get('/api/plans?limit=not-a-number')
          .set('Cookie', authCookie)

        expect(res.status).toBe(400)
      })

      it('rejects unexpected query parameters on pagination with 400', async () => {
        const res = await request(app)
          .get('/api/plans?limit=10&injectedQuery=xyz')
          .set('Cookie', authCookie)

        expect(res.status).toBe(400)
      })

      it('rejects malformed public share token formats with 404', async () => {
        const res = await request(app).get('/api/public/plans/bad$token!invalid')
        expect(res.status).toBe(404)
      })
    })

    describe('Request Body Size Limits', () => {
      it('rejects oversized JSON payloads (>256KB) with HTTP 413', async () => {
        // Generate payload slightly larger than 256KB
        const bigString = 'A'.repeat(300 * 1024)
        const res = await request(app)
          .post(`/api/plans/${testPlanId}/chat`)
          .set('Cookie', authCookie)
          .send({ message: bigString })

        expect(res.status).toBe(413)
        expect(res.body.error).toBe('Payload too large')
      })
    })

    describe('RFC 5545 ICS Escaping & Line Folding', () => {
      it('correctly escapes backslashes, semicolons, commas, and newlines', () => {
        const input = 'Notes: Dinner, drinks; bring a jacket \\ coat\nSecond line\r\nThird line'
        const escaped = escapeICSText(input)
        expect(escaped).toBe('Notes: Dinner\\, drinks\\; bring a jacket \\\\ coat\\nSecond line\\nThird line')
      })

      it('folds long ICS lines to maximum 75 octets with space continuation', () => {
        const longLine = 'DESCRIPTION:This is an exceptionally detailed and magnificent description that spans well beyond the standard seventy-five character limit required by the iCalendar RFC specification.'
        const folded = foldICSLine(longLine)
        const lines = folded.split('\r\n')
        expect(lines.length).toBeGreaterThan(1)
        expect(lines[0].length).toBeLessThanOrEqual(75)
        expect(lines[1].startsWith(' ')).toBe(true)
      })
    })

    describe('HTML Sanitisation', () => {
      it('neutralizes malicious HTML script and iframe tags in user input', () => {
        const malicious = '<script>alert("XSS")</script><p>Welcome to our <b>gala</b></p><iframe src="evil.com"></iframe>'
        const sanitized = sanitizeText(malicious)
        expect(sanitized).not.toContain('<script>')
        expect(sanitized).not.toContain('alert')
        expect(sanitized).not.toContain('<iframe>')
        expect(sanitized).toContain('Welcome to our gala')
      })

      it('strips javascript: pseudo-protocols and inline event handlers', () => {
        const evil = '<a href="javascript:stealCookies()" onclick="steal()">Click me</a>'
        const sanitized = sanitizeText(evil)
        expect(sanitized).not.toContain('javascript:')
        expect(sanitized).not.toContain('onclick=')
      })

      it('sanitizes user input saved in plan creation and guest tracker', async () => {
        const planRes = await request(app)
          .post('/api/plans')
          .set('Cookie', authCookie)
          .send({
            type: 'community',
            title: '<script>alert("hack")</script>Neighborhood Feast',
            date: '2027-05-01',
            guests: 40,
            budget: 100000,
            currency: 'INR',
            notes: '<img src="x" onerror="steal()">Bring blankets',
          })

        expect(planRes.status).toBe(201)
        expect(planRes.body.plan.brief.title).toBe('Neighborhood Feast')
        expect(planRes.body.plan.brief.notes).toBe('Bring blankets')

        const guestRes = await request(app)
          .post(`/api/plans/${planRes.body.plan.id}/guests`)
          .set('Cookie', authCookie)
          .send({
            name: '<script>evil()</script>Kavita Rao',
            party: 1,
            notes: '<iframe src="malware"></iframe>VIP Table',
          })

        expect(guestRes.status).toBe(201)
        expect(guestRes.body.guest.name).toBe('Kavita Rao')
        expect(guestRes.body.guest.notes).toBe('VIP Table')
      })
    })
  })
})



