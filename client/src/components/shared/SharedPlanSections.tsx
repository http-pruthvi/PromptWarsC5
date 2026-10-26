import { Check } from 'lucide-react'
import type { PublicPlanView } from '@soiree/shared'

interface TimelineProps {
  timeline: PublicPlanView['timeline']
}

/**
 * Public timeline view without private financial data.
 */
export function SharedTimelineSection({ timeline }: TimelineProps) {
  return (
    <div className="panel" style={{ marginBottom: 26 }}>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, marginBottom: 18 }}>Milestone Timeline</h2>
      <div className="timeline">
        {timeline.map((m) => (
          <div key={m.id} className={`milestone ${m.done ? 'done' : ''}`}>
            <span className="node">{m.done && <Check size={11} />}</span>
            <div className="m-body">
              <div className="m-title">{m.label}</div>
              <div className="m-detail">{m.detail}</div>
            </div>
            <div className="m-when">
              {m.done ? (
                <span style={{ color: 'var(--gold-deep)', fontWeight: 600 }}>Completed</span>
              ) : (
                <span>{m.weeksBefore === 0 ? 'Event week' : `${m.weeksBefore} wks before`}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface VendorsProps {
  vendors: PublicPlanView['vendors']
}

/**
 * Vendor categories and booking status (redacts costs/estimates).
 */
export function SharedVendorsSection({ vendors }: VendorsProps) {
  return (
    <div className="panel" style={{ marginBottom: 26 }}>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, marginBottom: 18 }}>Vendor Categories & Status</h2>
      <div className="vendor-grid">
        {vendors.map((v, i) => (
          <div key={i} className="vendor" style={{ padding: 18 }}>
            <div className="vendor-top">
              <h3 style={{ fontSize: 20 }}>{v.category}</h3>
              <span className={`status ${v.status}`}>
                {v.status === 'booked' ? 'Booked' : v.status === 'contacted' ? 'Contacted' : 'To Contact'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface IdeasProps {
  ideas?: PublicPlanView['ideas']
}

/**
 * Creative celebration concepts and curated bullet lists.
 */
export function SharedIdeasSection({ ideas }: IdeasProps) {
  if (!ideas || ideas.length === 0) return null

  return (
    <div className="panel" style={{ marginBottom: 36 }}>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, marginBottom: 18 }}>Creative Concepts & Ideas</h2>
      <div className="idea-grid">
        {ideas.map((g, i) => (
          <div key={i} className="idea">
            <h3 style={{ fontSize: 22 }}>{g.title}</h3>
            <ul className="bullets" style={{ margin: 0, gap: 10 }}>
              {g.items.map((item, j) => (
                <li key={j} style={{ fontSize: 14 }}>
                  <span style={{ color: 'var(--gold)' }}>✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

interface FooterCtaProps {
  onStartPlanning: () => void
}

/**
 * Public promotion footer call to action banner.
 */
export function SharedFooterCta({ onStartPlanning }: FooterCtaProps) {
  return (
    <div
      className="panel"
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95), rgba(247,239,229,0.75))',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(28px, 3.5vw, 42px)',
          marginBottom: 12,
          color: 'var(--plum)',
        }}
      >
        Planned with Soirée
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: 16, maxWidth: 500, margin: '0 auto 24px' }}>
        Transform your wedding, milestone birthday, or community gathering into an impeccably orchestrated celebration
        with intelligent planning and bespoke aesthetics.
      </p>
      <button
        className="btn btn-primary"
        onClick={onStartPlanning}
        style={{ padding: '14px 28px', fontSize: 15, gap: 8 }}
      >
        Start Planning Your Celebration ✨
      </button>
    </div>
  )
}
