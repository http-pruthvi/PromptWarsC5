import type { Brief, BriefInput, Plan, PlanSummary } from '@soiree/shared'
import { NotFoundError } from '../errors/index.js'
import { plansRepository } from '../repositories/plans.repository.js'
import { sanitizeText } from '../utils/sanitize.js'
import { generatePlan } from './ai.js'

export interface ListPlansResult {
  plans: PlanSummary[]
  total: number
  limit: number
  offset: number
}

/**
 * Service managing plan lifecycle operations and generation orchestration.
 */
export const plansService = {
  /**
   * List paginated plans for a given user.
   */
  listPlans(userId: string, limit: number, offset: number): ListPlansResult {
    const total = plansRepository.countByUserId(userId)
    const plans = plansRepository.listByUserId(userId, limit, offset)
    return { plans, total, limit, offset }
  },

  /**
   * Create and persist a new plan from a sanitized user brief.
   */
  async createPlan(userId: string, rawBrief: BriefInput): Promise<Plan> {
    const sanitizedBrief: Brief = {
      ...rawBrief,
      title: sanitizeText(rawBrief.title),
      city: sanitizeText(rawBrief.city),
      vibe: sanitizeText(rawBrief.vibe),
      notes: sanitizeText(rawBrief.notes),
    }

    const plan = await generatePlan(sanitizedBrief)
    plansRepository.insertPlan(plan, userId)
    return plan
  },

  /**
   * Retrieve a user's full plan with all related items, throwing NotFoundError if missing.
   */
  getPlan(planId: string, userId: string): Plan {
    const plan = plansRepository.findFullPlan(planId, userId)
    if (!plan) {
      throw new NotFoundError('Plan not found')
    }
    return plan
  },

  /**
   * Delete an existing plan, verifying ownership and throwing NotFoundError if not found.
   */
  deletePlan(planId: string, userId: string): void {
    const deleted = plansRepository.deleteByIdAndUserId(planId, userId)
    if (!deleted) {
      throw new NotFoundError('Plan not found')
    }
  },

  /**
   * Regenerate celebration ideas using AI and persist the updated groups.
   */
  async regenerateIdeas(
    planId: string,
    userId: string,
    extra?: string,
  ): Promise<{ ideas: import('@soiree/shared').IdeaGroup[]; ai: boolean }> {
    const plan = this.getPlan(planId, userId)
    const sanitizedExtra = extra ? sanitizeText(extra) : ''
    const { ideas, ai } = await import('./ai.js').then((m) => m.generateIdeas(plan.brief, sanitizedExtra))
    plansRepository.replaceIdeas(planId, ideas)
    return { ideas, ai }
  },
}
