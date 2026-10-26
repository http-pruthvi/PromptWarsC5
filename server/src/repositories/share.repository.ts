import type { IdeaGroup, Milestone, PublicPlanView } from '@soiree/shared'
import { getStatement } from '../db/index.js'

export interface ShareState {
  shareToken: string | null
  shareEnabled: boolean
}

interface PublicPlanRow {
  id: string
  title: string
  event_type: 'wedding' | 'birthday' | 'community'
  date: string
  city: string
  summary: string
  share_enabled: number
}

/**
 * Repository handling database operations for public plan sharing and tokens.
 */
export const shareRepository = {
  /**
   * Retrieve current sharing status and token for a plan.
   */
  getShareState(planId: string): ShareState {
    const stmt = getStatement('SELECT share_token, share_enabled FROM plans WHERE id = ?')
    const row = stmt.get(planId) as { share_token: string | null; share_enabled: number } | undefined
    return {
      shareToken: row?.share_token ?? null,
      shareEnabled: Boolean(row?.share_enabled),
    }
  },

  /**
   * Enable public sharing with a token.
   */
  enableShare(planId: string, token: string): void {
    const stmt = getStatement('UPDATE plans SET share_token = ?, share_enabled = 1 WHERE id = ?')
    stmt.run(token, planId)
  },

  /**
   * Revoke public sharing for a plan.
   */
  revokeShare(planId: string): void {
    const stmt = getStatement('UPDATE plans SET share_enabled = 0 WHERE id = ?')
    stmt.run(planId)
  },

  /**
   * Find public plan view by share token. Whitelists only non-sensitive fields.
   */
  findPublicPlanByToken(token: string): PublicPlanView | null {
    const stmt = getStatement(`
      SELECT id, title, event_type, date, city, summary, share_enabled
      FROM plans WHERE share_token = ?
    `)
    const p = stmt.get(token) as PublicPlanRow | undefined
    if (!p || p.share_enabled !== 1) {
      return null
    }

    const milestoneStmt = getStatement(`
      SELECT id, label, detail, weeks_before AS weeksBefore, done
      FROM milestones WHERE plan_id = ? ORDER BY weeks_before DESC
    `)
    const milestoneRows = milestoneStmt.all(p.id) as Array<{
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

    const vendorStmt = getStatement('SELECT category, status FROM vendors WHERE plan_id = ?')
    const vendorRows = vendorStmt.all(p.id) as Array<{
      category: string
      status: 'todo' | 'contacted' | 'booked'
    }>

    const ideaStmt = getStatement('SELECT title, items_json FROM idea_groups WHERE plan_id = ?')
    const ideaRows = ideaStmt.all(p.id) as Array<{ title: string; items_json: string }>
    const ideas: IdeaGroup[] = ideaRows.map((g) => ({
      title: g.title,
      items: JSON.parse(g.items_json),
    }))

    const mbStmt = getStatement('SELECT json FROM moodboards WHERE plan_id = ?')
    const mbRow = mbStmt.get(p.id) as { json: string } | undefined
    const moodboard = mbRow ? JSON.parse(mbRow.json) : null

    return {
      title: p.title,
      eventType: p.event_type,
      date: p.date,
      city: p.city,
      summary: p.summary,
      timeline,
      vendors: vendorRows,
      ideas,
      moodboard,
    }
  },
}
