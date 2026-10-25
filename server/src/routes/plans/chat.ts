import { Router } from 'express'
import { z } from 'zod'
import type { ChatMessage } from '@soiree/shared'
import { getDb, getStatement } from '../../db/index.js'
import { askAssistant } from '../../services/ai.js'
import { uid } from '../../services/generator.js'
import { sanitizeText } from '../../utils/sanitize.js'
import { idParamSchema, loadFullPlan, paginationQuerySchema, verifyPlanOwnership } from './common.js'

export const chatRouter = Router()

const chatSchema = z
  .object({
    message: z.string().trim().min(1, 'Message cannot be empty').max(2000),
  })
  .strict()

// GET /api/plans/:id/chat - Get chat history with pagination
chatRouter.get('/:id/chat', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const plan = verifyPlanOwnership(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const { limit, offset } = paginationQuerySchema.parse(req.query)

    const countStmt = getStatement('SELECT COUNT(*) as count FROM chat_messages WHERE plan_id = ?')
    const total = (countStmt.get(plan.id) as { count: number }).count

    const rowsStmt = getStatement(`
      SELECT id, role, text, created_at AS createdAt
      FROM chat_messages WHERE plan_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?
    `)
    const messages = rowsStmt.all(plan.id, limit, offset) as ChatMessage[]

    return res.json({ messages, total, limit, offset })
  } catch (err) {
    next(err)
  }
})

// POST /api/plans/:id/chat - Send chat message and get reply
chatRouter.post('/:id/chat', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const { message } = chatSchema.parse(req.body)
    const sanitizedMessage = sanitizeText(message)

    const plan = loadFullPlan(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const db = getDb()
    const history = db
      .prepare(
        `
      SELECT role, text FROM chat_messages WHERE plan_id = ? ORDER BY created_at ASC
    `,
      )
      .all(id) as ChatMessage[]

    const now = Date.now()
    const userMsgId = uid()
    db.prepare(
      `
      INSERT INTO chat_messages (id, plan_id, role, text, created_at)
      VALUES (?, ?, 'user', ?, ?)
    `,
    ).run(userMsgId, id, sanitizedMessage, now)

    const { text: reply, ai } = await askAssistant(plan, history, sanitizedMessage)
    const assistantMsgId = uid()
    db.prepare(
      `
      INSERT INTO chat_messages (id, plan_id, role, text, created_at)
      VALUES (?, ?, 'assistant', ?, ?)
    `,
    ).run(assistantMsgId, id, reply, now + 1)

    return res.json({
      userMessage: { id: userMsgId, role: 'user', text: sanitizedMessage, createdAt: now },
      reply: { id: assistantMsgId, role: 'assistant', text: reply, createdAt: now + 1 },
      ai,
    })
  } catch (err) {
    next(err)
  }
})
