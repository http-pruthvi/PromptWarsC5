import { Router } from 'express'
import type { PublicPlanView } from '@soiree/shared'
import { getDb } from '../db/index.js'

export const publicRouter = Router()

import { z } from 'zod'

const publicTokenSchema = z.object({
  token: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, 'Invalid share token format'),
}).strict()

// GET /api/public/plans/:token - Sanitized public read-only view
publicRouter.get('/plans/:token', (req, res, next) => {
  try {
    const parseResult = publicTokenSchema.safeParse(req.params)
    if (!parseResult.success) {
      return res.status(404).json({ error: 'Plan not found' })
    }
    const { token } = parseResult.data

    const db = getDb()
    const p = db.prepare(`
      SELECT id, title, event_type, date, city, summary, share_enabled
      FROM plans WHERE share_token = ?
    `).get(token) as any

    // Unknown or revoked token returns the exact same 404
    if (!p || p.share_enabled !== 1) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    const milestoneRows = db.prepare(`
      SELECT id, label, detail, weeks_before AS weeksBefore, done
      FROM milestones WHERE plan_id = ? ORDER BY weeks_before DESC
    `).all(p.id) as Array<{ id: string; label: string; detail: string; weeksBefore: number; done: number }>

    const timeline = milestoneRows.map((m) => ({
      ...m,
      done: Boolean(m.done),
    }))

    // Vendor categories with status ONLY (NO budget, NO estimate, NO tips)
    const vendorRows = db.prepare(`
      SELECT category, status FROM vendors WHERE plan_id = ?
    `).all(p.id) as Array<{ category: string; status: any }>

    const ideaRows = db.prepare(`
      SELECT title, items_json FROM idea_groups WHERE plan_id = ?
    `).all(p.id) as Array<{ title: string; items_json: string }>

    const ideas = ideaRows.map((g) => ({
      title: g.title,
      items: JSON.parse(g.items_json),
    }))

    const mbRow = db.prepare(`
      SELECT json FROM moodboards WHERE plan_id = ?
    `).get(p.id) as any

    const moodboard = mbRow ? JSON.parse(mbRow.json) : null

    const publicPlan: PublicPlanView = {
      title: p.title,
      eventType: p.event_type,
      date: p.date,
      city: p.city,
      summary: p.summary,
      timeline,
      vendors: vendorRows,
      ideas,
      moodboard,
    }

    return res.json({ plan: publicPlan })
  } catch (err) {
    next(err)
  }
})
