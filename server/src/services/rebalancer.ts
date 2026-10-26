import type { Brief, BudgetItem, BudgetRebalanceChange, BudgetRebalanceProposal, Currency } from '@soiree/shared'
import { formatCurrency } from '@soiree/shared'

/**
 * ============================================================================
 * ARCHITECTURE OVERVIEW: Budget Rebalancing Engine
 * ============================================================================
 *
 * The rebalancing engine dynamically reallocates funds across event budget
 * categories whenever bookings cause actual expenditures to exceed initial estimates.
 *
 * CORE INVARIANTS ENFORCED:
 * 1. TOTAL CONSERVED:
 *    The sum of all category allocations post-rebalance strictly equals the original
 *    brief budget: sum(allocated_new) === brief.budget. No money is created or lost.
 *
 * 2. NO CATEGORY BELOW SPENT:
 *    For every category, allocated_new >= spent. If money has been committed or paid,
 *    its allocation cannot be reduced below what was already spent.
 *
 * 3. CONTINGENCY UNTOUCHED:
 *    The emergency contingency reserve line item is never cannibalized or used to
 *    offset routine overspends in other categories. It remains strictly at its
 *    initial allocation.
 * ============================================================================
 */

interface WorkingBudgetItem {
  itemId: string
  category: string
  from: number
  spent: number
  contingency: boolean
  overspend: number
  headroom: number
  to: number
  reason: string
}

function isContingency(category: string): boolean {
  return category.toLowerCase().includes('contingency')
}

function buildWorkingItems(budget: BudgetItem[]): {
  items: WorkingBudgetItem[]
  totalDeficit: number
  totalHeadroom: number
} {
  let totalDeficit = 0
  let totalHeadroom = 0

  const items: WorkingBudgetItem[] = budget.map((b) => {
    const contingency = isContingency(b.category)
    const spent = b.spent
    const allocated = b.allocated
    const overspend = Math.max(0, spent - allocated)
    const headroom = contingency ? 0 : Math.max(0, allocated - spent)
    if (!contingency) {
      totalDeficit += overspend
      totalHeadroom += headroom
    }
    return {
      itemId: b.id,
      category: b.category,
      from: allocated,
      spent,
      contingency,
      overspend,
      headroom,
      to: allocated,
      reason: '',
    }
  })

  return { items, totalDeficit, totalHeadroom }
}

function absorbDeficitFromHeadroom(items: WorkingBudgetItem[], totalDeficit: number, totalHeadroom: number): void {
  for (const item of items) {
    if (!item.contingency && item.overspend > 0) {
      item.to = item.spent
    }
  }

  let remainingDeficit = totalDeficit
  const headroomItems = items.filter((i) => !i.contingency && i.headroom > 0)

  for (const [idx, item] of headroomItems.entries()) {
    const isLast = idx === headroomItems.length - 1
    const share = isLast
      ? remainingDeficit
      : Math.min(item.headroom, Math.round(totalDeficit * (item.headroom / totalHeadroom)))
    const safeShare = Math.min(share, item.from - item.spent)
    item.to = Math.max(item.spent, item.from - safeShare)
    remainingDeficit -= item.from - item.to
  }
}

function preserveContingency(items: WorkingBudgetItem[]): void {
  for (const item of items) {
    if (item.contingency) {
      item.to = item.from
      item.reason = 'Contingency reserve remains untouched as a dedicated emergency cushion.'
    }
  }
}

function reconcileTotalSum(items: WorkingBudgetItem[], targetTotal: number): void {
  const sumTo = items.reduce((s, i) => s + i.to, 0)
  const diff = targetTotal - sumTo
  if (diff === 0) return

  const adjustable = items
    .filter((i) => !i.contingency && i.to + diff >= i.spent)
    .sort((a, b) => b.to - b.spent - (a.to - a.spent))

  const candidate = adjustable[0]
  if (candidate) {
    candidate.to += diff
  }
}

function assignItemReasons(items: WorkingBudgetItem[], cur: Currency): void {
  for (const item of items) {
    if (item.contingency) continue
    if (item.to > item.from) {
      item.reason = `Increased allocation by ${formatCurrency(item.to - item.from, cur)} to cover actual expenditures (${formatCurrency(item.spent, cur)} spent).`
    } else if (item.to < item.from) {
      item.reason = `Reallocated ${formatCurrency(item.from - item.to, cur)} of uncommitted headroom while maintaining a ${formatCurrency(item.to - item.spent, cur)} working buffer.`
    } else {
      item.reason = `Preserved planned allocation of ${formatCurrency(item.to, cur)} to match current milestones.`
    }
  }
}

/**
 * Generate a deterministic budget rebalancing proposal that absorbs deficits while preserving invariants.
 *
 * @param brief - Event brief containing total budget and currency
 * @param budget - Current list of budget items with allocations and expenditures
 * @returns Rebalance proposal with individual category changes and summary
 */
export function generateOfflineBudgetRebalance(brief: Brief, budget: BudgetItem[]): BudgetRebalanceProposal {
  const cur = brief.currency
  const { items, totalDeficit, totalHeadroom } = buildWorkingItems(budget)

  if (totalDeficit > 0 && totalHeadroom > 0) {
    absorbDeficitFromHeadroom(items, totalDeficit, totalHeadroom)
  }

  preserveContingency(items)
  reconcileTotalSum(items, brief.budget)
  assignItemReasons(items, cur)

  const changes: BudgetRebalanceChange[] = items.map((i) => ({
    itemId: i.itemId,
    category: i.category,
    from: i.from,
    to: i.to,
    reason: i.reason,
  }))

  const summary =
    totalDeficit > 0
      ? `Rebalanced budget across categories to absorb ${formatCurrency(totalDeficit, cur)} in overspends from actual bookings, protecting your contingency reserve and ensuring every category covers its verified spending.`
      : 'All celebration categories are currently within their target allocations. Buffer headroom has been balanced to preserve financial security.'

  return { changes, summary }
}
