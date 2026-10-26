import { Router } from 'express'
import { z } from 'zod'
import { budgetItemParamSchema, idParamSchema } from '@soiree/shared'
import { getAuthUserId } from '../../middleware/auth.js'
import { budgetService } from '../../services/budget.service.js'

export const budgetRouter = Router()

const updateBudgetSchema = z
  .object({
    allocated: z.number().min(0).max(1000000000).optional(),
    spent: z.number().min(0).max(1000000000).optional(),
  })
  .strict()

const applyRebalanceSchema = z
  .object({
    changes: z
      .array(
        z
          .object({
            itemId: z.string().trim().min(1).max(64),
            to: z.number().nonnegative().max(1000000000),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict()

/**
 * PATCH /api/plans/:id/budget/:itemId - Update budget item allocation or spent
 */
budgetRouter.patch('/:id/budget/:itemId', (req, res, next) => {
  try {
    const { id, itemId } = budgetItemParamSchema.parse(req.params)
    const patch = updateBudgetSchema.parse(req.body)
    const item = budgetService.updateItem(id, getAuthUserId(req), itemId, patch)
    return res.json({ item })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/plans/:id/budget/rebalance - Returns PROPOSAL only (no database write)
 */
budgetRouter.post('/:id/budget/rebalance', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const result = await budgetService.proposeRebalance(id, getAuthUserId(req))
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/plans/:id/budget/apply - Apply proposed changes atomically
 */
budgetRouter.post('/:id/budget/apply', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const { changes } = applyRebalanceSchema.parse(req.body)
    const budget = budgetService.applyRebalance(id, getAuthUserId(req), changes)
    return res.json({ budget })
  } catch (err) {
    next(err)
  }
})
