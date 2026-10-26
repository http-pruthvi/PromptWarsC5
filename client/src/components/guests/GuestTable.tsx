import { Users } from 'lucide-react'
import type { Guest } from '@soiree/shared'
import { GuestTableRow } from './GuestTableRow'

interface Props {
  guests: Guest[]
  totalGuestsCount: number
  onUpdateImmediate: (id: string, patch: Partial<Guest>) => void
  onUpdateText: (id: string, patch: Partial<Guest>) => void
  onDelete: (id: string) => void
}

/**
 * Guest list table display with empty state fallback and sortable column headers.
 */
export function GuestTable({ guests, totalGuestsCount, onUpdateImmediate, onUpdateText, onDelete }: Props) {
  if (guests.length === 0) {
    return (
      <div className="guests-table-card">
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted)' }}>
          <Users size={36} style={{ color: 'var(--gold)', margin: '0 auto 12px', opacity: 0.7 }} />
          <p style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>
            {totalGuestsCount === 0 ? 'No guests added yet' : 'No guests match your filters'}
          </p>
          <p style={{ fontSize: 13.5 }}>
            {totalGuestsCount === 0
              ? 'Add attendees one by one above or paste a list with Bulk Import.'
              : 'Try clearing your search query or changing your filters.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="guests-table-card">
      <div className="guests-table-wrap">
        <table className="guests-table" aria-label="Guest list and RSVP tracker">
          <thead>
            <tr>
              <th style={{ minWidth: 160 }}>Guest Name</th>
              <th style={{ width: 80, textAlign: 'center' }}>Party</th>
              <th style={{ width: 140 }}>RSVP Status</th>
              <th style={{ width: 140 }}>Dietary</th>
              <th style={{ minWidth: 180 }}>Notes / Seat</th>
              <th style={{ width: 60, textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((g) => (
              <GuestTableRow
                key={g.id}
                g={g}
                onUpdateImmediate={onUpdateImmediate}
                onUpdateText={onUpdateText}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
