import type { Moodboard, MoodboardResponse } from '@soiree/shared'
import { getDb, getStatement } from '../db/index.js'
import { uid } from '../services/generator.js'

/**
 * Repository handling database operations for AI-generated and saved moodboards.
 */
export const moodboardRepository = {
  /**
   * Find saved moodboard by plan id.
   */
  findByPlanId(planId: string): MoodboardResponse | null {
    const stmt = getStatement(`
      SELECT json, generated_by AS generatedBy, created_at AS createdAt
      FROM moodboards WHERE plan_id = ?
    `)
    const row = stmt.get(planId) as { json: string; generatedBy: 'gemini' | 'offline'; createdAt: string } | undefined
    if (!row) return null
    return {
      moodboard: JSON.parse(row.json) as Moodboard,
      generatedBy: row.generatedBy,
      createdAt: row.createdAt,
    }
  },

  /**
   * Save or replace a moodboard for a plan.
   */
  upsertMoodboard(planId: string, moodboard: Moodboard, generatedBy: 'gemini' | 'offline'): MoodboardResponse {
    const db = getDb()
    const rowId = uid()
    db.prepare(
      `
      INSERT INTO moodboards (id, plan_id, json, generated_by, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(plan_id) DO UPDATE SET
        json = excluded.json,
        generated_by = excluded.generated_by,
        created_at = CURRENT_TIMESTAMP
    `,
    ).run(rowId, planId, JSON.stringify(moodboard), generatedBy)

    const saved = db.prepare('SELECT created_at FROM moodboards WHERE plan_id = ?').get(planId) as
      { created_at?: string } | undefined

    return {
      moodboard,
      generatedBy,
      createdAt: saved?.created_at ?? new Date().toISOString(),
    }
  },
}
