import React, { useState } from 'react'
import { UserPlus } from 'lucide-react'
import type { DietaryOption, GuestStatus } from '@soiree/shared'

interface Props {
  adding: boolean
  onAdd: (guest: {
    name: string
    party: number
    status: GuestStatus
    dietary: DietaryOption
    notes?: string | undefined
  }) => Promise<void>
}

/**
 * Quick inline creation card to add an individual guest or family party.
 */
export function GuestAddForm({ adding, onAdd }: Props) {
  const [newName, setNewName] = useState('')
  const [newParty, setNewParty] = useState(1)
  const [newStatus, setNewStatus] = useState<GuestStatus>('pending')
  const [newDietary, setNewDietary] = useState<DietaryOption>('none')
  const [newNotes, setNewNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || adding) return
    await onAdd({
      name: newName.trim(),
      party: newParty,
      status: newStatus,
      dietary: newDietary,
      notes: newNotes.trim() || undefined,
    })
    setNewName('')
    setNewParty(1)
    setNewStatus('pending')
    setNewDietary('none')
    setNewNotes('')
  }

  return (
    <div className="add-guest-card">
      <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20, marginBottom: 12, color: 'var(--ink)' }}>Add New Guest</h3>
      <form className="add-guest-form" onSubmit={handleSubmit}>
        <input
          className="add-guest-input"
          placeholder="Guest / Family Name (required)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
          aria-label="New guest name"
          disabled={adding}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Party:</span>
          <input
            type="number"
            min={1}
            max={10}
            className="add-guest-party"
            value={newParty}
            onChange={(e) => setNewParty(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
            aria-label="Party size"
            disabled={adding}
          />
        </div>
        <select
          className="guest-select"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value as GuestStatus)}
          aria-label="RSVP Status"
          disabled={adding}
        >
          <option value="pending">Pending</option>
          <option value="attending">Attending</option>
          <option value="declined">Declined</option>
        </select>
        <select
          className="guest-select"
          value={newDietary}
          onChange={(e) => setNewDietary(e.target.value as DietaryOption)}
          aria-label="Dietary preference"
          disabled={adding}
        >
          <option value="none">No Dietary Restriction</option>
          <option value="veg">Vegetarian</option>
          <option value="vegan">Vegan</option>
          <option value="jain">Jain</option>
          <option value="halal">Halal</option>
          <option value="other">Other / Custom</option>
        </select>
        <input
          className="add-guest-notes"
          placeholder="Notes (e.g. Table 2, Groom's family)"
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          aria-label="Guest notes"
          disabled={adding}
        />
        <button
          type="submit"
          className="btn btn-gold"
          disabled={adding || !newName.trim()}
          style={{ padding: '8px 18px', fontSize: 13 }}
        >
          <UserPlus size={15} /> <span>Add</span>
        </button>
      </form>
    </div>
  )
}
