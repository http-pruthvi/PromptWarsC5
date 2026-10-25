import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Search, Trash2, Upload, UserPlus, Users, X } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DietaryOption, Guest, GuestStatus, GuestSummary, Plan } from '@soiree/shared'
import { api } from '../../lib/api'
import { compactMoney, money } from '../../lib/utils'
import { LoopingLotus } from '../Vectors'
import { Stat } from './TabHelpers'

interface Props {
  plan: Plan
  toast: (m: string) => void
}

interface GuestRowProps {
  g: Guest
  onUpdateImmediate: (id: string, patch: Partial<Guest>) => void
  onUpdateText: (id: string, patch: Partial<Guest>) => void
  onDelete: (id: string) => void
}

const GuestTableRow = React.memo(function GuestTableRow({
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

export default function GuestsTab({ plan, toast }: Props) {
  const [guests, setGuests] = useState<Guest[]>([])
  const [summary, setSummary] = useState<GuestSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | GuestStatus>('all')
  const [dietaryFilter, setDietaryFilter] = useState<'all' | DietaryOption>('all')
  const [showImportModal, setShowImportModal] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)

  // Add guest form
  const [newName, setNewName] = useState('')
  const [newParty, setNewParty] = useState(1)
  const [newStatus, setNewStatus] = useState<GuestStatus>('pending')
  const [newDietary, setNewDietary] = useState<DietaryOption>('none')
  const [newNotes, setNewNotes] = useState('')
  const [adding, setAdding] = useState(false)
  const debounceTimers = useRef<Record<string, number>>({})

  const cur = plan.brief.currency

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)

    Promise.all([
      api.plans.listGuests(plan.id, { signal: controller.signal }),
      api.plans.getGuestSummary(plan.id, { signal: controller.signal }),
    ])
      .then(([gRes, sRes]) => {
        setGuests(gRes.guests)
        setSummary(sRes.summary)
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'AbortError') return
        toast('Failed to load guests')
      })
      .finally(() => {
        setLoading(false)
      })

    return () => {
      controller.abort()
      for (const t of Object.values(debounceTimers.current)) {
        window.clearTimeout(t)
      }
    }
  }, [plan.id, toast])

  const recalculateSummary = useCallback(
    (list: Guest[]): GuestSummary => {
      const countsByStatus = { pending: 0, attending: 0, declined: 0 }
      const countsByDietary = { none: 0, veg: 0, vegan: 0, jain: 0, halal: 0, other: 0 }
      let confirmedHeadcount = 0

      for (const g of list) {
        if (countsByStatus[g.status] !== undefined) countsByStatus[g.status]++
        if (countsByDietary[g.dietary] !== undefined) countsByDietary[g.dietary]++
        if (g.status === 'attending') confirmedHeadcount += g.party
      }

      const cateringAlloc = summary?.cateringAllocation ?? 0
      const costPerHead = confirmedHeadcount > 0 ? Math.round(cateringAlloc / confirmedHeadcount) : null

      return {
        totalGuests: list.length,
        confirmedHeadcount,
        countsByStatus,
        countsByDietary,
        cateringAllocation: cateringAlloc,
        costPerHead,
      }
    },
    [summary?.cateringAllocation],
  )

  const onUpdateImmediate = useCallback(
    async (id: string, patch: Partial<Guest>) => {
      const prevGuests = guests
      const prevSummary = summary
      const updated = guests.map((g) => (g.id === id ? { ...g, ...patch } : g))
      setGuests(updated)
      setSummary(recalculateSummary(updated))

      try {
        await api.plans.updateGuest(plan.id, id, patch)
      } catch {
        setGuests(prevGuests)
        setSummary(prevSummary)
        toast('Failed to update guest. Changes reverted.')
      }
    },
    [guests, plan.id, recalculateSummary, summary, toast],
  )

  const onUpdateText = useCallback(
    (id: string, patch: Partial<Guest>) => {
      const prevGuests = guests
      const prevSummary = summary
      const updated = guests.map((g) => (g.id === id ? { ...g, ...patch } : g))
      setGuests(updated)
      setSummary(recalculateSummary(updated))

      if (debounceTimers.current[id]) {
        window.clearTimeout(debounceTimers.current[id])
      }

      debounceTimers.current[id] = window.setTimeout(async () => {
        try {
          await api.plans.updateGuest(plan.id, id, patch)
        } catch {
          setGuests(prevGuests)
          setSummary(prevSummary)
          toast('Failed to update guest. Changes reverted.')
        }
      }, 400)
    },
    [guests, plan.id, recalculateSummary, summary, toast],
  )

  const delGuest = useCallback(
    async (id: string) => {
      const prevGuests = guests
      const prevSummary = summary
      const updated = guests.filter((g) => g.id !== id)
      setGuests(updated)
      setSummary(recalculateSummary(updated))

      try {
        await api.plans.deleteGuest(plan.id, id)
        toast('Guest removed')
      } catch {
        setGuests(prevGuests)
        setSummary(prevSummary)
        toast('Failed to delete guest. Changes reverted.')
      }
    },
    [guests, plan.id, recalculateSummary, summary, toast],
  )

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || adding) return
    setAdding(true)
    try {
      const res = await api.plans.addGuest(plan.id, {
        name: newName.trim(),
        party: newParty,
        status: newStatus,
        dietary: newDietary,
        notes: newNotes.trim() || undefined,
      })
      const updated = [res.guest, ...guests]
      setGuests(updated)
      setSummary(recalculateSummary(updated))
      setNewName('')
      setNewParty(1)
      setNewStatus('pending')
      setNewDietary('none')
      setNewNotes('')
      toast(`Added ${res.guest.name}`)
    } catch {
      toast('Failed to add guest')
    } finally {
      setAdding(false)
    }
  }

  const handleImport = async () => {
    if (!importText.trim() || importing) return
    setImporting(true)
    try {
      const res = await api.plans.importGuests(plan.id, importText)
      const updated = [...res.guests, ...guests]
      setGuests(updated)
      setSummary(recalculateSummary(updated))
      setShowImportModal(false)
      setImportText('')
      toast(`Imported ${res.count} guests`)
    } catch (e: unknown) {
      toast((e as { message?: string })?.message || 'Failed to import guests')
    } finally {
      setImporting(false)
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showImportModal && !importing) {
        setShowImportModal(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showImportModal, importing])

  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      if (statusFilter !== 'all' && g.status !== statusFilter) return false
      if (dietaryFilter !== 'all' && g.dietary !== dietaryFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = g.name.toLowerCase().includes(q)
        const matchNotes = (g.notes || '').toLowerCase().includes(q)
        if (!matchName && !matchNotes) return false
      }
      return true
    })
  }, [guests, statusFilter, dietaryFilter, search])

  const importLineCount = importText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean).length

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 280 }} role="status" aria-label="Loading guests">
        <LoopingLotus />
        <p style={{ marginTop: 12, color: 'var(--muted)', fontSize: 14 }}>Loading guest list & RSVP records...</p>
      </div>
    )
  }

  const confirmedCount = summary?.confirmedHeadcount ?? 0
  const plannedCapacity = plan.brief.guests
  const overCapacity = confirmedCount > plannedCapacity

  return (
    <div className="guests-wrap">
      {/* Headcount Warning Banner */}
      {overCapacity && (
        <div className="guest-alert-banner" role="alert" aria-live="polite">
          <AlertTriangle size={20} style={{ color: '#b91c1c', flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Headcount Alert: Capacity Exceeded</strong>
            <p>
              Your confirmed guest count ({confirmedCount}) exceeds your planned venue capacity of {plannedCapacity} by{' '}
              {confirmedCount - plannedCapacity} {confirmedCount - plannedCapacity === 1 ? 'attendee' : 'attendees'}.
              Check your seating plan and catering buffers.
            </p>
          </div>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="stat-row">
        <Stat
          label="Confirmed Headcount"
          value={`${confirmedCount}`}
          pct={plannedCapacity ? (confirmedCount / plannedCapacity) * 100 : 0}
          sub={`${summary?.countsByStatus.attending ?? 0} parties attending (target: ${plannedCapacity})`}
        />
        <Stat label="Pending RSVPs" value={`${summary?.countsByStatus.pending ?? 0}`} pct={0} sub="awaiting response" />
        <Stat label="Declined" value={`${summary?.countsByStatus.declined ?? 0}`} pct={0} sub="unable to attend" />
        <Stat
          label="Catering / Head"
          value={
            summary?.costPerHead !== null && summary?.costPerHead !== undefined ? money(summary.costPerHead, cur) : '—'
          }
          pct={0}
          sub={
            summary?.costPerHead !== null && summary?.costPerHead !== undefined
              ? `from ${compactMoney(summary.cateringAllocation, cur)} catering`
              : 'requires confirmed attendees'
          }
        />
      </div>

      {/* Dietary Summary Chips */}
      {summary &&
        (summary.countsByDietary.veg > 0 ||
          summary.countsByDietary.vegan > 0 ||
          summary.countsByDietary.jain > 0 ||
          summary.countsByDietary.halal > 0 ||
          summary.countsByDietary.other > 0) && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 8,
              margin: '14px 0 20px',
              padding: '10px 16px',
              background: 'rgba(255,255,255,0.7)',
              borderRadius: 14,
              border: '1px solid var(--line)',
            }}
          >
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--gold-deep)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Dietary Preferences:
            </span>
            {summary.countsByDietary.veg > 0 && (
              <span className="mb-chip" style={{ padding: '4px 10px', fontSize: 12 }}>
                {summary.countsByDietary.veg} Vegetarian
              </span>
            )}
            {summary.countsByDietary.vegan > 0 && (
              <span className="mb-chip" style={{ padding: '4px 10px', fontSize: 12 }}>
                {summary.countsByDietary.vegan} Vegan
              </span>
            )}
            {summary.countsByDietary.jain > 0 && (
              <span className="mb-chip" style={{ padding: '4px 10px', fontSize: 12 }}>
                {summary.countsByDietary.jain} Jain
              </span>
            )}
            {summary.countsByDietary.halal > 0 && (
              <span className="mb-chip" style={{ padding: '4px 10px', fontSize: 12 }}>
                {summary.countsByDietary.halal} Halal
              </span>
            )}
            {summary.countsByDietary.other > 0 && (
              <span className="mb-chip" style={{ padding: '4px 10px', fontSize: 12 }}>
                {summary.countsByDietary.other} Other / Special
              </span>
            )}
          </div>
        )}

      {/* Add Guest Form */}
      <div className="add-guest-card">
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20, marginBottom: 12, color: 'var(--ink)' }}>
          Add New Guest
        </h3>
        <form className="add-guest-form" onSubmit={handleAdd}>
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

      {/* Toolbar: Search, Filters & Bulk Import Button */}
      <div className="guests-toolbar">
        <div className="guests-filters">
          <div className="guest-search-wrap">
            <Search size={15} />
            <input
              className="guest-search-input"
              placeholder="Search by name or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search guests"
            />
          </div>

          <select
            className="guest-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | GuestStatus)}
            aria-label="Filter by RSVP status"
          >
            <option value="all">All RSVP Statuses</option>
            <option value="attending">Attending ({summary?.countsByStatus.attending ?? 0})</option>
            <option value="pending">Pending ({summary?.countsByStatus.pending ?? 0})</option>
            <option value="declined">Declined ({summary?.countsByStatus.declined ?? 0})</option>
          </select>

          <select
            className="guest-select"
            value={dietaryFilter}
            onChange={(e) => setDietaryFilter(e.target.value as 'all' | DietaryOption)}
            aria-label="Filter by dietary requirement"
          >
            <option value="all">All Dietary Types</option>
            <option value="none">Standard / None</option>
            <option value="veg">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="jain">Jain</option>
            <option value="halal">Halal</option>
            <option value="other">Other</option>
          </select>
        </div>

        <button
          className="btn"
          onClick={() => setShowImportModal(true)}
          style={{ background: 'rgba(255,255,255,0.9)', padding: '8px 16px', fontSize: 13 }}
          aria-label="Open bulk paste import modal"
        >
          <Upload size={14} /> <span>Bulk Paste Import</span>
        </button>
      </div>

      {/* Guests Table */}
      <div className="guests-table-card">
        {filteredGuests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted)' }}>
            <Users size={36} style={{ color: 'var(--gold)', margin: '0 auto 12px', opacity: 0.7 }} />
            <p style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>
              {guests.length === 0 ? 'No guests added yet' : 'No guests match your filters'}
            </p>
            <p style={{ fontSize: 13.5 }}>
              {guests.length === 0
                ? 'Add attendees one by one above or paste a list with Bulk Import.'
                : 'Try clearing your search query or changing your filters.'}
            </p>
          </div>
        ) : (
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
                {filteredGuests.map((g) => (
                  <GuestTableRow
                    key={g.id}
                    g={g}
                    onUpdateImmediate={onUpdateImmediate}
                    onUpdateText={onUpdateText}
                    onDelete={delGuest}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="auth-overlay" onClick={() => setShowImportModal(false)} role="presentation">
            <motion.div
              className="auth-card"
              style={{ maxWidth: 520, width: '92%' }}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="import-modal-title"
            >
              <button className="auth-close" onClick={() => setShowImportModal(false)} aria-label="Close import dialog">
                <X size={20} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div
                  style={{
                    padding: 10,
                    borderRadius: '50%',
                    background: 'rgba(212,175,55,0.15)',
                    color: 'var(--gold-deep)',
                  }}
                >
                  <Upload size={22} />
                </div>
                <div>
                  <h3 id="import-modal-title" style={{ fontFamily: 'var(--serif)', fontSize: 26, margin: 0 }}>
                    Bulk Paste Guest List
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: '2px 0 0' }}>
                    Paste guest or party names below, one per line (up to 500).
                  </p>
                </div>
              </div>

              <textarea
                className="moodboard-input"
                style={{
                  width: '100%',
                  minHeight: 180,
                  borderRadius: 14,
                  fontFamily: 'monospace',
                  fontSize: 13,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  marginBottom: 14,
                }}
                placeholder={`Aarav & Priya Sharma\nVikram Malhotra\nSunita Sen\nDevendra Rajput\nAnanya Verma...`}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                disabled={importing}
                aria-label="Pasted guest names, one per line"
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {importLineCount > 0
                    ? `${importLineCount} guest ${importLineCount === 1 ? 'name' : 'names'} detected`
                    : 'Waiting for pasted names...'}
                </span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn"
                    onClick={() => setShowImportModal(false)}
                    disabled={importing}
                    style={{ background: 'transparent' }}
                  >
                    Cancel
                  </button>
                  <button className="btn btn-gold" onClick={handleImport} disabled={importing || importLineCount === 0}>
                    {importing ? 'Importing...' : `Import ${importLineCount || ''} Guests`}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
