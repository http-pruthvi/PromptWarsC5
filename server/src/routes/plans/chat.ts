import { Router } from 'express'
import { z } from 'zod'
import { idParamSchema, paginationQuerySchema } from '@soiree/shared'
import { getAuthUserId } from '../../middleware/auth.js'
import { chatService } from '../../services/chat.service.js'

export const chatRouter = Router()

const chatSchema = z
  .object({
    message: z.string().trim().min(1, 'Message cannot be empty').max(2000),
  })
  .strict()

/**
 * GET /api/plans/:id/chat - Get chat history with pagination
 */
chatRouter.get('/:id/chat', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const { limit, offset } = paginationQuerySchema.parse(req.query)
    const result = chatService.listMessages(id, getAuthUserId(req), limit, offset)
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/plans/:id/chat - Send chat message and get reply
 */
chatRouter.post('/:id/chat', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const { message } = chatSchema.parse(req.body)
    const result = await chatService.sendMessage(id, getAuthUserId(req), message)
    return res.json(result)
  } catch (err) {
    next(err)
  }
})
