import { Router } from 'express'
import { z } from 'zod'
import type { Brief, PlanSummary } from '@soiree/shared'
import { getDb, getStatement } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { generatePlan } from '../services/ai.js'
import { uid } from '../services/generator.js'
import { sanitizeText } from '../utils/sanitize.js'
import { budgetRouter } from './plans/budget.js'
import { chatRouter } from './plans/chat.js'
import { idParamSchema, loadFullPlan, paginationQuerySchema } from './plans/common.js'
import { exportRouter } from './plans/export.js'
import { guestsRouter } from './plans/guests.js'
import { ideasRouter } from './plans/ideas.js'
import { milestonesRouter } from './plans/milestones.js'
import { moodboardRouter } from './plans/moodboard.js'
import { shareRouter } from './plans/share.js'
import { vendorsRouter } from './plans/vendors.js'

export const plansRouter = Router()
plansRouter.use(requireAuth)

// Strict Brief Schema
const briefSchema = z
  .object({
    type: z.enum(['wedding', 'birthday', 'community']),
    title: z.string().trim().max(200).optional().default(''),
    date: z.string().trim().min(10).max(20),
    guests: z.number().int().positive().max(100000),
    budget: z.number().positive().max(1000000000),
    currency: z.enum(['INR', 'USD', 'EUR']).default('INR'),
    city: z.string().trim().max(100).optional().default(''),
    vibe: z.string().trim().max(200).optional().default(''),
    notes: z.string().trim().max(2000).optional().default(''),
  })
  .strict()

// GET /api/plans - List user's plans with pagination
plansRouter.get('/', (req, res, next) => {
  try {
    const { limit, offset } = paginationQuerySchema.parse(req.query)

    const countStmt = getStatement('SELECT COUNT(*) as count FROM plans WHERE user_id = ?')
    const total = (countStmt.get(req.user!.id) as { count: number }).count

    const rowsStmt = getStatement(`
      SELECT id, created_at AS createdAt, event_type AS type, title, date, guests, budget, currency, city, summary, generated_by AS generatedBy
      FROM plans WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
    `)
    const rows = rowsStmt.all(req.user!.id, limit, offset) as PlanSummary[]

    return res.json({ plans: rows, total, limit, offset })
  } catch (err) {
    next(err)
  }
})

// POST /api/plans - Create a new plan from a brief
plansRouter.post('/', async (req, res, next) => {
  try {
    const rawBrief = briefSchema.parse(req.body)
    const sanitizedBrief: Brief = {
      ...rawBrief,
      title: sanitizeText(rawBrief.title),
      city: sanitizeText(rawBrief.city),
      vibe: sanitizeText(rawBrief.vibe),
      notes: sanitizeText(rawBrief.notes),
    }

    const plan = await generatePlan(sanitizedBrief)
    const db = getDb()
    const userId = req.user!.id

    const insertTransaction = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO plans (
          id, user_id, created_at, title, event_type, date, guests, budget, currency, city, vibe, notes, summary, generated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        plan.id,
        userId,
        plan.createdAt,
        plan.brief.title,
        plan.brief.type,
        plan.brief.date,
        plan.brief.guests,
        plan.brief.budget,
        plan.brief.currency,
        plan.brief.city,
        plan.brief.vibe,
        plan.brief.notes,
        plan.summary,
        plan.generatedBy,
      )

      const insertBudget = db.prepare(`
        INSERT INTO budget_items (id, plan_id, category, allocated, spent, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      for (const item of plan.budget) {
        insertBudget.run(item.id, plan.id, item.category, item.allocated, item.spent, item.note)
      }

      const insertMilestone = db.prepare(`
        INSERT INTO milestones (id, plan_id, label, detail, weeks_before, done)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      for (const m of plan.timeline) {
        insertMilestone.run(m.id, plan.id, m.label, m.detail, m.weeksBefore, m.done ? 1 : 0)
      }

      const insertVendor = db.prepare(`
        INSERT INTO vendors (id, plan_id, category, name, status, estimate, tips)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      for (const v of plan.vendors) {
        insertVendor.run(v.id, plan.id, v.category, v.name, v.status, v.estimate, v.tips)
      }

      const insertIdea = db.prepare(`
        INSERT INTO idea_groups (id, plan_id, title, items_json)
        VALUES (?, ?, ?, ?)
      `)
      for (const g of plan.ideas) {
        insertIdea.run(uid(), plan.id, g.title, JSON.stringify(g.items))
      }
    })

    insertTransaction()

    return res.status(201).json({ plan })
  } catch (err) {
    next(err)
  }
})

// GET /api/plans/:id - Retrieve full plan
plansRouter.get('/:id', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const plan = loadFullPlan(id, req.user!.id)
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' })
    }
    return res.json({ plan })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/plans/:id - Delete plan
plansRouter.delete('/:id', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const db = getDb()
    const result = db.prepare('DELETE FROM plans WHERE id = ? AND user_id = ?').run(id, req.user!.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Plan not found' })
    }
    return res.json({ message: 'Plan deleted successfully' })
  } catch (err) {
    next(err)
  }
})

// Mount specialized sub-routers
plansRouter.use('/', budgetRouter)
plansRouter.use('/', milestonesRouter)
plansRouter.use('/', vendorsRouter)
plansRouter.use('/', guestsRouter)
plansRouter.use('/', chatRouter)
plansRouter.use('/', ideasRouter)
plansRouter.use('/', moodboardRouter)
plansRouter.use('/', shareRouter)
plansRouter.use('/', exportRouter)
