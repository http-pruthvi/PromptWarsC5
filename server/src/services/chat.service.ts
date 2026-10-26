import type { ChatMessage } from '@soiree/shared'
import { NotFoundError } from '../errors/index.js'
import { chatRepository } from '../repositories/chat.repository.js'
import { plansRepository } from '../repositories/plans.repository.js'
import { sanitizeText } from '../utils/sanitize.js'
import { askAssistant } from './ai.js'

export interface ChatInteractionResult {
  userMessage: ChatMessage
  reply: ChatMessage
  ai: boolean
}

/**
 * Service managing conversational planning messages and assistant replies.
 */
export const chatService = {
  /**
   * List paginated chat history for a plan.
   */
  listMessages(
    planId: string,
    userId: string,
    limit: number,
    offset: number,
  ): { messages: ChatMessage[]; total: number; limit: number; offset: number } {
    const plan = plansRepository.verifyOwnership(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    const total = chatRepository.countByPlanId(planId)
    const messages = chatRepository.listByPlanId(planId, limit, offset)
    return { messages, total, limit, offset }
  },

  /**
   * Post a user message, query the assistant, and persist both messages.
   */
  async sendMessage(planId: string, userId: string, rawMessage: string): Promise<ChatInteractionResult> {
    const plan = plansRepository.findFullPlan(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    const sanitizedMessage = sanitizeText(rawMessage)
    const history = chatRepository.getFullHistory(planId)

    const now = Date.now()
    const userMessage = chatRepository.appendMessage(planId, 'user', sanitizedMessage, now)

    const { text: replyText, ai } = await askAssistant(plan, history, sanitizedMessage)
    const reply = chatRepository.appendMessage(planId, 'assistant', replyText, now + 1)

    return { userMessage, reply, ai }
  },
}
