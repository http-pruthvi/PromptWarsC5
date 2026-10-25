import { Router } from 'express'
import { buildICS } from '../../services/ics.js'
import { idParamSchema, loadFullPlan } from './common.js'

export const exportRouter = Router()

// GET /api/plans/:id/export.ics - Calendar file export
exportRouter.get('/:id/export.ics', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const plan = loadFullPlan(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const icsContent = buildICS(plan)
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="soiree-${plan.id}.ics"`)
    return res.send(icsContent)
  } catch (err) {
    next(err)
  }
})
