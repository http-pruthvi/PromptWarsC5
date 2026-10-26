import { Router } from 'express'
import { z } from 'zod'
import { idParamSchema } from '@soiree/shared'
import { getAuthUserId } from '../../middleware/auth.js'
import { plansService } from '../../services/plans.service.js'

export const ideasRouter = Router()

const regenerateIdeasSchema = z
  .object({
    extra: z.string().trim().max(500).optional().default(''),
  })
  .strict()

/**
 * POST /api/plans/:id/ideas/regenerate - Regenerate ideas with optional prompt
 */
ideasRouter.post('/:id/ideas/regenerate', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const { extra } = regenerateIdeasSchema.parse(req.body)
    const result = await plansService.regenerateIdeas(id, getAuthUserId(req), extra)
    return res.json(result)
  } catch (err) {
    next(err)
  }
})
