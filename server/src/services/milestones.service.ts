import { NotFoundError } from '../errors/index.js'
import { milestonesRepository } from '../repositories/milestones.repository.js'
import { plansRepository } from '../repositories/plans.repository.js'

/**
 * Service managing event timeline milestones.
 */
export const milestonesService = {
  /**
   * Toggle or set the completion status of a milestone.
   */
  updateMilestoneDone(
    planId: string,
    userId: string,
    milestoneId: string,
    done: boolean,
  ): { id: string; done: boolean } {
    const plan = plansRepository.verifyOwnership(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    const updated = milestonesRepository.updateDone(planId, milestoneId, done)
    if (!updated) throw new NotFoundError('Milestone not found')

    return { id: milestoneId, done }
  },
}
