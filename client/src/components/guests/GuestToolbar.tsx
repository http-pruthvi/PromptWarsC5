import { Search, Upload } from 'lucide-react'
import type { DietaryOption, GuestStatus, GuestSummary } from '@soiree/shared'

interface Props {
  search: string
  setSearch: (s: string) => void
  statusFilter: 'all' | GuestStatus
  setStatusFilter: (s: 'all' | GuestStatus) => void
  dietaryFilter: 'all' | DietaryOption
  setDietaryFilter: (d: 'all' | DietaryOption) => void
  summary: GuestSummary | null
  onOpenImport: () => void
}

/**
 * Filter toolbar with real-time text query and status/dietary dropdown selects.
 */
export function GuestToolbar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  dietaryFilter,
  setDietaryFilter,
  summary,
  onOpenImport,
}: Props) {
  return (
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
        onClick={onOpenImport}
        style={{ background: 'rgba(255,255,255,0.9)', padding: '8px 16px', fontSize: 13 }}
        aria-label="Open bulk paste import modal"
      >
        <Upload size={14} /> <span>Bulk Paste Import</span>
      </button>
    </div>
  )
}
