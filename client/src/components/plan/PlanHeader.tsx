import { CalendarDays, Download, LayoutDashboard, MapPin, Plus, Printer, Share2, Users } from 'lucide-react'
import type { Plan } from '@soiree/shared'
import { fmtDate } from '../../lib/utils'
import { api } from '../../lib/api'

interface Props {
  plan: Plan
  onNew: () => void
  onBackToDashboard: () => void
  openShareModal: () => void
  toast: (m: string) => void
}

export function PlanHeader({ plan, onNew, onBackToDashboard, openShareModal, toast }: Props) {
  const b = plan.brief
  const daysLeft = Math.max(0, Math.ceil((new Date(b.date + 'T00:00:00').getTime() - Date.now()) / 86400000))
  const typeLabel = { wedding: 'Wedding', birthday: 'Birthday', community: 'Community event' }[b.type]

  return (
    <div className="plan-head">
      <div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onBackToDashboard}
            style={{ padding: '4px 8px', fontSize: 12 }}
          >
            <LayoutDashboard size={13} /> All plans
          </button>
          <span className="badge">{typeLabel}</span>
          <span className={`badge ${plan.generatedBy === 'local' ? 'local' : ''}`}>
            {plan.generatedBy === 'gemini' ? 'Gemini AI' : 'Smart planner'}
          </span>
        </div>

        <h2 style={{ marginTop: 10 }}>{b.title || `Your ${typeLabel.toLowerCase()}`}</h2>
        <div className="plan-meta">
          <span className="meta">
            <CalendarDays size={15} />
            {fmtDate(new Date(b.date + 'T00:00:00'))} · {daysLeft} days to go
          </span>
          <span className="meta">
            <Users size={15} />
            {b.guests} guests
          </span>
          {b.city && (
            <span className="meta">
              <MapPin size={15} />
              {b.city}
            </span>
          )}
        </div>
      </div>
      <div className="plan-actions">
        <button className="btn btn-secondary btn-sm" onClick={openShareModal} style={{ gap: 6 }}>
          <Share2 size={15} /> Share
        </button>
        <a
          className="btn btn-ghost btn-sm"
          href={api.plans.getIcsUrl(plan.id)}
          download={`soiree-${plan.id}.ics`}
          onClick={() => toast('Calendar downloaded')}
        >
          <Download size={15} /> Calendar (.ics)
        </a>
        <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
          <Printer size={15} /> Print
        </button>
        <button className="btn btn-primary btn-sm" onClick={onNew}>
          <Plus size={15} /> New plan
        </button>
      </div>
    </div>
  )
}
