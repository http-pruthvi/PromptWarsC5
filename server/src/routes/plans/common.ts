import { z } from 'zod'
import type { Brief, BudgetItem, IdeaGroup, Milestone, Plan, Vendor } from '@soiree/shared'
import { getStatement } from '../../db/index.js'

// Strict Param Schemas
export const idParamSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
  })
  .strict()

export const budgetItemParamSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    itemId: z.string().trim().min(1).max(64),
  })
  .strict()

export const milestoneParamSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    milestoneId: z.string().trim().min(1).max(64),
  })
  .strict()

export const vendorParamSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    vendorId: z.string().trim().min(1).max(64),
  })
  .strict()

export const guestParamSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    guestId: z.string().trim().min(1).max(64),
  })
  .strict()

// Strict Query Schemas
export const paginationQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(500).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
  })
  .strict()

export interface PlanDbRow {
  id: string
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

// Lightweight helper to verify plan existence and ownership without loading full relations
export function verifyPlanOwnership(planId: string, userId: string): { id: string } | null {
  const stmt = getStatement('SELECT id FROM plans WHERE id = ? AND user_id = ?')
  return (stmt.get(planId, userId) as { id: string } | undefined) ?? null
}

// Helper to load a full plan by id with ownership check using cached statements
export function loadFullPlan(planId: string, userId: string): Plan | null {
  const planStmt = getStatement(`
    SELECT id, created_at, title, event_type, date, guests, budget, currency, city, vibe, notes, summary, generated_by
    FROM plans WHERE id = ? AND user_id = ?
  `)
  const p = planStmt.get(planId, userId) as PlanDbRow | undefined

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

  const budgetStmt = getStatement(`
    SELECT id, category, allocated, spent, note FROM budget_items WHERE plan_id = ?
  `)
  const budgetRows = budgetStmt.all(planId) as BudgetItem[]

  const milestoneStmt = getStatement(`
    SELECT id, label, detail, weeks_before AS weeksBefore, done FROM milestones WHERE plan_id = ? ORDER BY weeks_before DESC
  `)
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

  const vendorStmt = getStatement(`
    SELECT id, category, name, status, estimate, tips FROM vendors WHERE plan_id = ?
  `)
  const vendorRows = vendorStmt.all(planId) as Vendor[]

  const ideaStmt = getStatement(`
    SELECT title, items_json FROM idea_groups WHERE plan_id = ?
  `)
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
    budget: budgetRows,
    timeline,
    vendors: vendorRows,
    ideas,
    generatedBy: p.generated_by,
  }
}
