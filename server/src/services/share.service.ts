import crypto from 'crypto'
import type { PublicPlanView, ShareResponse } from '@soiree/shared'
import { NotFoundError } from '../errors/index.js'
import { plansRepository } from '../repositories/plans.repository.js'
import { shareRepository } from '../repositories/share.repository.js'

/**
 * Service managing secure public plan sharing links and whitelisted view access.
 */
export const shareService = {
  /**
   * Retrieve the current sharing status and token for a plan.
   */
  getShareStatus(planId: string, userId: string): ShareResponse {
    const plan = plansRepository.verifyOwnership(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    return shareRepository.getShareState(planId)
  },

  /**
   * Enable public sharing with a cryptographically secure 144-bit URL-safe token.
   */
  enableShare(planId: string, userId: string): ShareResponse {
    const plan = plansRepository.verifyOwnership(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    const current = shareRepository.getShareState(planId)
    const token = current.shareToken ?? crypto.randomBytes(18).toString('base64url')

    shareRepository.enableShare(planId, token)
    return { shareToken: token, shareEnabled: true }
  },

  /**
   * Revoke public sharing immediately so the link becomes inaccessible.
   */
  revokeShare(planId: string, userId: string): { message: string; shareEnabled: boolean } {
    const plan = plansRepository.verifyOwnership(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    shareRepository.revokeShare(planId)
    return { message: 'Share link revoked', shareEnabled: false }
  },

  /**
   * Retrieve sanitized public view by share token, or throw NotFoundError.
   */
  getPublicPlan(token: string): PublicPlanView {
    const publicPlan = shareRepository.findPublicPlanByToken(token)
    if (!publicPlan) {
      throw new NotFoundError('Plan not found')
    }
    return publicPlan
  },
}
