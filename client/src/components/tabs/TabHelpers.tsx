import { Check } from 'lucide-react'
import type { Plan } from '@soiree/shared'
import { addDays, fmtDate, todayISO } from '../../lib/utils'

const dueDate = (plan: Plan, weeksBefore: number) => addDays(plan.brief.date, -Math.round(weeksBefore * 7))

export function Stat({ label, value, sub, pct }: { label: string; value: string; sub: string; pct: number }) {
  return (
    <div className="stat">
      <small>{label}</small>
      <b>{value}</b>
      <small style={{ textTransform: 'none', letterSpacing: 0 }}>{sub}</small>
      {pct > 0 && (
        <div className="bar">
          <i style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}
    </div>
  )
}

export function MilestoneRow({ plan, id, onToggle }: { plan: Plan; id: string; onToggle: (id: string) => void }) {
  const m = plan.timeline.find((x) => x.id === id)
  if (!m) return null
  const due = dueDate(plan, m.weeksBefore)
  const late = !m.done && due.toISOString().slice(0, 10) < todayISO()
  return (
    <div className={`milestone ${m.done ? 'done' : ''}`}>
      <span className="node">{m.done && <Check size={11} />}</span>
      <button
        className={`check ${m.done ? 'on' : ''}`}
        aria-label={m.done ? 'Mark as not done' : 'Mark as done'}
        aria-pressed={m.done}
        onClick={() => onToggle(id)}
      >
        {m.done && <Check size={14} />}
      </button>
      <div className="m-body">
        <div className="m-title">{m.label}</div>
        <div className="m-detail">{m.detail}</div>
      </div>
      <div className="m-when">
        <b>{fmtDate(due)}</b>
        {late ? <span className="late">Overdue</span> : m.weeksBefore === 0 ? 'Event week' : `${m.weeksBefore} wks before`}
      </div>
    </div>
  )
}
