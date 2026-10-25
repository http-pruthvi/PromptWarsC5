import { Router } from 'express'
import { z } from 'zod'
import { getDb } from '../../db/index.js'
import { generateMoodboard } from '../../services/ai.js'
import { uid } from '../../services/generator.js'
import { sanitizeText } from '../../utils/sanitize.js'
import { idParamSchema, loadFullPlan, verifyPlanOwnership } from './common.js'

export const moodboardRouter = Router()

const moodboardBodySchema = z
  .object({
    extra: z.string().trim().max(500).optional(),
  })
  .strict()

// POST /api/plans/:id/moodboard - Generate or regenerate moodboard
moodboardRouter.post('/:id/moodboard', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const plan = loadFullPlan(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const parsed = moodboardBodySchema.parse(req.body || {})
    const sanitizedExtra = parsed.extra ? sanitizeText(parsed.extra) : undefined
    const { moodboard, generatedBy } = await generateMoodboard(plan.brief, sanitizedExtra)

    const db = getDb()
    const rowId = uid()
    db.prepare(
      `
      INSERT INTO moodboards (id, plan_id, json, generated_by, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(plan_id) DO UPDATE SET
        json = excluded.json,
        generated_by = excluded.generated_by,
        created_at = CURRENT_TIMESTAMP
    `,
    ).run(rowId, plan.id, JSON.stringify(moodboard), generatedBy)

    const saved = db.prepare(`SELECT created_at FROM moodboards WHERE plan_id = ?`).get(plan.id) as
      { created_at?: string } | undefined

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
moodboardRouter.get('/:id/moodboard', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const plan = verifyPlanOwnership(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const db = getDb()
    const row = db
      .prepare(
        `
      SELECT json, generated_by, created_at FROM moodboards WHERE plan_id = ?
    `,
      )
      .get(plan.id) as { json: string; generated_by: string; created_at: string } | undefined

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
