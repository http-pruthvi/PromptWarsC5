import type { Brief, BudgetItem, IdeaGroup, Milestone, Plan, PlanSummary, Vendor } from '@soiree/shared'
import { getDb, getStatement } from '../db/index.js'
import { uid } from '../services/generator.js'

export interface PlanDbRow {
  id: string
  user_id: string
  created_at: number
  title: string
  event_type: 'wedding' | 'birthday' | 'community'
  date: string
  guests: number
  budget: number
  currency: 'INR' | 'USD' | 'EUR'
  city: string
  vibe: string
  notes: string
  summary: string
  generated_by: 'gemini' | 'local'
  share_token?: string | null
  share_enabled?: number
}

/**
 * Repository handling database operations for core plan entities.
 */
export const plansRepository = {
  /**
   * Count total plans owned by a given user.
   */
  countByUserId(userId: string): number {
    const stmt = getStatement('SELECT COUNT(*) as count FROM plans WHERE user_id = ?')
    const row = stmt.get(userId) as { count: number } | undefined
    return row?.count ?? 0
  },

  /**
   * List paginated plan summaries for a given user.
   */
  listByUserId(userId: string, limit: number, offset: number): PlanSummary[] {
    const stmt = getStatement(`
      SELECT id, created_at AS createdAt, event_type AS type, title, date, guests, budget, currency, city, summary, generated_by AS generatedBy
      FROM plans WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
    `)
    return stmt.all(userId, limit, offset) as PlanSummary[]
  },

  /**
   * Verify if a plan exists and belongs to the given user.
   */
  verifyOwnership(planId: string, userId: string): { id: string } | null {
    const stmt = getStatement('SELECT id FROM plans WHERE id = ? AND user_id = ?')
    const row = stmt.get(planId, userId) as { id: string } | undefined
    return row ?? null
  },

  /**
   * Retrieve basic database row for a plan.
   */
  findRowByIdAndUserId(planId: string, userId: string): PlanDbRow | null {
    const stmt = getStatement(`
      SELECT id, user_id, created_at, title, event_type, date, guests, budget, currency, city, vibe, notes, summary, generated_by, share_token, share_enabled
      FROM plans WHERE id = ? AND user_id = ?
    `)
    const row = stmt.get(planId, userId) as PlanDbRow | undefined
    return row ?? null
  },

  /**
   * Retrieve full plan with all related budget items, timeline milestones, vendors, and ideas.
   */
  findFullPlan(planId: string, userId: string): Plan | null {
    const p = this.findRowByIdAndUserId(planId, userId)
    if (!p) return null

    const brief: Brief = {
      type: p.event_type,
      title: p.title,
      date: p.date,
      guests: p.guests,
      budget: p.budget,
      currency: p.currency,
      city: p.city,
      vibe: p.vibe,
      notes: p.notes,
    }

    const budgetStmt = getStatement('SELECT id, category, allocated, spent, note FROM budget_items WHERE plan_id = ?')
    const budget = budgetStmt.all(planId) as BudgetItem[]

    const milestoneStmt = getStatement(
      'SELECT id, label, detail, weeks_before AS weeksBefore, done FROM milestones WHERE plan_id = ? ORDER BY weeks_before DESC',
    )
    const milestoneRows = milestoneStmt.all(planId) as Array<{
      id: string
      label: string
      detail: string
      weeksBefore: number
      done: number
    }>
    const timeline: Milestone[] = milestoneRows.map((m) => ({
      ...m,
      done: Boolean(m.done),
    }))

    const vendorStmt = getStatement('SELECT id, category, name, status, estimate, tips FROM vendors WHERE plan_id = ?')
    const vendors = vendorStmt.all(planId) as Vendor[]

    const ideaStmt = getStatement('SELECT title, items_json FROM idea_groups WHERE plan_id = ?')
    const ideaRows = ideaStmt.all(planId) as Array<{ title: string; items_json: string }>
    const ideas: IdeaGroup[] = ideaRows.map((g) => ({
      title: g.title,
      items: JSON.parse(g.items_json),
    }))

    return {
      id: p.id,
      createdAt: p.created_at,
      brief,
      summary: p.summary,
      budget,
      timeline,
      vendors,
      ideas,
      generatedBy: p.generated_by,
    }
  },

  /**
   * Insert a complete plan and its related items in a single atomic database transaction.
   */
  insertPlan(plan: Plan, userId: string): void {
    const db = getDb()
    const insertTransaction = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO plans (
          id, user_id, created_at, title, event_type, date, guests, budget, currency, city, vibe, notes, summary, generated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        plan.id,
        userId,
        plan.createdAt,
        plan.brief.title,
        plan.brief.type,
        plan.brief.date,
        plan.brief.guests,
        plan.brief.budget,
        plan.brief.currency,
        plan.brief.city,
        plan.brief.vibe,
        plan.brief.notes,
        plan.summary,
        plan.generatedBy,
      )

      const insertBudget = db.prepare(`
        INSERT INTO budget_items (id, plan_id, category, allocated, spent, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      for (const item of plan.budget) {
        insertBudget.run(item.id, plan.id, item.category, item.allocated, item.spent, item.note)
      }

      const insertMilestone = db.prepare(`
        INSERT INTO milestones (id, plan_id, label, detail, weeks_before, done)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      for (const m of plan.timeline) {
        insertMilestone.run(m.id, plan.id, m.label, m.detail, m.weeksBefore, m.done ? 1 : 0)
      }

      const insertVendor = db.prepare(`
        INSERT INTO vendors (id, plan_id, category, name, status, estimate, tips)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      for (const v of plan.vendors) {
        insertVendor.run(v.id, plan.id, v.category, v.name, v.status, v.estimate, v.tips)
      }

      const insertIdea = db.prepare(`
        INSERT INTO idea_groups (id, plan_id, title, items_json)
        VALUES (?, ?, ?, ?)
      `)
      for (const g of plan.ideas) {
        insertIdea.run(uid(), plan.id, g.title, JSON.stringify(g.items))
      }
    })

    insertTransaction()
  },

  /**
   * Replace idea groups for a plan.
   */
  replaceIdeas(planId: string, ideas: IdeaGroup[]): void {
    const db = getDb()
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM idea_groups WHERE plan_id = ?').run(planId)
      const insertIdea = db.prepare(`
        INSERT INTO idea_groups (id, plan_id, title, items_json) VALUES (?, ?, ?, ?)
      `)
      for (const g of ideas) {
        insertIdea.run(uid(), planId, g.title, JSON.stringify(g.items))
      }
    })
    tx()
  },

  /**
   * Delete a plan by its identifier and owner id.
   */
  deleteByIdAndUserId(planId: string, userId: string): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM plans WHERE id = ? AND user_id = ?').run(planId, userId)
    return result.changes > 0
  },
}
