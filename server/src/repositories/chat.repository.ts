import type { ChatMessage } from '@soiree/shared'
import { getStatement } from '../db/index.js'
import { uid } from '../services/generator.js'

/**
 * Repository handling database operations for chat messages.
 */
export const chatRepository = {
  /**
   * Count total chat messages for a plan.
   */
  countByPlanId(planId: string): number {
    const stmt = getStatement('SELECT COUNT(*) as count FROM chat_messages WHERE plan_id = ?')
    const row = stmt.get(planId) as { count: number } | undefined
    return row?.count ?? 0
  },

  /**
   * List paginated chat messages for a plan.
   */
  listByPlanId(planId: string, limit: number, offset: number): ChatMessage[] {
    const stmt = getStatement(`
      SELECT id, role, text, created_at AS createdAt
      FROM chat_messages WHERE plan_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?
    `)
    return stmt.all(planId, limit, offset) as ChatMessage[]
  },

  /**
   * Retrieve full chat history for context in AI generation.
   */
  getFullHistory(planId: string): ChatMessage[] {
    const stmt = getStatement('SELECT role, text FROM chat_messages WHERE plan_id = ? ORDER BY created_at ASC')
    return stmt.all(planId) as ChatMessage[]
  },

  /**
   * Append a chat message to the history.
   */
  appendMessage(planId: string, role: 'user' | 'assistant', text: string, timestamp: number = Date.now()): ChatMessage {
    const id = uid()
    const stmt = getStatement(`
      INSERT INTO chat_messages (id, plan_id, role, text, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    stmt.run(id, planId, role, text, timestamp)
    return { id, role, text, createdAt: timestamp }
  },
}
