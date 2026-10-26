import type { DietaryOption, Guest, GuestInput, GuestStatus } from '@soiree/shared'
import { getDb, getStatement } from '../db/index.js'
import { uid } from '../services/generator.js'

interface GuestDbRow {
  id: string
  name: string
  party: number
  status: GuestStatus
  dietary: DietaryOption
  notes: string
}

/**
 * Repository handling database operations for guest lists and RSVPs.
 */
export const guestsRepository = {
  /**
   * List all guests for a plan.
   */
  findByPlanId(planId: string): Guest[] {
    const stmt = getStatement(`
      SELECT id, name, party, status, dietary, notes
      FROM guests
      WHERE plan_id = ?
      ORDER BY name ASC
    `)
    return stmt.all(planId) as GuestDbRow[]
  },

  /**
   * Insert a single guest record.
   */
  insertGuest(planId: string, data: GuestInput): Guest {
    const id = uid()
    const stmt = getStatement(`
      INSERT INTO guests (id, plan_id, name, party, status, dietary, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(id, planId, data.name, data.party, data.status, data.dietary, data.notes ?? '')
    return {
      id,
      name: data.name,
      party: data.party,
      status: data.status,
      dietary: data.dietary,
      notes: data.notes ?? '',
    }
  },

  /**
   * Batch insert multiple guest records in a single transaction.
   */
  batchInsertGuests(planId: string, guests: GuestInput[]): Guest[] {
    const db = getDb()
    const stmt = db.prepare(`
      INSERT INTO guests (id, plan_id, name, party, status, dietary, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const created: Guest[] = []
    const tx = db.transaction(() => {
      for (const g of guests) {
        const id = uid()
        stmt.run(id, planId, g.name, g.party, g.status, g.dietary, g.notes ?? '')
        created.push({
          id,
          name: g.name,
          party: g.party,
          status: g.status,
          dietary: g.dietary,
          notes: g.notes ?? '',
        })
      }
    })
    tx()
    return created
  },

  /**
   * Update an existing guest record.
   */
  updateGuest(planId: string, guestId: string, data: GuestInput): boolean {
    const stmt = getStatement(`
      UPDATE guests
      SET name = ?, party = ?, status = ?, dietary = ?, notes = ?
      WHERE id = ? AND plan_id = ?
    `)
    const result = stmt.run(data.name, data.party, data.status, data.dietary, data.notes ?? '', guestId, planId)
    return result.changes > 0
  },

  /**
   * Delete a guest by identifier.
   */
  deleteGuest(planId: string, guestId: string): boolean {
    const stmt = getStatement('DELETE FROM guests WHERE id = ? AND plan_id = ?')
    const result = stmt.run(guestId, planId)
    return result.changes > 0
  },

  /**
   * Clear all guests for a plan.
   */
  clearAll(planId: string): void {
    const stmt = getStatement('DELETE FROM guests WHERE plan_id = ?')
    stmt.run(planId)
  },

  /**
   * Get the catering allocation for a plan to calculate cost per head.
   */
  getCateringAllocation(planId: string): number {
    const stmt = getStatement(`
      SELECT allocated FROM budget_items
      WHERE plan_id = ? AND (category LIKE '%Cater%' OR category LIKE '%Food%')
      LIMIT 1
    `)
    const row = stmt.get(planId) as { allocated: number } | undefined
    return row?.allocated ?? 0
  },
}
