import type { Vendor, VendorInput } from '@soiree/shared'
import { getStatement } from '../db/index.js'
import { uid } from '../services/generator.js'

/**
 * Repository handling database operations for vendor contacts and bookings.
 */
export const vendorsRepository = {
  /**
   * Find all vendors for a plan.
   */
  findByPlanId(planId: string): Vendor[] {
    const stmt = getStatement(`
      SELECT id, category, name, status, estimate, tips
      FROM vendors
      WHERE plan_id = ?
    `)
    return stmt.all(planId) as Vendor[]
  },

  /**
   * Insert a new vendor record.
   */
  insertVendor(planId: string, data: VendorInput): Vendor {
    const id = uid()
    const stmt = getStatement(`
      INSERT INTO vendors (id, plan_id, category, name, status, estimate, tips)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(id, planId, data.category, data.name, data.status, data.estimate ?? 0, data.tips ?? '')
    return {
      id,
      category: data.category,
      name: data.name,
      status: data.status,
      estimate: data.estimate ?? 0,
      tips: data.tips ?? '',
    }
  },

  /**
   * Update an existing vendor record.
   */
  updateVendor(planId: string, vendorId: string, data: VendorInput): boolean {
    const stmt = getStatement(`
      UPDATE vendors
      SET category = ?, name = ?, status = ?, estimate = ?, tips = ?
      WHERE id = ? AND plan_id = ?
    `)
    const result = stmt.run(
      data.category,
      data.name,
      data.status,
      data.estimate ?? 0,
      data.tips ?? '',
      vendorId,
      planId,
    )
    return result.changes > 0
  },

  /**
   * Delete a vendor record.
   */
  deleteVendor(planId: string, vendorId: string): boolean {
    const stmt = getStatement('DELETE FROM vendors WHERE id = ? AND plan_id = ?')
    const result = stmt.run(vendorId, planId)
    return result.changes > 0
  },
}
