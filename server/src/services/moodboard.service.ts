import type { MoodboardResponse } from '@soiree/shared'
import { NotFoundError } from '../errors/index.js'
import { moodboardRepository } from '../repositories/moodboard.repository.js'
import { plansRepository } from '../repositories/plans.repository.js'
import { sanitizeText } from '../utils/sanitize.js'
import { generateMoodboard } from './ai.js'

/**
 * Service managing moodboard generation, styling palettes, and design motifs.
 */
export const moodboardService = {
  /**
   * Retrieve saved moodboard or throw NotFoundError.
   */
  getMoodboard(planId: string, userId: string): MoodboardResponse {
    const plan = plansRepository.verifyOwnership(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    const saved = moodboardRepository.findByPlanId(planId)
    if (!saved) throw new NotFoundError('Moodboard not found')

    return saved
  },

  /**
   * Generate or regenerate a moodboard for a plan and persist it.
   */
  async createOrRegenerate(planId: string, userId: string, extra?: string): Promise<MoodboardResponse> {
    const plan = plansRepository.findFullPlan(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    const sanitizedExtra = extra ? sanitizeText(extra) : undefined
    const { moodboard, generatedBy } = await generateMoodboard(plan.brief, sanitizedExtra)

    return moodboardRepository.upsertMoodboard(planId, moodboard, generatedBy)
  },
}
