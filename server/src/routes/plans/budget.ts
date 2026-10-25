import { Router } from 'express'
import { z } from 'zod'
import { getDb } from '../../db/index.js'
import { rebalanceBudget } from '../../services/ai.js'
import { budgetItemParamSchema, idParamSchema, loadFullPlan } from './common.js'

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

// PATCH /api/plans/:id/budget/:itemId - Update budget item
budgetRouter.patch('/:id/budget/:itemId', (req, res, next) => {
  try {
    const { id, itemId } = budgetItemParamSchema.parse(req.params)
    const { allocated, spent } = updateBudgetSchema.parse(req.body)
    const db = getDb()

    const plan = db.prepare('SELECT id FROM plans WHERE id = ? AND user_id = ?').get(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const item = db
      .prepare('SELECT id, category, allocated, spent, note FROM budget_items WHERE id = ? AND plan_id = ?')
      .get(itemId, id) as { id: string; category: string; allocated: number; spent: number; note: string } | undefined
    if (!item) return res.status(404).json({ error: 'Budget item not found' })

    const newAllocated = allocated !== undefined ? allocated : item.allocated
    const newSpent = spent !== undefined ? spent : item.spent

    db.prepare(
      `
      UPDATE budget_items SET allocated = ?, spent = ? WHERE id = ? AND plan_id = ?
    `,
    ).run(newAllocated, newSpent, itemId, id)

    return res.json({
      item: {
        id: item.id,
        category: item.category,
        allocated: newAllocated,
        spent: newSpent,
        note: item.note,
      },
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/plans/:id/budget/rebalance - Returns PROPOSAL only (no database write)
budgetRouter.post('/:id/budget/rebalance', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const plan = loadFullPlan(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const result = await rebalanceBudget(plan.brief, plan.budget)
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

// POST /api/plans/:id/budget/apply - Apply the proposed changes in an atomic transaction
budgetRouter.post('/:id/budget/apply', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const plan = loadFullPlan(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const parsed = applyRebalanceSchema.parse(req.body)
    const db = getDb()

    const applyTransaction = db.transaction(() => {
      const stmt = db.prepare(`
        UPDATE budget_items SET allocated = ? WHERE id = ? AND plan_id = ?
      `)
      for (const change of parsed.changes) {
        stmt.run(change.to, change.itemId, plan.id)
      }
    })

    applyTransaction()

    const updatedPlan = loadFullPlan(plan.id, req.user!.id)
    return res.json({ budget: updatedPlan!.budget })
  } catch (err) {
    next(err)
  }
})
