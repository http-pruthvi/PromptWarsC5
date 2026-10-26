import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DietaryOption, Guest, GuestStatus, GuestSummary, Plan } from '@soiree/shared'
import { api } from '../../lib/api'
import { LoopingLotus } from '../Vectors'
import { GuestTable } from '../guests/GuestTable'
import { GuestStats } from '../guests/GuestStats'
import { GuestAddForm } from '../guests/GuestAddForm'
import { GuestToolbar } from '../guests/GuestToolbar'
import { GuestImportModal } from '../guests/GuestImportModal'

interface Props {
  plan: Plan
  toast: (m: string) => void
}

/**
 * GuestsTab orchestrates guest headcount tracking, RSVP management, dietary filtering, and catering ratios.
 */
export default function GuestsTab({ plan, toast }: Props) {
  const [guests, setGuests] = useState<Guest[]>([])
  const [summary, setSummary] = useState<GuestSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | GuestStatus>('all')
  const [dietaryFilter, setDietaryFilter] = useState<'all' | DietaryOption>('all')
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
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

  const handleAdd = async (guestData: {
    name: string
    party: number
    status: GuestStatus
    dietary: DietaryOption
    notes?: string | undefined
  }) => {
    setAdding(true)
    try {
      const res = await api.plans.addGuest(plan.id, guestData)
      const updated = [res.guest, ...guests]
      setGuests(updated)
      setSummary(recalculateSummary(updated))
      toast(`Added ${res.guest.name}`)
    } catch {
      toast('Failed to add guest')
    } finally {
      setAdding(false)
    }
  }

  const handleImport = async (text: string) => {
    setImporting(true)
    try {
      const res = await api.plans.importGuests(plan.id, text)
      const updated = [...res.guests, ...guests]
      setGuests(updated)
      setSummary(recalculateSummary(updated))
      setShowImportModal(false)
      toast(`Imported ${res.count} guests`)
    } catch (e: unknown) {
      toast((e as { message?: string })?.message || 'Failed to import guests')
    } finally {
      setImporting(false)
    }
  }

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

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 280 }} role="status" aria-label="Loading guests">
        <LoopingLotus />
        <p style={{ marginTop: 12, color: 'var(--muted)', fontSize: 14 }}>Loading guest list & RSVP records...</p>
      </div>
    )
  }

  return (
    <div className="guests-wrap">
      <GuestStats summary={summary} plannedCapacity={plan.brief.guests} cur={cur} />
      <GuestAddForm adding={adding} onAdd={handleAdd} />
      <GuestToolbar
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        dietaryFilter={dietaryFilter}
        setDietaryFilter={setDietaryFilter}
        summary={summary}
        onOpenImport={() => setShowImportModal(true)}
      />

      <GuestTable
        guests={filteredGuests}
        totalGuestsCount={guests.length}
        onUpdateImmediate={onUpdateImmediate}
        onUpdateText={onUpdateText}
        onDelete={delGuest}
      />

      <GuestImportModal
        show={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        importing={importing}
      />
    </div>
  )
}
