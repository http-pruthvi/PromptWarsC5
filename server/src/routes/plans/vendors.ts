import { Router } from 'express'
import { z } from 'zod'
import type { Vendor } from '@soiree/shared'
import { getDb, getStatement } from '../../db/index.js'
import { uid } from '../../services/generator.js'
import { sanitizeText } from '../../utils/sanitize.js'
import { idParamSchema, paginationQuerySchema, vendorParamSchema, verifyPlanOwnership } from './common.js'

export const vendorsRouter = Router()

const addVendorSchema = z
  .object({
    category: z.string().trim().min(1).max(100),
    name: z.string().trim().max(100).optional().default(''),
    status: z.enum(['todo', 'contacted', 'booked']).optional().default('todo'),
    estimate: z.number().min(0).max(1000000000).optional().default(0),
    tips: z.string().trim().max(1000).optional().default(''),
  })
  .strict()

const updateVendorSchema = z
  .object({
    category: z.string().trim().min(1).max(100).optional(),
    name: z.string().trim().max(100).optional(),
    status: z.enum(['todo', 'contacted', 'booked']).optional(),
    estimate: z.number().min(0).max(1000000000).optional(),
    tips: z.string().trim().max(1000).optional(),
  })
  .strict()

// GET /api/plans/:id/vendors - List vendors with pagination
vendorsRouter.get('/:id/vendors', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const plan = verifyPlanOwnership(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const { limit, offset } = paginationQuerySchema.parse(req.query)

    const countStmt = getStatement('SELECT COUNT(*) as count FROM vendors WHERE plan_id = ?')
    const total = (countStmt.get(plan.id) as { count: number }).count

    const rowsStmt = getStatement(`
      SELECT id, category, name, status, estimate, tips FROM vendors WHERE plan_id = ? LIMIT ? OFFSET ?
    `)
    const vendors = rowsStmt.all(plan.id, limit, offset) as Vendor[]

    return res.json({ vendors, total, limit, offset })
  } catch (err) {
    next(err)
  }
})

// POST /api/plans/:id/vendors - Add vendor
vendorsRouter.post('/:id/vendors', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const raw = addVendorSchema.parse(req.body)
    const payload = {
      ...raw,
      category: sanitizeText(raw.category),
      name: sanitizeText(raw.name),
      tips: sanitizeText(raw.tips),
    }

    const db = getDb()
    const plan = db.prepare('SELECT id FROM plans WHERE id = ? AND user_id = ?').get(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const vendorId = uid()
    db.prepare(
      `
      INSERT INTO vendors (id, plan_id, category, name, status, estimate, tips)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(vendorId, id, payload.category, payload.name, payload.status, payload.estimate, payload.tips)

    return res.status(201).json({
      vendor: {
        id: vendorId,
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
vendorsRouter.patch('/:id/vendors/:vendorId', (req, res, next) => {
  try {
    const { id, vendorId } = vendorParamSchema.parse(req.params)
    const payload = updateVendorSchema.parse(req.body)
    const db = getDb()

    const plan = db.prepare('SELECT id FROM plans WHERE id = ? AND user_id = ?').get(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const vendor = db
      .prepare('SELECT id, category, name, status, estimate, tips FROM vendors WHERE id = ? AND plan_id = ?')
      .get(vendorId, id) as Vendor | undefined
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' })

    const updated = {
      category: payload.category !== undefined ? sanitizeText(payload.category) : vendor.category,
      name: payload.name !== undefined ? sanitizeText(payload.name) : vendor.name,
      status: payload.status ?? vendor.status,
      estimate: payload.estimate !== undefined ? payload.estimate : vendor.estimate,
      tips: payload.tips !== undefined ? sanitizeText(payload.tips) : vendor.tips,
    }

    db.prepare(
      `
      UPDATE vendors SET category = ?, name = ?, status = ?, estimate = ?, tips = ?
      WHERE id = ? AND plan_id = ?
    `,
    ).run(updated.category, updated.name, updated.status, updated.estimate, updated.tips, vendorId, id)

    return res.json({ vendor: { id: vendorId, ...updated } })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/plans/:id/vendors/:vendorId - Delete vendor
vendorsRouter.delete('/:id/vendors/:vendorId', (req, res, next) => {
  try {
    const { id, vendorId } = vendorParamSchema.parse(req.params)
    const db = getDb()
    const plan = db.prepare('SELECT id FROM plans WHERE id = ? AND user_id = ?').get(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const result = db.prepare('DELETE FROM vendors WHERE id = ? AND plan_id = ?').run(vendorId, id)
    if (result.changes === 0) return res.status(404).json({ error: 'Vendor not found' })

    return res.json({ message: 'Vendor removed successfully' })
  } catch (err) {
    next(err)
  }
})
