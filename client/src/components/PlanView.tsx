import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarDays, Copy, Download, LayoutDashboard, LayoutGrid, MapPin, MessageCircleHeart,
  Palette, PiggyBank, Plus, Printer, Share2, ShieldCheck, Store, Users, X, Lightbulb,
} from 'lucide-react'
import React, { Suspense, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { compactMoney, fmtDate, money } from '../lib/utils'
import type { Plan } from '@soiree/shared'
import { DonutChart } from './common'
import { LoopingLotus } from './Vectors'
import { MilestoneRow, Stat } from './tabs/TabHelpers'

const BudgetTab = React.lazy(() => import('./tabs/BudgetTab'))
const VendorsTab = React.lazy(() => import('./tabs/VendorsTab'))
const GuestsTab = React.lazy(() => import('./tabs/GuestsTab'))
const IdeasTab = React.lazy(() => import('./tabs/IdeasTab'))
const MoodboardTab = React.lazy(() => import('./tabs/MoodboardTab'))
const AskTab = React.lazy(() => import('./tabs/AskTab'))

type Tab = 'overview' | 'budget' | 'timeline' | 'vendors' | 'guests' | 'ideas' | 'moodboard' | 'ask'

const TABS: Array<{ id: Tab; label: string; icon: typeof PiggyBank }> = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'budget', label: 'Budget', icon: PiggyBank },
  { id: 'timeline', label: 'Timeline', icon: CalendarDays },
  { id: 'vendors', label: 'Vendors', icon: Store },
  { id: 'guests', label: 'Guests', icon: Users },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb },
  { id: 'moodboard', label: 'Moodboard', icon: Palette },
  { id: 'ask', label: 'Ask Soirée', icon: MessageCircleHeart },
]

interface Props {
  plan: Plan
  setPlan: (fn: (p: Plan) => Plan) => void
  onNew: () => void
  onBackToDashboard: () => void
  toast: (m: string) => void
}

export function PlanView({ plan, setPlan, onNew, onBackToDashboard, toast }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const b = plan.brief
  const cur = b.currency
  const totalAlloc = plan.budget.reduce((s, x) => s + x.allocated, 0)
  const totalSpent = plan.budget.reduce((s, x) => s + x.spent, 0)
  const done = plan.timeline.filter((t) => t.done).length
  const booked = plan.vendors.filter((v) => v.status === 'booked').length
  const daysLeft = Math.max(0, Math.ceil((new Date(b.date + 'T00:00:00').getTime() - Date.now()) / 86400000))
  const typeLabel = { wedding: 'Wedding', birthday: 'Birthday', community: 'Community event' }[b.type]

  const [showShareModal, setShowShareModal] = useState(false)
  const [shareData, setShareData] = useState<{ shareToken: string | null; shareEnabled: boolean } | null>(null)
  const [busyShare, setBusyShare] = useState(false)

  const openShareModal = async () => {
    setShowShareModal(true)
    setBusyShare(true)
    try {
      const res = await api.plans.getShare(plan.id)
      setShareData(res)
    } catch {
      setShareData({ shareToken: null, shareEnabled: false })
    } finally {
      setBusyShare(false)
    }
  }

  const toggleShareEnabled = async () => {
    setBusyShare(true)
    try {
      if (shareData?.shareEnabled) {
        await api.plans.revokeShare(plan.id)
        setShareData((s) => (s ? { ...s, shareEnabled: false } : { shareToken: null, shareEnabled: false }))
        toast('Share link revoked')
      } else {
        const res = await api.plans.enableShare(plan.id)
        setShareData(res)
        toast('Shareable public link enabled!')
      }
    } catch {
      toast('Failed to update share link settings')
    } finally {
      setBusyShare(false)
    }
  }

  const copyShareLink = () => {
    if (!shareData?.shareToken) return
    const url = `${window.location.origin}/#/share/${shareData.shareToken}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {})
    }
    toast('Share link copied to clipboard!')
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showShareModal) {
        setShowShareModal(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showShareModal])

  // Optimistic milestone toggle
  const toggleMilestone = async (id: string) => {
    const m = plan.timeline.find((x) => x.id === id)
    if (!m) return
    const nextDone = !m.done

    setPlan((p) => ({
      ...p,
      timeline: p.timeline.map((t) => (t.id === id ? { ...t, done: nextDone } : t)),
    }))

    try {
      await api.plans.updateMilestone(plan.id, id, nextDone)
    } catch {
      // Rollback
      setPlan((p) => ({
        ...p,
        timeline: p.timeline.map((t) => (t.id === id ? { ...t, done: m.done } : t)),
      }))
      toast('Failed to update milestone on server')
    }
  }

  // Optimistic & debounced budget editing
  const budgetTimers = useRef<Record<string, number>>({})
  const editBudget = (id: string, key: 'allocated' | 'spent', value: number) => {
    const item = plan.budget.find((x) => x.id === id)
    if (!item) return
    const prevVal = item[key]
    const nextVal = Math.max(0, value || 0)

    setPlan((p) => ({
      ...p,
      budget: p.budget.map((x) => (x.id === id ? { ...x, [key]: nextVal } : x)),
    }))

    if (budgetTimers.current[id]) {
      window.clearTimeout(budgetTimers.current[id])
    }

    budgetTimers.current[id] = window.setTimeout(async () => {
      try {
        await api.plans.updateBudget(plan.id, id, { [key]: nextVal })
      } catch {
        setPlan((p) => ({
          ...p,
          budget: p.budget.map((x) => (x.id === id ? { ...x, [key]: prevVal } : x)),
        }))
        toast(`Failed to save budget edit for ${item.category}`)
      }
    }, 450)
  }

  return (
    <div>
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

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? 'on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {tab === t.id && (
              <motion.span layoutId="tabpill" className="pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
            )}
            <t.icon size={15} /> <span>{t.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
        >
          {tab === 'overview' && (
            <>
              <p className="summary">{plan.summary}</p>
              <div className="stat-row">
                <Stat label="Budget" value={compactMoney(b.budget, cur)} pct={(totalSpent / b.budget) * 100} sub={`${money(totalSpent, cur)} spent`} />
                <Stat label="Milestones" value={`${done}/${plan.timeline.length}`} pct={(done / plan.timeline.length) * 100} sub="tasks complete" />
                <Stat label="Vendors" value={`${booked}/${plan.vendors.length}`} pct={(booked / plan.vendors.length) * 100} sub="booked" />
                <Stat label="Per guest" value={compactMoney(b.guests ? b.budget / b.guests : 0, cur)} pct={0} sub="budget per head" />
              </div>
              <div className="budget-layout">
                <DonutChart data={plan.budget.map((x) => ({ label: x.category, value: x.allocated }))} centerLabel="Allocated" centerValue={compactMoney(totalAlloc, cur)} />
                <div>
                  <h3 style={{ fontFamily: 'var(--serif)', fontSize: 30, marginBottom: 14 }}>Up next</h3>
                  <div className="timeline">
                    {plan.timeline.filter((t) => !t.done).slice(0, 3).map((m) => (
                      <MilestoneRow key={m.id} plan={plan} id={m.id} onToggle={toggleMilestone} />
                    ))}
                    {plan.timeline.every((t) => t.done) && <p className="m-detail">Everything is done. Enjoy your celebration! 🎉</p>}
                  </div>
                </div>
              </div>
            </>
          )}

          <Suspense
            fallback={
              <div style={{ display: 'grid', placeItems: 'center', minHeight: 240, padding: 30 }} role="status" aria-label="Loading section">
                <LoopingLotus size={120} />
              </div>
            }
          >
            {tab === 'budget' && (
              <BudgetTab
                plan={plan}
                setPlan={setPlan}
                totalAlloc={totalAlloc}
                totalSpent={totalSpent}
                onEdit={editBudget}
                toast={toast}
              />
            )}

            {tab === 'timeline' && (
              <div className="timeline">
                {plan.timeline.map((m) => (
                  <MilestoneRow key={m.id} plan={plan} id={m.id} onToggle={toggleMilestone} />
                ))}
              </div>
            )}

            {tab === 'vendors' && <VendorsTab plan={plan} setPlan={setPlan} toast={toast} />}

            {tab === 'guests' && <GuestsTab plan={plan} toast={toast} />}

            {tab === 'ideas' && <IdeasTab plan={plan} setPlan={setPlan} toast={toast} />}

            {tab === 'moodboard' && <MoodboardTab plan={plan} toast={toast} />}

            {tab === 'ask' && <AskTab plan={plan} />}
          </Suspense>
        </motion.div>
      </AnimatePresence>

      {/* Shareable Link Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div
            className="auth-overlay"
            onClick={() => setShowShareModal(false)}
            role="presentation"
          >
            <motion.div
              className="auth-card"
              style={{ maxWidth: 520, width: '92%' }}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="share-modal-title"
            >
              <button
                className="auth-close"
                onClick={() => setShowShareModal(false)}
                aria-label="Close share dialog"
              >
                <X size={20} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ padding: 10, borderRadius: '50%', background: 'rgba(212,175,55,0.15)', color: 'var(--gold-deep)' }}>
                  <Share2 size={22} />
                </div>
                <h3 id="share-modal-title" style={{ fontFamily: 'var(--serif)', fontSize: 28, margin: 0 }}>
                  Share Celebration Plan
                </h3>
              </div>

              <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 18px', lineHeight: 1.45 }}>
                Generate an elegant, read-only link to share with loved ones, co-hosts, or vendors.
              </p>

              {/* What is visible vs confidential */}
              <div style={{ background: 'rgba(247,239,229,0.7)', border: '1px solid rgba(196,160,90,0.25)', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--gold-deep)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  <ShieldCheck size={16} /> Privacy & Visibility Notice
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
                  <li>
                    <b>Visible to viewers:</b> Title, event date, city, celebration overview, milestone timeline, vendor category statuses, creative ideas, and aesthetic moodboard.
                  </li>
                  <li style={{ marginTop: 4 }}>
                    <b>Confidential (Hidden):</b> Exact budget allocations, spend tracking, confidential notes, chat history, and account email.
                  </li>
                </ul>
              </div>

              {/* Link Controls */}
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 14, background: '#fff', border: '1px solid var(--line)' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 14, display: 'block' }}>Public Link Access</span>
                    <small style={{ color: 'var(--muted)', fontSize: 12 }}>
                      {shareData?.shareEnabled ? 'Link is active and accessible' : 'Link is currently revoked and inactive'}
                    </small>
                  </div>
                  <button
                    className={`btn btn-sm ${shareData?.shareEnabled ? 'btn-ghost' : 'btn-primary'}`}
                    onClick={toggleShareEnabled}
                    disabled={busyShare}
                    style={{ minWidth: 100 }}
                  >
                    {shareData?.shareEnabled ? 'Revoke link' : 'Enable link'}
                  </button>
                </div>

                {shareData?.shareEnabled && shareData.shareToken && (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <label style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 600 }}>
                      Shareable URL
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        readOnly
                        className="input"
                        value={`${window.location.origin}/#/share/${shareData.shareToken}`}
                        style={{ fontSize: 13, padding: '10px 14px' }}
                      />
                      <button className="btn btn-secondary" onClick={copyShareLink} style={{ gap: 6, whiteSpace: 'nowrap' }}>
                        <Copy size={15} /> Copy
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      <a
                        href={`/#/share/${shareData.shareToken}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12.5, color: 'var(--gold-deep)', textDecoration: 'underline' }}
                      >
                        Preview public view ↗
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
