import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'
import { app } from '../src/app.js'
import { initDb, closeDb } from '../src/db/index.js'

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
})


