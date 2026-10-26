import { CalendarDays, MapPin } from 'lucide-react'
import type { PublicPlanView } from '@soiree/shared'
import { fmtDate } from '../../lib/utils'

interface Props {
  plan: PublicPlanView
  typeLabel: string
}

/**
 * Hero header presentation for public shared celebration plans.
 */
export function SharedPlanHeader({ plan, typeLabel }: Props) {
  return (
    <div className="panel" style={{ marginBottom: 26, padding: 'clamp(28px, 4vw, 44px)' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <span className="badge">{typeLabel}</span>
        <span className="badge local">Planned with Soirée</span>
      </div>

      <h1
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(38px, 5.5vw, 64px)',
          margin: '0 0 16px',
          color: 'var(--plum)',
        }}
      >
        {plan.title || `${typeLabel} Celebration`}
      </h1>

      <div className="plan-meta" style={{ marginBottom: 22 }}>
        <span className="meta">
          <CalendarDays size={15} />
          {fmtDate(new Date(plan.date + 'T00:00:00'))}
        </span>
        {plan.city && (
          <span className="meta">
            <MapPin size={15} />
            {plan.city}
          </span>
        )}
      </div>

      <p className="summary" style={{ margin: 0, fontSize: 'clamp(18px, 2vw, 22px)' }}>
        {plan.summary}
      </p>
    </div>
  )
}
