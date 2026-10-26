import { Router } from 'express'
import { idParamSchema } from '@soiree/shared'
import { getAuthUserId } from '../../middleware/auth.js'
import { buildICS } from '../../services/ics.js'
import { plansService } from '../../services/plans.service.js'

export const exportRouter = Router()

/**
 * GET /api/plans/:id/export.ics - Calendar file export
 */
exportRouter.get('/:id/export.ics', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const plan = plansService.getPlan(id, getAuthUserId(req))
    const icsContent = buildICS(plan)

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="soiree-${plan.id}.ics"`)
    return res.send(icsContent)
  } catch (err) {
    next(err)
  }
})
