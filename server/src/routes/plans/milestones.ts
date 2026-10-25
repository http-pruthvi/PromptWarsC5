import { Router } from 'express'
import { z } from 'zod'
import { getDb } from '../../db/index.js'
import { milestoneParamSchema } from './common.js'

export const milestonesRouter = Router()

const updateMilestoneSchema = z
  .object({
    done: z.boolean(),
  })
  .strict()

// PATCH /api/plans/:id/milestones/:milestoneId - Update milestone done state
milestonesRouter.patch('/:id/milestones/:milestoneId', (req, res, next) => {
  try {
    const { id, milestoneId } = milestoneParamSchema.parse(req.params)
    const { done } = updateMilestoneSchema.parse(req.body)
    const db = getDb()

    const plan = db.prepare('SELECT id FROM plans WHERE id = ? AND user_id = ?').get(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const result = db
      .prepare(
        `
        UPDATE milestones SET done = ? WHERE id = ? AND plan_id = ?
      `,
      )
      .run(done ? 1 : 0, milestoneId, id)

    if (result.changes === 0) return res.status(404).json({ error: 'Milestone not found' })

    return res.json({ id: milestoneId, done })
  } catch (err) {
    next(err)
  }
})
