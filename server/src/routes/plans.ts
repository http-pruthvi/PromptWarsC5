import { Router } from 'express'
import { z } from 'zod'
import type { Brief, BudgetItem, ChatMessage, IdeaGroup, Milestone, Plan, PlanSummary, Vendor } from '@soiree/shared'
import { getDb } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { askAssistant, generateIdeas, generatePlan } from '../services/ai.js'
import { uid } from '../services/generator.js'
import { buildICS } from '../services/ics.js'

export const plansRouter = Router()
plansRouter.use(requireAuth)

const briefSchema = z.object({
  type: z.enum(['wedding', 'birthday', 'community']),
  title: z.string().optional().default(''),
  date: z.string().min(10),
  guests: z.number().int().positive(),
  budget: z.number().positive(),
  currency: z.enum(['INR', 'USD', 'EUR']).default('INR'),
  city: z.string().optional().default(''),
  vibe: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

// Helper to load a full plan by id with ownership check
export function loadFullPlan(planId: string, userId: string): Plan | null {
  const db = getDb()
  const p = db.prepare(`
    SELECT id, created_at, title, event_type, date, guests, budget, currency, city, vibe, notes, summary, generated_by
    FROM plans WHERE id = ? AND user_id = ?
  `).get(planId, userId) as any

  if (!p) return null

  const brief: Brief = {
    type: p.event_type,
    title: p.title,
    date: p.date,
    guests: p.guests,
    budget: p.budget,
    currency: p.currency,
    city: p.city,
    vibe: p.vibe,
    notes: p.notes,
  }

  const budgetRows = db.prepare(`
    SELECT id, category, allocated, spent, note FROM budget_items WHERE plan_id = ?
  `).all(planId) as BudgetItem[]

  const milestoneRows = db.prepare(`
    SELECT id, label, detail, weeks_before AS weeksBefore, done FROM milestones WHERE plan_id = ? ORDER BY weeks_before DESC
  `).all(planId) as Array<{ id: string; label: string; detail: string; weeksBefore: number; done: number }>

  const timeline: Milestone[] = milestoneRows.map((m) => ({
    ...m,
    done: Boolean(m.done),
  }))

  const vendorRows = db.prepare(`
    SELECT id, category, name, status, estimate, tips FROM vendors WHERE plan_id = ?
  `).all(planId) as Vendor[]

  const ideaRows = db.prepare(`
    SELECT title, items_json FROM idea_groups WHERE plan_id = ?
  `).all(planId) as Array<{ title: string; items_json: string }>

  const ideas: IdeaGroup[] = ideaRows.map((g) => ({
    title: g.title,
    items: JSON.parse(g.items_json),
  }))

  return {
    id: p.id,
    createdAt: p.created_at,
    brief,
    summary: p.summary,
    budget: budgetRows,
    timeline,
    vendors: vendorRows,
    ideas,
    generatedBy: p.generated_by,
  }
}

// GET /api/plans - List user's plans
plansRouter.get('/', (req, res, next) => {
  try {
    const db = getDb()
    const rows = db.prepare(`
      SELECT id, created_at AS createdAt, event_type AS type, title, date, guests, budget, currency, city, summary, generated_by AS generatedBy
      FROM plans WHERE user_id = ? ORDER BY created_at DESC
    `).all(req.user!.id) as PlanSummary[]

    return res.json({ plans: rows })
  } catch (err) {
    next(err)
  }
})

// POST /api/plans - Create a new plan from a brief
plansRouter.post('/', async (req, res, next) => {
  try {
    const brief = briefSchema.parse(req.body)
    const plan = await generatePlan(brief)
    const db = getDb()
    const userId = req.user!.id

    const insertTransaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO plans (
          id, user_id, created_at, title, event_type, date, guests, budget, currency, city, vibe, notes, summary, generated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
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
    const plan = loadFullPlan(req.params.id, req.user!.id)
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
    const db = getDb()
    const result = db.prepare('DELETE FROM plans WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Plan not found' })
    }
    return res.json({ message: 'Plan deleted successfully' })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/plans/:id/budget/:itemId - Update budget item
const updateBudgetSchema = z.object({
  allocated: z.number().min(0).optional(),
  spent: z.number().min(0).optional(),
})

plansRouter.patch('/:id/budget/:itemId', (req, res, next) => {
  try {
    const { allocated, spent } = updateBudgetSchema.parse(req.body)
    const db = getDb()

    // Ensure plan ownership
    const plan = db.prepare('SELECT id FROM plans WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const item = db.prepare('SELECT * FROM budget_items WHERE id = ? AND plan_id = ?').get(req.params.itemId, req.params.id) as any
    if (!item) return res.status(404).json({ error: 'Budget item not found' })

    const newAllocated = allocated !== undefined ? allocated : item.allocated
    const newSpent = spent !== undefined ? spent : item.spent

    db.prepare(`
      UPDATE budget_items SET allocated = ?, spent = ? WHERE id = ? AND plan_id = ?
    `).run(newAllocated, newSpent, req.params.itemId, req.params.id)

    return res.json({
      item: {
        id: item.id,
        category: item.category,
        allocated: newAllocated,
        spent: newSpent,
        note: item.note,
      },
    })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/plans/:id/milestones/:milestoneId - Update milestone done state
const updateMilestoneSchema = z.object({
  done: z.boolean(),
})

plansRouter.patch('/:id/milestones/:milestoneId', (req, res, next) => {
  try {
    const { done } = updateMilestoneSchema.parse(req.body)
    const db = getDb()

    const plan = db.prepare('SELECT id FROM plans WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const result = db.prepare(`
      UPDATE milestones SET done = ? WHERE id = ? AND plan_id = ?
    `).run(done ? 1 : 0, req.params.milestoneId, req.params.id)

    if (result.changes === 0) return res.status(404).json({ error: 'Milestone not found' })

    return res.json({ id: req.params.milestoneId, done })
  } catch (err) {
    next(err)
  }
})

// POST /api/plans/:id/vendors - Add vendor
const addVendorSchema = z.object({
  category: z.string().min(1),
  name: z.string().optional().default(''),
  status: z.enum(['todo', 'contacted', 'booked']).optional().default('todo'),
  estimate: z.number().min(0).optional().default(0),
  tips: z.string().optional().default(''),
})

plansRouter.post('/:id/vendors', (req, res, next) => {
  try {
    const payload = addVendorSchema.parse(req.body)
    const db = getDb()

    const plan = db.prepare('SELECT id FROM plans WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const id = uid()
    db.prepare(`
      INSERT INTO vendors (id, plan_id, category, name, status, estimate, tips)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, payload.category, payload.name, payload.status, payload.estimate, payload.tips)

    return res.status(201).json({
      vendor: {
        id,
        category: payload.category,
        name: payload.name,
        status: payload.status,
        estimate: payload.estimate,
        tips: payload.tips,
      },
    })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/plans/:id/vendors/:vendorId - Update vendor
const updateVendorSchema = z.object({
  category: z.string().optional(),
  name: z.string().optional(),
  status: z.enum(['todo', 'contacted', 'booked']).optional(),
  estimate: z.number().min(0).optional(),
  tips: z.string().optional(),
})

plansRouter.patch('/:id/vendors/:vendorId', (req, res, next) => {
  try {
    const payload = updateVendorSchema.parse(req.body)
    const db = getDb()

    const plan = db.prepare('SELECT id FROM plans WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ? AND plan_id = ?').get(req.params.vendorId, req.params.id) as any
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' })

    const updated = {
      category: payload.category ?? vendor.category,
      name: payload.name ?? vendor.name,
      status: payload.status ?? vendor.status,
      estimate: payload.estimate !== undefined ? payload.estimate : vendor.estimate,
      tips: payload.tips ?? vendor.tips,
    }

    db.prepare(`
      UPDATE vendors SET category = ?, name = ?, status = ?, estimate = ?, tips = ?
      WHERE id = ? AND plan_id = ?
    `).run(updated.category, updated.name, updated.status, updated.estimate, updated.tips, req.params.vendorId, req.params.id)

    return res.json({ vendor: { id: req.params.vendorId, ...updated } })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/plans/:id/vendors/:vendorId - Delete vendor
plansRouter.delete('/:id/vendors/:vendorId', (req, res, next) => {
  try {
    const db = getDb()
    const plan = db.prepare('SELECT id FROM plans WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const result = db.prepare('DELETE FROM vendors WHERE id = ? AND plan_id = ?').run(req.params.vendorId, req.params.id)
    if (result.changes === 0) return res.status(404).json({ error: 'Vendor not found' })

    return res.json({ message: 'Vendor removed successfully' })
  } catch (err) {
    next(err)
  }
})

// POST /api/plans/:id/ideas/regenerate - Regenerate ideas with optional prompt
const regenerateIdeasSchema = z.object({
  extra: z.string().optional().default(''),
})

plansRouter.post('/:id/ideas/regenerate', async (req, res, next) => {
  try {
    const { extra } = regenerateIdeasSchema.parse(req.body)
    const plan = loadFullPlan(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const { ideas, ai } = await generateIdeas(plan.brief, extra)
    const db = getDb()

    const updateIdeasTx = db.transaction(() => {
      db.prepare('DELETE FROM idea_groups WHERE plan_id = ?').run(req.params.id)
      const insertIdea = db.prepare(`
        INSERT INTO idea_groups (id, plan_id, title, items_json) VALUES (?, ?, ?, ?)
      `)
      for (const g of ideas) {
        insertIdea.run(uid(), req.params.id, g.title, JSON.stringify(g.items))
      }
    })
    updateIdeasTx()

    return res.json({ ideas, ai })
  } catch (err) {
    next(err)
  }
})

// GET /api/plans/:id/chat - Get chat history
plansRouter.get('/:id/chat', (req, res, next) => {
  try {
    const db = getDb()
    const plan = db.prepare('SELECT id FROM plans WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const messages = db.prepare(`
      SELECT id, role, text, created_at AS createdAt
      FROM chat_messages WHERE plan_id = ? ORDER BY created_at ASC
    `).all(req.params.id) as ChatMessage[]

    return res.json({ messages })
  } catch (err) {
    next(err)
  }
})

// POST /api/plans/:id/chat - Send chat message and get reply
const chatSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
})

plansRouter.post('/:id/chat', async (req, res, next) => {
  try {
    const { message } = chatSchema.parse(req.body)
    const plan = loadFullPlan(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const db = getDb()
    const history = db.prepare(`
      SELECT role, text FROM chat_messages WHERE plan_id = ? ORDER BY created_at ASC
    `).all(req.params.id) as ChatMessage[]

    const now = Date.now()
    const userMsgId = uid()
    db.prepare(`
      INSERT INTO chat_messages (id, plan_id, role, text, created_at)
      VALUES (?, ?, 'user', ?, ?)
    `).run(userMsgId, req.params.id, message, now)

    const { text: reply, ai } = await askAssistant(plan, history, message)
    const assistantMsgId = uid()
    db.prepare(`
      INSERT INTO chat_messages (id, plan_id, role, text, created_at)
      VALUES (?, ?, 'assistant', ?, ?)
    `).run(assistantMsgId, req.params.id, reply, now + 1)

    return res.json({
      userMessage: { id: userMsgId, role: 'user', text: message, createdAt: now },
      reply: { id: assistantMsgId, role: 'assistant', text: reply, createdAt: now + 1 },
      ai,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/plans/:id/export.ics - Calendar file export
plansRouter.get('/:id/export.ics', (req, res, next) => {
  try {
    const plan = loadFullPlan(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const icsContent = buildICS(plan)
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="soiree-${plan.id}.ics"`)
    return res.send(icsContent)
  } catch (err) {
    next(err)
  }
})
