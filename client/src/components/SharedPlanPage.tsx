import { useEffect, useState } from 'react'
import { CalendarDays, Check, Copy, MapPin, Music, Sparkles, Type } from 'lucide-react'
import type { PublicPlanView } from '@soiree/shared'
import { api } from '../lib/api'
import { fmtDate } from '../lib/utils'
import { LoopingLotus } from './Vectors'
import { VectorScene } from './VectorScene'

interface Props {
  token: string
  onStartPlanning: () => void
  onGoHome: () => void
}

export default function SharedPlanPage({ token, onStartPlanning, onGoHome }: Props) {
  const [plan, setPlan] = useState<PublicPlanView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedHex, setCopiedHex] = useState<string | null>(null)

  // Enforce noindex meta tag for search engines on public shared page
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

  const copyHex = (hex: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(hex).catch(() => {})
    }
    setCopiedHex(hex)
    setTimeout(() => setCopiedHex(null), 2000)
  }

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
        {/* Brand bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <button className="btn btn-ghost btn-sm" onClick={onGoHome} style={{ gap: 6, fontSize: 13 }}>
            ← Back to Soirée
          </button>
          <span className="badge" style={{ background: 'rgba(212,175,55,0.15)', color: 'var(--gold-deep)' }}>
            Read-Only Guest View
          </span>
        </div>

        {/* Hero Plan Header Panel */}
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

        {/* Aesthetic Moodboard Section (if available) */}
        {plan.moodboard && (
          <div className="panel" style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <Sparkles size={20} style={{ color: 'var(--gold-deep)' }} />
              <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, margin: 0 }}>Color Palette & Moodboard</h2>
            </div>

            <div className="swatches-grid" style={{ marginBottom: 24 }}>
              {plan.moodboard.palette.map((color, idx) => (
                <div
                  key={idx}
                  className="swatch-card"
                  onClick={() => copyHex(color.hex)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Copy hex ${color.hex}`}
                >
                  <div className="swatch-color" style={{ backgroundColor: color.hex }}>
                    <span className="swatch-copy-hint">
                      <Copy size={11} /> {copiedHex === color.hex ? 'Copied!' : 'Copy Hex'}
                    </span>
                  </div>
                  <div className="swatch-meta">
                    <span className="swatch-role">{color.role}</span>
                    <span className="swatch-name">{color.name}</span>
                    <span className="swatch-hex">
                      <code>{color.hex.toUpperCase()}</code>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="moodboard-bento">
              <div className="mb-card">
                <div className="mb-card-title">
                  <Type size={16} /> Typography & Calligraphy
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div>
                    <small style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase' }}>
                      Heading Font
                    </small>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--plum)' }}>
                      {plan.moodboard.typography.heading}
                    </div>
                  </div>
                  <div>
                    <small style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase' }}>Body Font</small>
                    <div style={{ fontSize: 15 }}>{plan.moodboard.typography.body}</div>
                  </div>
                  <div style={{ fontStyle: 'italic', fontSize: 13, color: 'var(--muted)' }}>
                    “{plan.moodboard.typography.vibe}”
                  </div>
                </div>
              </div>

              <div className="mb-card">
                <div className="mb-card-title">
                  <Sparkles size={16} /> Signature Motifs
                </div>
                <div className="mb-chips">
                  {plan.moodboard.motifs.map((motif, i) => (
                    <span key={i} className="mb-chip">
                      ✦ {motif}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-card">
                <div className="mb-card-title">
                  <Sparkles size={16} /> Decor Accents
                </div>
                <ul className="mb-list">
                  {plan.moodboard.decor.map((item, i) => (
                    <li key={i}>
                      <span style={{ color: 'var(--gold)' }}>✦</span> {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-card">
                <div className="mb-card-title">
                  <Music size={16} /> Musical Atmosphere
                </div>
                <div className="mb-chips">
                  {plan.moodboard.playlistVibes.map((item, i) => (
                    <span key={i} className="mb-chip">
                      ♫ {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Section */}
        <div className="panel" style={{ marginBottom: 26 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, marginBottom: 18 }}>Milestone Timeline</h2>
          <div className="timeline">
            {plan.timeline.map((m) => (
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

        {/* Vendors Section (Categories & Status Only - No Budget Amounts) */}
        <div className="panel" style={{ marginBottom: 26 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, marginBottom: 18 }}>Vendor Categories & Status</h2>
          <div className="vendor-grid">
            {plan.vendors.map((v, i) => (
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

        {/* Ideas Section */}
        {plan.ideas && plan.ideas.length > 0 && (
          <div className="panel" style={{ marginBottom: 36 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, marginBottom: 18 }}>Creative Concepts & Ideas</h2>
            <div className="idea-grid">
              {plan.ideas.map((g, i) => (
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
        )}

        {/* Footer CTA Banner: "Planned with Soirée" */}
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
            Transform your wedding, milestone birthday, or community gathering into an impeccably orchestrated
            celebration with intelligent planning and bespoke aesthetics.
          </p>
          <button
            className="btn btn-primary"
            onClick={onStartPlanning}
            style={{ padding: '14px 28px', fontSize: 15, gap: 8 }}
          >
            Start Planning Your Celebration ✨
          </button>
        </div>
      </div>
    </div>
  )
}
