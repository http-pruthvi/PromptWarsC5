import { Router } from 'express'
import { milestoneParamSchema, milestoneUpdateSchema } from '@soiree/shared'
import { getAuthUserId } from '../../middleware/auth.js'
import { milestonesService } from '../../services/milestones.service.js'

export const milestonesRouter = Router()

/**
 * PATCH /api/plans/:id/milestones/:milestoneId - Update milestone done state
 */
milestonesRouter.patch('/:id/milestones/:milestoneId', (req, res, next) => {
  try {
    const { id, milestoneId } = milestoneParamSchema.parse(req.params)
    const { done } = milestoneUpdateSchema.parse(req.body)
    const result = milestonesService.updateMilestoneDone(id, getAuthUserId(req), milestoneId, done)
    return res.json(result)
  } catch (err) {
    next(err)
  }
})
