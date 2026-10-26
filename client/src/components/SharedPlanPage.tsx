import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import type { PublicPlanView } from '@soiree/shared'
import { api } from '../lib/api'
import { LoopingLotus } from './Vectors'
import { VectorScene } from './VectorScene'
import { SharedPlanHeader } from './shared/SharedPlanHeader'
import { SharedMoodboardSection } from './shared/SharedMoodboardSection'
import {
  SharedFooterCta,
  SharedIdeasSection,
  SharedTimelineSection,
  SharedVendorsSection,
} from './shared/SharedPlanSections'

interface Props {
  token: string
  onStartPlanning: () => void
  onGoHome: () => void
}

/**
 * Public read-only celebration plan overview for invited guests and collaborators.
 */
export default function SharedPlanPage({ token, onStartPlanning, onGoHome }: Props) {
  const [plan, setPlan] = useState<PublicPlanView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null
    const created = !meta
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'robots'
      document.head.appendChild(meta)
    }
    meta.content = 'noindex, nofollow'

    return () => {
      if (created && meta && meta.parentNode) {
        meta.parentNode.removeChild(meta)
      } else if (meta) {
        meta.content = 'index, follow'
      }
    }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    api.public
      .getPlan(token)
      .then((res) => {
        if (active) {
          setPlan(res.plan)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err?.message || 'Plan not found or link has been revoked.')
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [token])

  if (loading) {
    return (
      <div className="planner" style={{ display: 'grid', placeItems: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <LoopingLotus size={160} />
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 32, marginTop: 24, color: 'var(--plum)' }}>
            Loading Celebration Plan…
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: 15 }}>
            Fetching shared event timeline, vendors, and aesthetic styling.
          </p>
        </div>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="planner" style={{ display: 'grid', placeItems: 'center', minHeight: '80vh' }}>
        <div className="panel" style={{ maxWidth: 540, textAlign: 'center', padding: '60px 32px' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: 18,
              borderRadius: '50%',
              background: 'rgba(212,175,55,0.12)',
              color: 'var(--gold-deep)',
              marginBottom: 20,
            }}
          >
            <CalendarDays size={40} />
          </div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 36, marginBottom: 12, color: 'var(--plum)' }}>
            Plan Not Found
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 1.5, marginBottom: 32 }}>
            This celebration link is private, has been revoked by the host, or does not exist.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={onGoHome}>
              Return to Home
            </button>
            <button className="btn btn-primary" onClick={onStartPlanning}>
              Start Planning An Event
            </button>
          </div>
        </div>
      </div>
    )
  }

  const typeLabel =
    { wedding: 'Wedding', birthday: 'Birthday', community: 'Community Event' }[plan.eventType] || 'Celebration'

  return (
    <div className="planner">
      <div className="planner-bg" aria-hidden="true">
        <VectorScene />
      </div>

      <div className="wrap" style={{ maxWidth: 1040, margin: '0 auto', paddingInline: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <button className="btn btn-ghost btn-sm" onClick={onGoHome} style={{ gap: 6, fontSize: 13 }}>
            ← Back to Soirée
          </button>
          <span className="badge" style={{ background: 'rgba(212,175,55,0.15)', color: 'var(--gold-deep)' }}>
            Read-Only Guest View
          </span>
        </div>

        <SharedPlanHeader plan={plan} typeLabel={typeLabel} />

        {plan.moodboard && <SharedMoodboardSection moodboard={plan.moodboard} />}

        <SharedTimelineSection timeline={plan.timeline} />

        <SharedVendorsSection vendors={plan.vendors} />

        <SharedIdeasSection ideas={plan.ideas} />

        <SharedFooterCta onStartPlanning={onStartPlanning} />
      </div>
    </div>
  )
}
