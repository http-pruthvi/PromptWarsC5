import type { BudgetItem, BudgetItemInput } from '@soiree/shared'
import { getDb, getStatement } from '../db/index.js'

/**
 * Repository handling database operations for budget items.
 */
export const budgetRepository = {
  /**
   * Find all budget line items for a plan.
   */
  findByPlanId(planId: string): BudgetItem[] {
    const stmt = getStatement('SELECT id, category, allocated, spent, note FROM budget_items WHERE plan_id = ?')
    return stmt.all(planId) as BudgetItem[]
  },

  /**
   * Find a specific budget line item by its identifier.
   */
  findById(planId: string, itemId: string): BudgetItem | null {
    const stmt = getStatement(
      'SELECT id, category, allocated, spent, note FROM budget_items WHERE id = ? AND plan_id = ?',
    )
    const row = stmt.get(itemId, planId) as BudgetItem | undefined
    return row ?? null
  },

  /**
   * Update an existing budget item allocation, spend, or note.
   */
  updateItem(planId: string, itemId: string, data: BudgetItemInput): boolean {
    const stmt = getStatement(`
      UPDATE budget_items
      SET category = ?, allocated = ?, spent = ?, note = ?
      WHERE id = ? AND plan_id = ?
    `)
    const result = stmt.run(data.category, data.allocated, data.spent ?? 0, data.note ?? '', itemId, planId)
    return result.changes > 0
  },

  /**
   * Atomically apply batch allocation changes across multiple budget categories.
   */
  batchUpdateAllocations(planId: string, changes: Array<{ id: string; allocated: number; note?: string }>): void {
    const db = getDb()
    const stmt = db.prepare(`
      UPDATE budget_items
      SET allocated = ?, note = COALESCE(?, note)
      WHERE id = ? AND plan_id = ?
    `)

    const batchTx = db.transaction(() => {
      for (const ch of changes) {
        stmt.run(ch.allocated, ch.note ?? null, ch.id, planId)
      }
    })
    batchTx()
  },

  /**
   * Replace all budget line items for a plan in an atomic transaction (e.g., reset).
   */
  replaceBudgetItems(planId: string, items: BudgetItem[]): void {
    const db = getDb()
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM budget_items WHERE plan_id = ?').run(planId)
      const insert = db.prepare(`
        INSERT INTO budget_items (id, plan_id, category, allocated, spent, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      for (const item of items) {
        insert.run(item.id, planId, item.category, item.allocated, item.spent, item.note)
      }
    })
    tx()
  },
}
