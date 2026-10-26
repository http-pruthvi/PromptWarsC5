import type { Vendor, VendorStatus } from '@soiree/shared'
import { getStatement } from '../db/index.js'
import { NotFoundError } from '../errors/index.js'
import { plansRepository } from '../repositories/plans.repository.js'
import { vendorsRepository } from '../repositories/vendors.repository.js'
import { sanitizeText } from '../utils/sanitize.js'

export interface CreateVendorInput {
  category: string
  name?: string | undefined
  status?: VendorStatus | undefined
  estimate?: number | undefined
  tips?: string | undefined
}

export interface UpdateVendorInput {
  category?: string | undefined
  name?: string | undefined
  status?: VendorStatus | undefined
  estimate?: number | undefined
  tips?: string | undefined
}

/**
 * Service managing vendor discovery, bookings, and contact records.
 */
export const vendorsService = {
  /**
   * List paginated vendors for a plan.
   */
  listVendors(
    planId: string,
    userId: string,
    limit: number,
    offset: number,
  ): { vendors: Vendor[]; total: number; limit: number; offset: number } {
    const plan = plansRepository.verifyOwnership(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    const countStmt = getStatement('SELECT COUNT(*) as count FROM vendors WHERE plan_id = ?')
    const total = (countStmt.get(planId) as { count: number }).count

    const rowsStmt = getStatement(
      'SELECT id, category, name, status, estimate, tips FROM vendors WHERE plan_id = ? LIMIT ? OFFSET ?',
    )
    const vendors = rowsStmt.all(planId, limit, offset) as Vendor[]

    return { vendors, total, limit, offset }
  },

  /**
   * Add a new vendor to the plan.
   */
  addVendor(planId: string, userId: string, raw: CreateVendorInput): Vendor {
    const plan = plansRepository.verifyOwnership(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    return vendorsRepository.insertVendor(planId, {
      category: sanitizeText(raw.category),
      name: sanitizeText(raw.name ?? ''),
      status: raw.status ?? 'todo',
      estimate: raw.estimate ?? 0,
      tips: sanitizeText(raw.tips ?? ''),
    })
  },

  /**
   * Update an existing vendor's details.
   */
  updateVendor(planId: string, userId: string, vendorId: string, patch: UpdateVendorInput): Vendor {
    const plan = plansRepository.verifyOwnership(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    const existing = vendorsRepository.findByPlanId(planId).find((v) => v.id === vendorId)
    if (!existing) throw new NotFoundError('Vendor not found')

    const updatedData = {
      category: patch.category !== undefined ? sanitizeText(patch.category) : existing.category,
      name: patch.name !== undefined ? sanitizeText(patch.name) : existing.name,
      status: patch.status ?? existing.status,
      estimate: patch.estimate !== undefined ? patch.estimate : existing.estimate,
      tips: patch.tips !== undefined ? sanitizeText(patch.tips) : existing.tips,
    }

    vendorsRepository.updateVendor(planId, vendorId, updatedData)
    return { id: vendorId, ...updatedData }
  },

  /**
   * Remove a vendor from the plan.
   */
  deleteVendor(planId: string, userId: string, vendorId: string): void {
    const plan = plansRepository.verifyOwnership(planId, userId)
    if (!plan) throw new NotFoundError('Plan not found')

    const deleted = vendorsRepository.deleteVendor(planId, vendorId)
    if (!deleted) throw new NotFoundError('Vendor not found')
  },
}
