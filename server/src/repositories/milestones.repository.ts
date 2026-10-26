import type { Milestone } from '@soiree/shared'
import { getStatement } from '../db/index.js'

/**
 * Repository handling database operations for milestone timeline records.
 */
export const milestonesRepository = {
  /**
   * Find all milestones for a plan ordered by weeks before descending.
   */
  findByPlanId(planId: string): Milestone[] {
    const stmt = getStatement(`
      SELECT id, label, detail, weeks_before AS weeksBefore, done
      FROM milestones
      WHERE plan_id = ?
      ORDER BY weeks_before DESC
    `)
    const rows = stmt.all(planId) as Array<{
      id: string
      label: string
      detail: string
      weeksBefore: number
      done: number
    }>
    return rows.map((r) => ({ ...r, done: Boolean(r.done) }))
  },

  /**
   * Update the completion status of a milestone.
   */
  updateDone(planId: string, milestoneId: string, done: boolean): boolean {
    const stmt = getStatement(`
      UPDATE milestones
      SET done = ?
      WHERE id = ? AND plan_id = ?
    `)
    const result = stmt.run(done ? 1 : 0, milestoneId, planId)
    return result.changes > 0
  },
}
