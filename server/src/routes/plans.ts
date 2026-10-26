import { Router } from 'express'
import { briefSchema, idParamSchema, paginationQuerySchema } from '@soiree/shared'
import { getAuthUserId, requireAuth } from '../middleware/auth.js'
import { plansService } from '../services/plans.service.js'
import { budgetRouter } from './plans/budget.js'
import { chatRouter } from './plans/chat.js'
import { exportRouter } from './plans/export.js'
import { guestsRouter } from './plans/guests.js'
import { ideasRouter } from './plans/ideas.js'
import { milestonesRouter } from './plans/milestones.js'
import { moodboardRouter } from './plans/moodboard.js'
import { shareRouter } from './plans/share.js'
import { vendorsRouter } from './plans/vendors.js'

export const plansRouter = Router()
plansRouter.use(requireAuth)

/**
 * GET /api/plans - List user's plans with pagination
 */
plansRouter.get('/', (req, res, next) => {
  try {
    const { limit, offset } = paginationQuerySchema.parse(req.query)
    const result = plansService.listPlans(getAuthUserId(req), limit, offset)
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/plans - Create a new plan from a brief
 */
plansRouter.post('/', async (req, res, next) => {
  try {
    const rawBrief = briefSchema.parse(req.body)
    const plan = await plansService.createPlan(getAuthUserId(req), rawBrief)
    return res.status(201).json({ plan })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/plans/:id - Retrieve full plan
 */
plansRouter.get('/:id', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const plan = plansService.getPlan(id, getAuthUserId(req))
    return res.json({ plan })
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/plans/:id - Delete plan
 */
plansRouter.delete('/:id', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    plansService.deletePlan(id, getAuthUserId(req))
    return res.json({ message: 'Plan deleted successfully' })
  } catch (err) {
    next(err)
  }
})

// Mount specialized sub-routers
plansRouter.use('/', budgetRouter)
plansRouter.use('/', milestonesRouter)
plansRouter.use('/', vendorsRouter)
plansRouter.use('/', guestsRouter)
plansRouter.use('/', chatRouter)
plansRouter.use('/', ideasRouter)
plansRouter.use('/', moodboardRouter)
plansRouter.use('/', shareRouter)
plansRouter.use('/', exportRouter)
