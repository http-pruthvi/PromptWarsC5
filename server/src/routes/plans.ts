import crypto from 'crypto'
import { Router } from 'express'
import { z } from 'zod'
import type { Brief, BudgetItem, ChatMessage, DietaryOption, Guest, GuestStatus, GuestSummary, IdeaGroup, Milestone, Plan, PlanSummary, Vendor } from '@soiree/shared'
import { getDb } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { askAssistant, generateIdeas, generateMoodboard, generatePlan, rebalanceBudget } from '../services/ai.js'
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
function loadFullPlan(planId: string, userId: string): Plan | null {
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

const moodboardBodySchema = z.object({
  extra: z.string().max(1000).optional(),
})

// POST /api/plans/:id/moodboard - Generate or regenerate moodboard
plansRouter.post('/:id/moodboard', async (req, res, next) => {
  try {
    const plan = loadFullPlan(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const parsed = moodboardBodySchema.parse(req.body || {})
    const { moodboard, generatedBy } = await generateMoodboard(plan.brief, parsed.extra)

    const db = getDb()
    const rowId = uid()
    db.prepare(`
      INSERT INTO moodboards (id, plan_id, json, generated_by, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(plan_id) DO UPDATE SET
        json = excluded.json,
        generated_by = excluded.generated_by,
        created_at = CURRENT_TIMESTAMP
    `).run(rowId, plan.id, JSON.stringify(moodboard), generatedBy)

    const saved = db.prepare(`SELECT created_at FROM moodboards WHERE plan_id = ?`).get(plan.id) as any

    return res.json({
      moodboard,
      generatedBy,
      createdAt: saved?.created_at || new Date().toISOString(),
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/plans/:id/moodboard - Fetch saved moodboard
plansRouter.get('/:id/moodboard', (req, res, next) => {
  try {
    const plan = loadFullPlan(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const db = getDb()
    const row = db.prepare(`
      SELECT json, generated_by, created_at FROM moodboards WHERE plan_id = ?
    `).get(plan.id) as any

    if (!row) {
      return res.status(404).json({ error: 'Moodboard not found' })
    }

    return res.json({
      moodboard: JSON.parse(row.json),
      generatedBy: row.generated_by,
      createdAt: row.created_at,
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/plans/:id/share - Enable share link and return random 24-char URL-safe token
plansRouter.post('/:id/share', (req, res, next) => {
  try {
    const plan = loadFullPlan(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const db = getDb()
    const existing = db.prepare(`SELECT share_token FROM plans WHERE id = ?`).get(plan.id) as any
    const shareToken = existing?.share_token || crypto.randomBytes(18).toString('base64url')

    db.prepare(`
      UPDATE plans SET share_token = ?, share_enabled = 1 WHERE id = ?
    `).run(shareToken, plan.id)

    return res.json({
      shareToken,
      shareEnabled: true,
    })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/plans/:id/share - Revoke share link
plansRouter.delete('/:id/share', (req, res, next) => {
  try {
    const plan = loadFullPlan(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const db = getDb()
    db.prepare(`
      UPDATE plans SET share_enabled = 0 WHERE id = ?
    `).run(plan.id)

    return res.json({
      message: 'Share link revoked',
      shareEnabled: false,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/plans/:id/share - Get share status
plansRouter.get('/:id/share', (req, res, next) => {
  try {
    const plan = loadFullPlan(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const db = getDb()
    const row = db.prepare(`SELECT share_token, share_enabled FROM plans WHERE id = ?`).get(plan.id) as any

    return res.json({
      shareToken: row?.share_token || null,
      shareEnabled: Boolean(row?.share_enabled),
    })
  } catch (err) {
    next(err)
  }
})

const guestCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  party: z.number().int().min(1).max(10).default(1),
  status: z.enum(['pending', 'attending', 'declined']).default('pending'),
  dietary: z.enum(['none', 'veg', 'vegan', 'jain', 'halal', 'other']).default('none'),
  notes: z.string().max(500).default(''),
})

const guestPatchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  party: z.number().int().min(1).max(10).optional(),
  status: z.enum(['pending', 'attending', 'declined']).optional(),
  dietary: z.enum(['none', 'veg', 'vegan', 'jain', 'halal', 'other']).optional(),
  notes: z.string().max(500).optional(),
})

const guestImportSchema = z.object({
  text: z.string().max(100000),
})

// GET /api/plans/:id/guests - List all guests
plansRouter.get('/:id/guests', (req, res, next) => {
  try {
    const plan = loadFullPlan(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const db = getDb()
    const rows = db.prepare(`
      SELECT id, name, party, status, dietary, notes
      FROM guests WHERE plan_id = ? ORDER BY created_at ASC
    `).all(plan.id) as Guest[]

    return res.json({ guests: rows })
  } catch (err) {
    next(err)
  }
})

// POST /api/plans/:id/guests - Add a guest
plansRouter.post('/:id/guests', (req, res, next) => {
  try {
    const plan = loadFullPlan(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const parsed = guestCreateSchema.parse(req.body)
    const guestId = uid()
    const db = getDb()

    db.prepare(`
      INSERT INTO guests (id, plan_id, name, party, status, dietary, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(guestId, plan.id, parsed.name, parsed.party, parsed.status, parsed.dietary, parsed.notes)

    const created: Guest = {
      id: guestId,
      name: parsed.name,
      party: parsed.party,
      status: parsed.status,
      dietary: parsed.dietary,
      notes: parsed.notes,
    }

    return res.status(201).json({ guest: created })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/plans/:id/guests/:guestId - Update guest
plansRouter.patch('/:id/guests/:guestId', (req, res, next) => {
  try {
    const plan = loadFullPlan(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const parsed = guestPatchSchema.parse(req.body)
    const db = getDb()
    const existing = db.prepare(`
      SELECT id, name, party, status, dietary, notes FROM guests
      WHERE id = ? AND plan_id = ?
    `).get(req.params.guestId, plan.id) as Guest | undefined

    if (!existing) return res.status(404).json({ error: 'Guest not found' })

    const updated: Guest = {
      id: existing.id,
      name: parsed.name ?? existing.name,
      party: parsed.party ?? existing.party,
      status: parsed.status ?? existing.status,
      dietary: parsed.dietary ?? existing.dietary,
      notes: parsed.notes ?? existing.notes,
    }

    db.prepare(`
      UPDATE guests SET name = ?, party = ?, status = ?, dietary = ?, notes = ?
      WHERE id = ? AND plan_id = ?
    `).run(updated.name, updated.party, updated.status, updated.dietary, updated.notes, updated.id, plan.id)

    return res.json({ guest: updated })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/plans/:id/guests/:guestId - Remove guest
plansRouter.delete('/:id/guests/:guestId', (req, res, next) => {
  try {
    const plan = loadFullPlan(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const db = getDb()
    const result = db.prepare(`
      DELETE FROM guests WHERE id = ? AND plan_id = ?
    `).run(req.params.guestId, plan.id)

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Guest not found' })
    }

    return res.json({ message: 'Guest deleted' })
  } catch (err) {
    next(err)
  }
})

// POST /api/plans/:id/guests/import - Bulk import pasted list (one name per line, max 500)
plansRouter.post('/:id/guests/import', (req, res, next) => {
  try {
    const plan = loadFullPlan(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const parsed = guestImportSchema.parse(req.body)
    const lines = parsed.text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length > 500) {
      return res.status(400).json({ error: 'Cannot import more than 500 guests at once' })
    }

    if (lines.length === 0) {
      return res.status(400).json({ error: 'No valid guest names found in pasted text' })
    }

    const db = getDb()
    const insertedGuests: Guest[] = []

    const insertMany = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO guests (id, plan_id, name, party, status, dietary, notes)
        VALUES (?, ?, ?, 1, 'pending', 'none', '')
      `)
      for (const name of lines) {
        const id = uid()
        stmt.run(id, plan.id, name.slice(0, 100))
        insertedGuests.push({
          id,
          name: name.slice(0, 100),
          party: 1,
          status: 'pending',
          dietary: 'none',
          notes: '',
        })
      }
    })

    insertMany()

    return res.status(201).json({ count: insertedGuests.length, guests: insertedGuests })
  } catch (err) {
    next(err)
  }
})

// GET /api/plans/:id/guests/summary - Summary stats, confirmed headcount, and catering cost per head
plansRouter.get('/:id/guests/summary', (req, res, next) => {
  try {
    const plan = loadFullPlan(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const db = getDb()
    const guests = db.prepare(`
      SELECT party, status, dietary FROM guests WHERE plan_id = ?
    `).all(plan.id) as Array<{ party: number; status: GuestStatus; dietary: DietaryOption }>

    const countsByStatus: Record<GuestStatus, number> = {
      pending: 0,
      attending: 0,
      declined: 0,
    }

    const countsByDietary: Record<DietaryOption, number> = {
      none: 0,
      veg: 0,
      vegan: 0,
      jain: 0,
      halal: 0,
      other: 0,
    }

    let confirmedHeadcount = 0

    for (const g of guests) {
      if (countsByStatus[g.status] !== undefined) {
        countsByStatus[g.status] += 1
      }
      if (countsByDietary[g.dietary] !== undefined) {
        countsByDietary[g.dietary] += 1
      }
      if (g.status === 'attending') {
        confirmedHeadcount += (typeof g.party === 'number' ? g.party : 1)
      }
    }

    // Catering allocation from budget_items
    const cateringRow = db.prepare(`
      SELECT SUM(allocated) AS total FROM budget_items
      WHERE plan_id = ? AND (LOWER(category) LIKE '%cater%' OR LOWER(category) LIKE '%food%')
    `).get(plan.id) as any

    const cateringAllocation = Number(cateringRow?.total) || 0
    const costPerHead = confirmedHeadcount > 0 && cateringAllocation > 0
      ? Math.round(cateringAllocation / confirmedHeadcount)
      : null

    const summary: GuestSummary = {
      totalGuests: guests.length,
      confirmedHeadcount,
      countsByStatus,
      countsByDietary,
      cateringAllocation,
      costPerHead,
    }

    return res.json({ summary })
  } catch (err) {
    next(err)
  }
})

// POST /api/plans/:id/budget/rebalance - Returns PROPOSAL only (no database write)
plansRouter.post('/:id/budget/rebalance', async (req, res, next) => {
  try {
    const plan = loadFullPlan(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const result = await rebalanceBudget(plan.brief, plan.budget)
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

const applyRebalanceSchema = z.object({
  changes: z.array(z.object({
    itemId: z.string(),
    to: z.number().nonnegative(),
  })).min(1),
})

// POST /api/plans/:id/budget/apply - Apply the proposed changes in an atomic transaction
plansRouter.post('/:id/budget/apply', (req, res, next) => {
  try {
    const plan = loadFullPlan(req.params.id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const parsed = applyRebalanceSchema.parse(req.body)
    const db = getDb()

    const applyTransaction = db.transaction(() => {
      const stmt = db.prepare(`
        UPDATE budget_items SET allocated = ? WHERE id = ? AND plan_id = ?
      `)
      for (const change of parsed.changes) {
        stmt.run(change.to, change.itemId, plan.id)
      }
    })

    applyTransaction()

    const updatedPlan = loadFullPlan(plan.id, req.user!.id)
    return res.json({ budget: updatedPlan!.budget })
  } catch (err) {
    next(err)
  }
})



