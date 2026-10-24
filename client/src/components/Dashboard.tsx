import { motion } from 'framer-motion'
import { CalendarDays, MapPin, Plus, Sparkles, Trash2, Users, ArrowRight } from 'lucide-react'
import type { PlanSummary } from '@soiree/shared'
import { compactMoney, fmtDate } from '../lib/utils'
import { LoopingLotus } from './Vectors'

interface Props {
  plans: PlanSummary[]
  loading: boolean
  onOpen: (planId: string) => void
  onDelete: (planId: string) => void
  onNew: () => void
}

export default function Dashboard({ plans, loading, onOpen, onDelete, onNew }: Props) {
  const typeLabel: Record<string, string> = {
    wedding: 'Wedding',
    birthday: 'Birthday',
    community: 'Community event',
  }

  return (
    <div className="dashboard-view">
      <div className="plan-head" style={{ marginBottom: 32 }}>
        <div>
          <span className="badge" style={{ marginBottom: 8 }}>My Celebrations</span>
          <h2 style={{ marginTop: 6, fontSize: 38 }}>Your Event Portfolio</h2>
          <p style={{ color: 'var(--muted)', marginTop: 4 }}>
            Manage your bespoke timelines, vendor shortlists, and orchestrated budgets.
          </p>
        </div>
        <div className="plan-actions">
          <button className="btn btn-primary" onClick={onNew}>
            <Plus size={16} /> New Plan
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 220, padding: '40px 0' }} role="status" aria-label="Retrieving celebrations">
          <LoopingLotus />
          <p style={{ color: 'var(--muted)', marginTop: 14, fontSize: 14 }}>Retrieving your celebrations…</p>
        </div>
      ) : plans.length === 0 ? (
        <motion.div
          className="panel"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: '64px 24px' }}
        >
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(197, 160, 89, 0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#c5a059', marginBottom: 18 }}>
            <Sparkles size={32} />
          </div>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 32, marginBottom: 8 }}>No celebrations planned yet</h3>
          <p style={{ color: 'var(--muted)', maxWidth: 440, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Draft your first bespoke event timeline, vendor shortlist, and AI-balanced budget in minutes.
          </p>
          <button className="btn btn-primary" onClick={onNew}>
            <Plus size={16} /> Begin Planning
          </button>
        </motion.div>
      ) : (
        <div className="vendor-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {plans.map((p, idx) => {
            const daysLeft = Math.max(0, Math.ceil((new Date(p.date + 'T00:00:00').getTime() - Date.now()) / 86400000))
            return (
              <motion.div
                key={p.id}
                className="panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: 24,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
                onClick={() => onOpen(p.id)}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className="badge">{typeLabel[p.type] || p.type}</span>
                      <span className={`badge ${p.generatedBy === 'local' ? 'local' : ''}`}>
                        {p.generatedBy === 'gemini' ? 'Gemini AI' : 'Smart Planner'}
                      </span>
                    </div>
                    <button
                      className="link-btn"
                      title="Delete celebration"
                      aria-label={`Delete ${p.title}`}
                      style={{ color: 'var(--muted)', padding: 4 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Are you sure you want to delete "${p.title || 'this plan'}"?`)) {
                          onDelete(p.id)
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <h3 style={{ fontFamily: 'var(--serif)', fontSize: 24, marginBottom: 8, lineHeight: 1.2 }}>
                    {p.title || `Bespoke ${typeLabel[p.type] || 'Event'}`}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CalendarDays size={14} /> {fmtDate(new Date(p.date + 'T00:00:00'))} · {daysLeft} days to go
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} /> {p.guests} guests · {compactMoney(p.budget, p.currency)} budget
                    </span>
                    {p.city && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={14} /> {p.city}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--text)', opacity: 0.8, lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.summary}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#c5a059', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Open plan <ArrowRight size={14} />
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
