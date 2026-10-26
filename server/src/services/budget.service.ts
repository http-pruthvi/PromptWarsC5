import type { BudgetItem, BudgetRebalanceProposal } from '@soiree/shared'
import { NotFoundError } from '../errors/index.js'
import { budgetRepository } from '../repositories/budget.repository.js'
import { plansRepository } from '../repositories/plans.repository.js'
import { rebalanceBudget } from './ai.js'

export interface UpdateBudgetPatch {
  allocated?: number | undefined
  spent?: number | undefined
}

/**
 * Service managing budget items and financial rebalancing.
 */
export const budgetService = {
  /**
   * Update an existing budget item allocation or expenditure.
   */
  updateItem(planId: string, userId: string, itemId: string, patch: UpdateBudgetPatch): BudgetItem {
    const plan = plansRepository.verifyOwnership(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    const item = budgetRepository.findById(planId, itemId)
    if (!item) throw new NotFoundError('Budget item not found')

    const updatedAllocated = patch.allocated ?? item.allocated
    const updatedSpent = patch.spent ?? item.spent

    budgetRepository.updateItem(planId, itemId, {
      category: item.category,
      allocated: updatedAllocated,
      spent: updatedSpent,
      note: item.note,
    })

    return {
      id: item.id,
      category: item.category,
      allocated: updatedAllocated,
      spent: updatedSpent,
      note: item.note,
    }
  },

  /**
   * Compute a rebalancing proposal without writing to the database.
   */
  async proposeRebalance(planId: string, userId: string): Promise<{ proposal: BudgetRebalanceProposal; ai: boolean }> {
    const plan = plansRepository.findFullPlan(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    return rebalanceBudget(plan.brief, plan.budget)
  },

  /**
   * Atomically apply proposed rebalancing allocations to the database.
   */
  applyRebalance(planId: string, userId: string, changes: Array<{ itemId: string; to: number }>): BudgetItem[] {
    const plan = plansRepository.verifyOwnership(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    budgetRepository.batchUpdateAllocations(
      planId,
      changes.map((c) => ({ id: c.itemId, allocated: c.to })),
    )

    return budgetRepository.findByPlanId(planId)
  },
}
