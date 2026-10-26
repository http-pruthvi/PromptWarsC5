import type { DietaryOption, Guest, GuestInput, GuestStatus, GuestSummary } from '@soiree/shared'
import { calculateCostPerHead } from '@soiree/shared'
import { getStatement } from '../db/index.js'
import { NotFoundError, ValidationError } from '../errors/index.js'
import { guestsRepository } from '../repositories/guests.repository.js'
import { plansRepository } from '../repositories/plans.repository.js'
import { sanitizeText } from '../utils/sanitize.js'

export interface UpdateGuestPatch {
  name?: string | undefined
  party?: number | undefined
  status?: GuestStatus | undefined
  dietary?: DietaryOption | undefined
  notes?: string | undefined
}

/**
 * Service managing guest lists, RSVPs, dietary needs, and headcount metrics.
 */
export const guestsService = {
  /**
   * List paginated guests for a plan.
   */
  listGuests(
    planId: string,
    userId: string,
    limit: number,
    offset: number,
  ): { guests: Guest[]; total: number; limit: number; offset: number } {
    const plan = plansRepository.verifyOwnership(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    const countStmt = getStatement('SELECT COUNT(*) as count FROM guests WHERE plan_id = ?')
    const total = (countStmt.get(planId) as { count: number }).count

    const rowsStmt = getStatement(`
      SELECT id, name, party, status, dietary, notes
      FROM guests WHERE plan_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?
    `)
    const guests = rowsStmt.all(planId, limit, offset) as Guest[]

    return { guests, total, limit, offset }
  },

  /**
   * Add a single guest to the event plan.
   */
  addGuest(planId: string, userId: string, data: GuestInput): Guest {
    const plan = plansRepository.verifyOwnership(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    return guestsRepository.insertGuest(planId, {
      name: sanitizeText(data.name),
      party: data.party,
      status: data.status,
      dietary: data.dietary,
      notes: sanitizeText(data.notes ?? ''),
    })
  },

  /**
   * Update an existing guest record.
   */
  updateGuest(planId: string, userId: string, guestId: string, patch: UpdateGuestPatch): Guest {
    const plan = plansRepository.verifyOwnership(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    const existing = guestsRepository.findByPlanId(planId).find((g) => g.id === guestId)
    if (!existing) throw new NotFoundError('Guest not found')

    const updated = {
      name: patch.name !== undefined ? sanitizeText(patch.name) : existing.name,
      party: patch.party ?? existing.party,
      status: patch.status ?? existing.status,
      dietary: patch.dietary ?? existing.dietary,
      notes: patch.notes !== undefined ? sanitizeText(patch.notes) : existing.notes,
    }

    guestsRepository.updateGuest(planId, guestId, updated)
    return { id: guestId, ...updated }
  },

  /**
   * Remove a guest from the event plan.
   */
  deleteGuest(planId: string, userId: string, guestId: string): void {
    const plan = plansRepository.verifyOwnership(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    const deleted = guestsRepository.deleteGuest(planId, guestId)
    if (!deleted) throw new NotFoundError('Guest not found')
  },

  /**
   * Bulk import guests from pasted newline-separated text.
   */
  importPastedGuests(planId: string, userId: string, text: string): { count: number; guests: Guest[] } {
    const plan = plansRepository.verifyOwnership(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    const lines = text
      .split(/\r?\n/)
      .map((l) => sanitizeText(l))
      .filter((l) => l.length > 0)

    if (lines.length > 500) {
      throw new ValidationError('Cannot import more than 500 guests at once')
    }
    if (lines.length === 0) {
      throw new ValidationError('No valid guest names found in pasted text')
    }

    const inputs: GuestInput[] = lines.map((line) => ({
      name: line.slice(0, 100),
      party: 1,
      status: 'pending',
      dietary: 'none',
      notes: '',
    }))

    const guests = guestsRepository.batchInsertGuests(planId, inputs)
    return { count: guests.length, guests }
  },

  /**
   * Compute guest counts by status, dietary metrics, and catering cost per head.
   */
  getSummary(planId: string, userId: string): GuestSummary {
    const plan = plansRepository.verifyOwnership(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    const guests = guestsRepository.findByPlanId(planId)
    const countsByStatus: Record<GuestStatus, number> = { pending: 0, attending: 0, declined: 0 }
    const countsByDietary: Record<DietaryOption, number> = { none: 0, veg: 0, vegan: 0, jain: 0, halal: 0, other: 0 }
    let confirmedHeadcount = 0

    for (const g of guests) {
      const s = countsByStatus[g.status]
      if (s !== undefined) countsByStatus[g.status] = s + 1

      const d = countsByDietary[g.dietary]
      if (d !== undefined) countsByDietary[g.dietary] = d + 1

      if (g.status === 'attending') {
        confirmedHeadcount += g.party
      }
    }

    const cateringAllocation = guestsRepository.getCateringAllocation(planId)
    const costPerHead = calculateCostPerHead(cateringAllocation, confirmedHeadcount)

    return {
      totalGuests: guests.length,
      confirmedHeadcount,
      countsByStatus,
      countsByDietary,
      cateringAllocation,
      costPerHead,
    }
  },
}
