import { AlertTriangle } from 'lucide-react'
import type { Currency, GuestSummary } from '@soiree/shared'
import { compactMoney, money } from '../../lib/utils'
import { Stat } from '../tabs/TabHelpers'

interface Props {
  summary: GuestSummary | null
  plannedCapacity: number
  cur: Currency
}

const DIETARY_LABELS = [
  { key: 'veg', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'jain', label: 'Jain' },
  { key: 'halal', label: 'Halal' },
  { key: 'other', label: 'Other / Special' },
] as const

function DietarySummary({ counts }: { counts: GuestSummary['countsByDietary'] }) {
  const active = DIETARY_LABELS.filter((item) => counts[item.key] > 0)
  if (active.length === 0) return null

  return (
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
      {active.map((item) => (
        <span key={item.key} className="mb-chip" style={{ padding: '4px 10px', fontSize: 12 }}>
          {counts[item.key]} {item.label}
        </span>
      ))}
    </div>
  )
}

function getStatValues(summary: GuestSummary | null, cur: Currency) {
  if (!summary) {
    return {
      confirmed: 0,
      attending: 0,
      pending: 0,
      declined: 0,
      cateringVal: '—',
      cateringSub: 'requires confirmed attendees',
    }
  }
  const hasCost = summary.costPerHead !== null && summary.costPerHead !== undefined
  const costVal = summary.costPerHead
  return {
    confirmed: summary.confirmedHeadcount,
    attending: summary.countsByStatus.attending,
    pending: summary.countsByStatus.pending,
    declined: summary.countsByStatus.declined,
    cateringVal: hasCost && costVal !== null && costVal !== undefined ? money(costVal, cur) : '—',
    cateringSub: hasCost
      ? `from ${compactMoney(summary.cateringAllocation, cur)} catering`
      : 'requires confirmed attendees',
  }
}

/**
 * Guest headcount metrics, RSVP ratios, catering allocation, and dietary breakdown.
 */
export function GuestStats({ summary, plannedCapacity, cur }: Props) {
  const stats = getStatValues(summary, cur)
  const overCapacity = stats.confirmed > plannedCapacity

  return (
    <>
      {overCapacity && (
        <div className="guest-alert-banner" role="alert" aria-live="polite">
          <AlertTriangle size={20} style={{ color: '#b91c1c', flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Headcount Alert: Capacity Exceeded</strong>
            <p>
              Your confirmed guest count ({stats.confirmed}) exceeds your planned venue capacity of {plannedCapacity} by{' '}
              {stats.confirmed - plannedCapacity} {stats.confirmed - plannedCapacity === 1 ? 'attendee' : 'attendees'}.
              Check your seating plan and catering buffers.
            </p>
          </div>
        </div>
      )}

      <div className="stat-row">
        <Stat
          label="Confirmed Headcount"
          value={`${stats.confirmed}`}
          pct={plannedCapacity > 0 ? (stats.confirmed / plannedCapacity) * 100 : 0}
          sub={`${stats.attending} parties attending (target: ${plannedCapacity})`}
        />
        <Stat label="Pending RSVPs" value={`${stats.pending}`} pct={0} sub="awaiting response" />
        <Stat label="Declined" value={`${stats.declined}`} pct={0} sub="unable to attend" />
        <Stat label="Catering / Head" value={stats.cateringVal} pct={0} sub={stats.cateringSub} />
      </div>

      {summary && <DietarySummary counts={summary.countsByDietary} />}
    </>
  )
}
