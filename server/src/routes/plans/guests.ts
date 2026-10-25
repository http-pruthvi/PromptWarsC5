import { Router } from 'express'
import { z } from 'zod'
import type { DietaryOption, Guest, GuestStatus, GuestSummary } from '@soiree/shared'
import { getDb, getStatement } from '../../db/index.js'
import { uid } from '../../services/generator.js'
import { sanitizeText } from '../../utils/sanitize.js'
import { guestParamSchema, idParamSchema, paginationQuerySchema, verifyPlanOwnership } from './common.js'

export const guestsRouter = Router()

const guestCreateSchema = z
  .object({
    name: z.string().trim().min(1, 'String must contain at least 1 character(s)').max(100),
    party: z.number().int().min(1).max(10).default(1),
    status: z.enum(['pending', 'attending', 'declined']).default('pending'),
    dietary: z.enum(['none', 'veg', 'vegan', 'jain', 'halal', 'other']).default('none'),
    notes: z.string().trim().max(500).default(''),
  })
  .strict()

const guestPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    party: z.number().int().min(1).max(10).optional(),
    status: z.enum(['pending', 'attending', 'declined']).optional(),
    dietary: z.enum(['none', 'veg', 'vegan', 'jain', 'halal', 'other']).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict()

const guestImportSchema = z
  .object({
    text: z.string().max(100000),
  })
  .strict()

// GET /api/plans/:id/guests - List all guests with pagination
guestsRouter.get('/:id/guests', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const plan = verifyPlanOwnership(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const { limit, offset } = paginationQuerySchema.parse(req.query)

    const countStmt = getStatement('SELECT COUNT(*) as count FROM guests WHERE plan_id = ?')
    const total = (countStmt.get(plan.id) as { count: number }).count

    const rowsStmt = getStatement(`
      SELECT id, name, party, status, dietary, notes
      FROM guests WHERE plan_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?
    `)
    const rows = rowsStmt.all(plan.id, limit, offset) as Guest[]

    return res.json({ guests: rows, total, limit, offset })
  } catch (err) {
    next(err)
  }
})

// POST /api/plans/:id/guests - Add a guest
guestsRouter.post('/:id/guests', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const plan = verifyPlanOwnership(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const parsed = guestCreateSchema.parse(req.body)
    const name = sanitizeText(parsed.name)
    const notes = sanitizeText(parsed.notes)
    const guestId = uid()
    const db = getDb()

    db.prepare(
      `
      INSERT INTO guests (id, plan_id, name, party, status, dietary, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(guestId, plan.id, name, parsed.party, parsed.status, parsed.dietary, notes)

    const created: Guest = {
      id: guestId,
      name,
      party: parsed.party,
      status: parsed.status,
      dietary: parsed.dietary,
      notes,
    }

    return res.status(201).json({ guest: created })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/plans/:id/guests/:guestId - Update guest
guestsRouter.patch('/:id/guests/:guestId', (req, res, next) => {
  try {
    const { id, guestId } = guestParamSchema.parse(req.params)
    const plan = verifyPlanOwnership(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const parsed = guestPatchSchema.parse(req.body)
    const db = getDb()
    const existing = db
      .prepare(
        `
      SELECT id, name, party, status, dietary, notes FROM guests
      WHERE id = ? AND plan_id = ?
    `,
      )
      .get(guestId, plan.id) as Guest | undefined

    if (!existing) return res.status(404).json({ error: 'Guest not found' })

    const updated: Guest = {
      id: existing.id,
      name: parsed.name !== undefined ? sanitizeText(parsed.name) : existing.name,
      party: parsed.party ?? existing.party,
      status: parsed.status ?? existing.status,
      dietary: parsed.dietary ?? existing.dietary,
      notes: parsed.notes !== undefined ? sanitizeText(parsed.notes) : existing.notes,
    }

    db.prepare(
      `
      UPDATE guests SET name = ?, party = ?, status = ?, dietary = ?, notes = ?
      WHERE id = ? AND plan_id = ?
    `,
    ).run(updated.name, updated.party, updated.status, updated.dietary, updated.notes, updated.id, plan.id)

    return res.json({ guest: updated })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/plans/:id/guests/:guestId - Remove guest
guestsRouter.delete('/:id/guests/:guestId', (req, res, next) => {
  try {
    const { id, guestId } = guestParamSchema.parse(req.params)
    const plan = verifyPlanOwnership(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const db = getDb()
    const result = db
      .prepare(
        `
      DELETE FROM guests WHERE id = ? AND plan_id = ?
    `,
      )
      .run(guestId, plan.id)

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Guest not found' })
    }

    return res.json({ message: 'Guest deleted' })
  } catch (err) {
    next(err)
  }
})

// POST /api/plans/:id/guests/import - Bulk import pasted list (one name per line, max 500)
guestsRouter.post('/:id/guests/import', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const plan = verifyPlanOwnership(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const parsed = guestImportSchema.parse(req.body)
    const lines = parsed.text
      .split(/\r?\n/)
      .map((l) => sanitizeText(l))
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
        const guestId = uid()
        const trimmed = name.slice(0, 100)
        stmt.run(guestId, plan.id, trimmed)
        insertedGuests.push({
          id: guestId,
          name: trimmed,
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
guestsRouter.get('/:id/guests/summary', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const plan = verifyPlanOwnership(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const db = getDb()
    const guests = db
      .prepare(
        `
      SELECT party, status, dietary FROM guests WHERE plan_id = ?
    `,
      )
      .all(plan.id) as Array<{ party: number; status: GuestStatus; dietary: DietaryOption }>

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
        confirmedHeadcount += typeof g.party === 'number' ? g.party : 1
      }
    }

    // Catering allocation from budget_items
    const cateringRow = db
      .prepare(
        `
      SELECT SUM(allocated) AS total FROM budget_items
      WHERE plan_id = ? AND (LOWER(category) LIKE '%cater%' OR LOWER(category) LIKE '%food%')
    `,
      )
      .get(plan.id) as { total: number | null } | undefined

    const cateringAllocation = Number(cateringRow?.total) || 0
    const costPerHead =
      confirmedHeadcount > 0 && cateringAllocation > 0 ? Math.round(cateringAllocation / confirmedHeadcount) : null

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
