import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { app } from '../src/app.js'
import { initDb, closeDb } from '../src/db/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TEST_DB = path.resolve(__dirname, '../data/test-soiree.db')

describe('Soirée Fullstack Backend Test Suite', () => {
  beforeAll(() => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB)
    initDb(TEST_DB)
  })

  afterAll(() => {
    closeDb()
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB)
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
})
