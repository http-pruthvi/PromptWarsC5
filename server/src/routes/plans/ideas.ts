import { Router } from 'express'
import { z } from 'zod'
import { getDb } from '../../db/index.js'
import { generateIdeas } from '../../services/ai.js'
import { uid } from '../../services/generator.js'
import { sanitizeText } from '../../utils/sanitize.js'
import { idParamSchema, loadFullPlan } from './common.js'

export const ideasRouter = Router()

const regenerateIdeasSchema = z
  .object({
    extra: z.string().trim().max(500).optional().default(''),
  })
  .strict()

// POST /api/plans/:id/ideas/regenerate - Regenerate ideas with optional prompt
ideasRouter.post('/:id/ideas/regenerate', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const { extra } = regenerateIdeasSchema.parse(req.body)
    const sanitizedExtra = sanitizeText(extra)

    const plan = loadFullPlan(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const { ideas, ai } = await generateIdeas(plan.brief, sanitizedExtra)
    const db = getDb()

    const updateIdeasTx = db.transaction(() => {
      db.prepare('DELETE FROM idea_groups WHERE plan_id = ?').run(id)
      const insertIdea = db.prepare(`
        INSERT INTO idea_groups (id, plan_id, title, items_json) VALUES (?, ?, ?, ?)
      `)
      for (const g of ideas) {
        insertIdea.run(uid(), id, g.title, JSON.stringify(g.items))
      }
    })
    updateIdeasTx()

    return res.json({ ideas, ai })
  } catch (err) {
    next(err)
  }
})
