import { Router } from 'express'
import { z } from 'zod'
import { idParamSchema } from '@soiree/shared'
import { getAuthUserId } from '../../middleware/auth.js'
import { moodboardService } from '../../services/moodboard.service.js'

export const moodboardRouter = Router()

const moodboardBodySchema = z
  .object({
    extra: z.string().trim().max(500).optional(),
  })
  .strict()

/**
 * POST /api/plans/:id/moodboard - Generate or regenerate moodboard
 */
moodboardRouter.post('/:id/moodboard', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const { extra } = moodboardBodySchema.parse(req.body ?? {})
    const result = await moodboardService.createOrRegenerate(id, getAuthUserId(req), extra)
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/plans/:id/moodboard - Fetch saved moodboard
 */
moodboardRouter.get('/:id/moodboard', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const result = moodboardService.getMoodboard(id, getAuthUserId(req))
    return res.json(result)
  } catch (err) {
    next(err)
  }
})
