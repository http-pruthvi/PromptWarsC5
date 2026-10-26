import { Router } from 'express'
import { z } from 'zod'
import { shareService } from '../services/share.service.js'

export const publicRouter = Router()

const publicTokenSchema = z
  .object({
    token: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9_-]+$/, 'Invalid share token format'),
  })
  .strict()

/**
 * GET /api/public/plans/:token - Sanitized public read-only plan view
 */
publicRouter.get('/plans/:token', (req, res, next) => {
  try {
    const parseResult = publicTokenSchema.safeParse(req.params)
    if (!parseResult.success) {
      return res.status(404).json({ error: 'Plan not found' })
    }
    const { token } = parseResult.data
    const plan = shareService.getPublicPlan(token)
    return res.json({ plan })
  } catch (err) {
    next(err)
  }
})
