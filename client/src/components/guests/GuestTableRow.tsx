import React from 'react'
import { Trash2 } from 'lucide-react'
import type { DietaryOption, Guest, GuestStatus } from '@soiree/shared'

interface GuestRowProps {
  g: Guest
  onUpdateImmediate: (id: string, patch: Partial<Guest>) => void
  onUpdateText: (id: string, patch: Partial<Guest>) => void
  onDelete: (id: string) => void
}

/**
 * Individual guest record table row with editable inline inputs and RSVP selects.
 */
export const GuestTableRow = React.memo(function GuestTableRow({
  g,
  onUpdateImmediate,
  onUpdateText,
  onDelete,
}: GuestRowProps) {
  return (
    <tr key={g.id}>
      <td className="guest-name-cell">
        <input
          value={g.name}
          onChange={(e) => onUpdateText(g.id, { name: e.target.value })}
          aria-label={`Name for guest ${g.name}`}
        />
      </td>
      <td style={{ textAlign: 'center' }}>
        <select
          className="guest-select"
          style={{ padding: '2px 8px', fontSize: 12 }}
          value={g.party}
          onChange={(e) => onUpdateImmediate(g.id, { party: parseInt(e.target.value) || 1 })}
          aria-label={`Party size for ${g.name}`}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <option key={num} value={num}>
              {num}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select
          className={`guest-status-select status-${g.status}`}
          value={g.status}
          onChange={(e) => onUpdateImmediate(g.id, { status: e.target.value as GuestStatus })}
          aria-label={`RSVP status for ${g.name}`}
        >
          <option value="pending">⏳ Pending</option>
          <option value="attending">✓ Attending</option>
          <option value="declined">✕ Declined</option>
        </select>
      </td>
      <td>
        <select
          className="guest-dietary-select"
          value={g.dietary}
          onChange={(e) => onUpdateImmediate(g.id, { dietary: e.target.value as DietaryOption })}
          aria-label={`Dietary preference for ${g.name}`}
        >
          <option value="none">Standard</option>
          <option value="veg">Vegetarian</option>
          <option value="vegan">Vegan</option>
          <option value="jain">Jain</option>
          <option value="halal">Halal</option>
          <option value="other">Other</option>
        </select>
      </td>
      <td className="guest-notes-cell">
        <input
          placeholder="Add notes..."
          value={g.notes || ''}
          onChange={(e) => onUpdateText(g.id, { notes: e.target.value })}
          aria-label={`Notes for ${g.name}`}
        />
      </td>
      <td style={{ textAlign: 'center' }}>
        <button
          className="link-btn"
          onClick={() => onDelete(g.id)}
          aria-label={`Remove guest ${g.name}`}
          style={{ color: '#991b1b', opacity: 0.7 }}
        >
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  )
})
