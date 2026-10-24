import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, CalendarDays, Check, Copy, Download, LayoutDashboard, Lightbulb, LayoutGrid, MapPin, MessageCircleHeart, Music,
  Palette, PiggyBank, Plus, Printer, RefreshCw, Search, Send, Share2, ShieldCheck, Shuffle, Sparkle, Sparkles, Store, Trash2, Type, Upload, UserPlus, Users, Wand2, X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { addDays, compactMoney, fmtDate, money, todayISO } from '../lib/utils'
import type { BudgetRebalanceProposal, ChatMessage, DietaryOption, Guest, GuestStatus, GuestSummary, Moodboard, Plan, Vendor, VendorStatus } from '@soiree/shared'
import { DonutChart, PALETTE } from './common'
import { LoopingLotus } from './Vectors'

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

const dueDate = (plan: Plan, weeksBefore: number) => addDays(plan.brief.date, -Math.round(weeksBefore * 7))

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
            <span className="meta"><CalendarDays size={15} />{fmtDate(new Date(b.date + 'T00:00:00'))} · {daysLeft} days to go</span>
            <span className="meta"><Users size={15} />{b.guests} guests</span>
            {b.city && <span className="meta"><MapPin size={15} />{b.city}</span>}
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
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><Printer size={15} /> Print</button>
          <button className="btn btn-primary btn-sm" onClick={onNew}><Plus size={15} /> New plan</button>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
            {tab === t.id && <motion.span layoutId="tabpill" className="pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
            <t.icon size={15} /> <span>{t.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
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

          {tab === 'vendors' && (
            <VendorsTab plan={plan} setPlan={setPlan} toast={toast} />
          )}

          {tab === 'guests' && (
            <GuestsTab plan={plan} toast={toast} />
          )}

          {tab === 'ideas' && (
            <IdeasTab plan={plan} setPlan={setPlan} toast={toast} />
          )}

          {tab === 'moodboard' && (
            <MoodboardTab plan={plan} toast={toast} />
          )}

          {tab === 'ask' && (
            <AskTab plan={plan} />
          )}
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
                  <li><b>Visible to viewers:</b> Title, event date, city, celebration overview, milestone timeline, vendor category statuses, creative ideas, and aesthetic moodboard.</li>
                  <li style={{ marginTop: 4 }}><b>Confidential (Hidden):</b> Exact budget allocations, spend tracking, confidential notes, chat history, and account email.</li>
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

function Stat({ label, value, sub, pct }: { label: string; value: string; sub: string; pct: number }) {
  return (
    <div className="stat">
      <small>{label}</small>
      <b>{value}</b>
      <small style={{ textTransform: 'none', letterSpacing: 0 }}>{sub}</small>
      {pct > 0 && <div className="bar"><i style={{ width: `${Math.min(100, pct)}%` }} /></div>}
    </div>
  )
}

function MilestoneRow({ plan, id, onToggle }: { plan: Plan; id: string; onToggle: (id: string) => void }) {
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

function BudgetTab({
  plan,
  setPlan,
  totalAlloc,
  totalSpent,
  onEdit,
  toast,
}: {
  plan: Plan
  setPlan: Props['setPlan']
  totalAlloc: number
  totalSpent: number
  onEdit: (id: string, key: 'allocated' | 'spent', v: number) => void
  toast: Props['toast']
}) {
  const b = plan.brief
  const cur = b.currency
  const diff = b.budget - totalAlloc
  const remaining = b.budget - totalSpent
  const isOver90Percent = totalSpent > 0.9 * b.budget

  const [showRebalanceModal, setShowRebalanceModal] = useState(false)
  const [proposal, setProposal] = useState<BudgetRebalanceProposal | null>(null)
  const [loadingProposal, setLoadingProposal] = useState(false)
  const [applying, setApplying] = useState(false)

  const handleOpenRebalance = async () => {
    setShowRebalanceModal(true)
    setLoadingProposal(true)
    try {
      const res = await api.plans.rebalanceBudget(plan.id)
      setProposal(res.proposal)
    } catch {
      toast('Failed to generate rebalancing proposal')
      setShowRebalanceModal(false)
    } finally {
      setLoadingProposal(false)
    }
  }

  const handleApplyRebalance = async () => {
    if (!proposal || applying) return
    setApplying(true)
    try {
      const changesToApply = proposal.changes.map((c) => ({ itemId: c.itemId, to: c.to }))
      const res = await api.plans.applyRebalance(plan.id, changesToApply)
      setPlan((p) => ({
        ...p,
        budget: res.budget,
      }))
      toast('Budget allocations updated successfully')
      setShowRebalanceModal(false)
    } catch {
      toast('Failed to apply budget rebalancing')
    } finally {
      setApplying(false)
    }
  }

  return (
    <>
      {/* Sticky Alert Banner when Total Spent exceeds 90% */}
      {isOver90Percent && (
        <div className="budget-sticky-alert" role="alert" aria-live="polite">
          <AlertTriangle size={22} style={{ color: '#b91c1c', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>Budget Alert: {Math.round((totalSpent / b.budget) * 100)}% of total funds utilized</strong>
            <p>
              You have spent {money(totalSpent, cur)} of your {money(b.budget, cur)} total plan budget.
              Only {money(remaining, cur)} remains available. Use AI Budget Rebalancing to redistribute funds safely.
            </p>
          </div>
          <button
            className="btn btn-gold"
            onClick={handleOpenRebalance}
            style={{ padding: '8px 16px', fontSize: 13, whiteSpace: 'nowrap' }}
          >
            <Sparkles size={14} /> <span>Rebalance with AI</span>
          </button>
        </div>
      )}

      <div className="stat-row">
        <Stat
          label="Total budget"
          value={money(b.budget, cur)}
          sub={diff === 0 ? 'Fully allocated' : diff > 0 ? `${money(diff, cur)} unallocated` : `${money(-diff, cur)} over-allocated`}
          pct={(totalAlloc / b.budget) * 100}
        />
        <Stat
          label="Spent"
          value={money(totalSpent, cur)}
          sub={`${Math.round((totalSpent / b.budget) * 100)}% of budget`}
          pct={(totalSpent / b.budget) * 100}
        />
        <Stat
          label="Remaining"
          value={money(remaining, cur)}
          sub={remaining < 0 ? 'Over budget!' : 'still available'}
          pct={0}
        />
      </div>

      <div className="budget-layout">
        <DonutChart data={plan.budget.map((x) => ({ label: x.category, value: x.allocated }))} centerLabel="Allocated" centerValue={compactMoney(totalAlloc, cur)} />
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ fontFamily: 'var(--serif)', fontSize: 24, margin: 0 }}>Category Breakdown</h4>
            <button
              className="btn btn-gold"
              onClick={handleOpenRebalance}
              style={{ padding: '8px 16px', fontSize: 13 }}
              aria-label="Rebalance budget with AI"
            >
              <Sparkles size={14} /> <span>Rebalance with AI</span>
            </button>
          </div>

          <div className="table">
            <div className="row row-head"><span /><span>Category</span><span style={{ textAlign: 'right' }}>Allocated</span><span style={{ textAlign: 'right' }}>Spent</span></div>
            {plan.budget.map((x, i) => {
              const over = x.spent > x.allocated
              const overAmount = x.spent - x.allocated
              return (
                <div className={`row ${over ? 'row-overspent' : ''}`} key={x.id}>
                  <span className="swatch" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <div className="name">
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                      <b>{x.category}</b>
                      {over && (
                        <span className="overspend-badge" title="Category expenditures exceed allocated funds">
                          <AlertTriangle size={11} /> Over by {money(overAmount, cur)}
                        </span>
                      )}
                    </div>
                    <small>{x.note}</small>
                    <div className={`bar ${over ? 'overspent' : ''}`} style={{ marginTop: 8 }}>
                      <i style={{ width: `${x.allocated ? Math.min(100, (x.spent / x.allocated) * 100) : 100}%` }} />
                    </div>
                  </div>
                  <input
                    className="num"
                    type="number"
                    min={0}
                    aria-label={`${x.category} allocated`}
                    value={x.allocated}
                    onChange={(e) => onEdit(x.id, 'allocated', Number(e.target.value))}
                  />
                  <input
                    className="num"
                    type="number"
                    min={0}
                    aria-label={`${x.category} spent`}
                    value={x.spent}
                    onChange={(e) => onEdit(x.id, 'spent', Number(e.target.value))}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* AI Budget Rebalance Preview Modal */}
      <AnimatePresence>
        {showRebalanceModal && (
          <div
            className="auth-overlay"
            onClick={() => !applying && setShowRebalanceModal(false)}
            role="presentation"
          >
            <motion.div
              className="auth-card"
              style={{ maxWidth: 660, width: '94%', maxHeight: '90vh', overflowY: 'auto' }}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="rebalance-modal-title"
            >
              <button
                className="auth-close"
                onClick={() => !applying && setShowRebalanceModal(false)}
                aria-label="Close rebalance dialog"
              >
                <X size={20} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ padding: 10, borderRadius: '50%', background: 'rgba(212,175,55,0.15)', color: 'var(--gold-deep)' }}>
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 id="rebalance-modal-title" style={{ fontFamily: 'var(--serif)', fontSize: 26, margin: 0 }}>
                    AI Budget Rebalancer Proposal
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: '2px 0 0' }}>
                    Proposal to absorb deficits while protecting your contingency reserve.
                  </p>
                </div>
              </div>

              {loadingProposal ? (
                <div style={{ display: 'grid', placeItems: 'center', minHeight: 220, padding: 20 }}>
                  <LoopingLotus />
                  <p style={{ marginTop: 12, color: 'var(--muted)', fontSize: 14 }}>
                    Analyzing expenditures & calculating optimal headroom redistribution...
                  </p>
                </div>
              ) : proposal ? (
                <>
                  <div style={{ background: 'rgba(247,239,229,0.7)', padding: '12px 16px', borderRadius: 14, border: '1px solid var(--line)', marginBottom: 16 }}>
                    <p style={{ fontSize: 13.5, fontStyle: 'italic', color: 'var(--ink)', margin: 0, lineHeight: 1.5 }}>
                      "{proposal.summary}"
                    </p>
                  </div>

                  <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                    <table className="rebalance-table" aria-label="Proposed budget redistributions">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th style={{ textAlign: 'right' }}>Current</th>
                          <th style={{ textAlign: 'right' }}>Proposed</th>
                          <th style={{ textAlign: 'right' }}>Adjustment</th>
                          <th style={{ minWidth: 200 }}>Rationale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposal.changes.map((c) => {
                          const diff = c.to - c.from
                          return (
                            <tr key={c.itemId}>
                              <td style={{ fontWeight: 600 }}>{c.category}</td>
                              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{money(c.from, cur)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{money(c.to, cur)}</td>
                              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                {diff > 0 && <span className="diff-up">+{money(diff, cur)}</span>}
                                {diff < 0 && <span className="diff-down">{money(diff, cur)}</span>}
                                {diff === 0 && <span className="diff-same">0</span>}
                              </td>
                              <td style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{c.reason}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button
                      className="btn"
                      onClick={() => setShowRebalanceModal(false)}
                      disabled={applying}
                      style={{ background: 'transparent' }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-gold"
                      onClick={handleApplyRebalance}
                      disabled={applying}
                    >
                      {applying ? 'Applying Changes...' : 'Apply Rebalance'}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <p>Failed to generate rebalancing proposal.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

const STATUS_NEXT: Record<VendorStatus, VendorStatus> = { todo: 'contacted', contacted: 'booked', booked: 'todo' }
const STATUS_LABEL: Record<VendorStatus, string> = { todo: 'To contact', contacted: 'Contacted', booked: 'Booked ✓' }

function VendorsTab({ plan, setPlan, toast }: { plan: Plan; setPlan: Props['setPlan']; toast: Props['toast'] }) {
  const [cat, setCat] = useState('')
  const [busy, setBusy] = useState(false)
  const cur = plan.brief.currency

  const upd = async (id: string, patch: Partial<Vendor>) => {
    const orig = plan.vendors.find((v) => v.id === id)
    if (!orig) return

    setPlan((p) => ({
      ...p,
      vendors: p.vendors.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    }))

    try {
      await api.plans.updateVendor(plan.id, id, patch)
    } catch {
      setPlan((p) => ({
        ...p,
        vendors: p.vendors.map((v) => (v.id === id ? orig : v)),
      }))
      toast('Failed to save vendor update')
    }
  }

  const remove = async (id: string) => {
    const orig = plan.vendors.find((v) => v.id === id)
    if (!orig) return

    setPlan((p) => ({
      ...p,
      vendors: p.vendors.filter((v) => v.id !== id),
    }))

    try {
      await api.plans.deleteVendor(plan.id, id)
      toast('Vendor removed')
    } catch {
      setPlan((p) => ({ ...p, vendors: [...p.vendors, orig] }))
      toast('Failed to delete vendor')
    }
  }

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cat.trim() || busy) return
    setBusy(true)
    try {
      const res = await api.plans.addVendor(plan.id, { category: cat.trim() })
      setPlan((p) => ({ ...p, vendors: [...p.vendors, res.vendor] }))
      setCat('')
      toast(`Added ${res.vendor.category}`)
    } catch {
      toast('Failed to add vendor')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="vendor-grid">
        {plan.vendors.map((v) => (
          <motion.div layout className="vendor" key={v.id}>
            <div className="vendor-top">
              <h4>{v.category}</h4>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  className={`status ${v.status}`}
                  onClick={() => upd(v.id, { status: STATUS_NEXT[v.status] })}
                  title="Click to toggle status"
                >
                  {STATUS_LABEL[v.status]}
                </button>
                <button
                  className="link-btn"
                  aria-label={`Remove ${v.category}`}
                  onClick={() => remove(v.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <input
              className="input"
              placeholder="Vendor name / contact"
              aria-label={`${v.category} vendor name`}
              value={v.name}
              onChange={(e) => upd(v.id, { name: e.target.value })}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <small style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>Estimate ({cur})</small>
              <input
                className="num"
                type="number"
                min={0}
                aria-label={`${v.category} estimate`}
                value={v.estimate}
                onChange={(e) => upd(v.id, { estimate: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
            {v.tips && <div className="tip"><Lightbulb size={15} /><span>{v.tips}</span></div>}
          </motion.div>
        ))}
      </div>
      <form className="vendor-add" onSubmit={add}>
        <input
          className="input"
          placeholder="Add another vendor category (e.g. Pandit, Live Band, Valet)"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          aria-label="New vendor category"
          disabled={busy}
        />
        <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !cat.trim()}>
          <Plus size={15} /> {busy ? 'Adding…' : 'Add vendor'}
        </button>
      </form>
    </>
  )
}

function IdeasTab({ plan, setPlan, toast }: { plan: Plan; setPlan: Props['setPlan']; toast: Props['toast'] }) {
  const [busy, setBusy] = useState(false)
  const [extra, setExtra] = useState('')

  const run = async () => {
    setBusy(true)
    try {
      const res = await api.plans.regenerateIdeas(plan.id, extra)
      setPlan((p) => ({ ...p, ideas: res.ideas }))
      toast(res.ai ? 'Fresh ideas generated by Gemini' : 'Ideas refreshed')
    } catch {
      toast('Failed to refresh ideas')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <form className="ideas-bar" onSubmit={(e) => { e.preventDefault(); void run() }}>
        <input
          className="input"
          aria-label="Ideas direction"
          placeholder="Steer the ideas: “more sustainable”, “for kids”, “budget-friendly”, “royal palace look”…"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          disabled={busy}
        />
        <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
          {busy ? <Shuffle size={15} /> : <Wand2 size={15} />}
          {busy ? 'Thinking…' : 'Regenerate ideas'}
        </button>
      </form>
      <div className="idea-grid">
        {plan.ideas.map((g, i) => (
          <motion.div className="idea" key={g.title + i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <h4><Lightbulb size={20} />{g.title}</h4>
            <ul>{g.items.map((it) => <li key={it}>{it}</li>)}</ul>
          </motion.div>
        ))}
      </div>
    </>
  )
}

function AskTab({ plan }: { plan: Plan }) {
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    { role: 'assistant', text: `Hi! I'm Soirée. I can see your budget, timeline and vendors for ${plan.brief.title || 'your event'}. What would you like help with?` },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  // Load chat history from backend on mount
  useEffect(() => {
    let active = true
    api.plans.getChat(plan.id).then((res) => {
      if (active && res.messages && res.messages.length > 0) {
        setMsgs(res.messages)
      }
    }).catch(() => {
      // Keep default initial greeting
    })
    return () => { active = false }
  }, [plan.id])

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [msgs, busy])

  const send = async (q: string) => {
    if (!q.trim() || busy) return
    const text = q.trim()
    setInput('')
    setBusy(true)

    // Optimistically show user message
    setMsgs((m) => [...m, { role: 'user', text }])

    try {
      const res = await api.plans.sendChat(plan.id, text)
      setMsgs((m) => [...m, res.reply])
    } catch {
      setMsgs((m) => [
        ...m,
        { role: 'assistant', text: 'Sorry, I encountered an issue retrieving an answer. Please try again.' },
      ])
    } finally {
      setBusy(false)
    }
  }

  const suggestions = [
    'How can I save money?',
    'What should I do next?',
    'Which vendors should I book first?',
    'Give me a unique theme idea',
  ]

  return (
    <div className="panel chat" style={{ padding: 22 }}>
      <div className="messages" aria-live="polite">
        {msgs.map((m, i) => <div key={i} className={`msg ${m.role}`}>{m.text}</div>)}
        {busy && <div className="msg assistant"><span className="typing"><i /><i /><i /></span></div>}
        <div ref={end} />
      </div>
      <div>
        <div className="suggest">
          {suggestions.map((s) => (
            <button key={s} className="chip" onClick={() => void send(s)} disabled={busy}>{s}</button>
          ))}
        </div>
        <form className="chat-input" onSubmit={(e) => { e.preventDefault(); void send(input) }}>
          <input
            className="input"
            aria-label="Ask Soirée"
            placeholder="Ask anything about your budget, vendors or timeline…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button className="btn btn-primary" type="submit" disabled={busy || !input.trim()} aria-label="Send">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}

function MoodboardTab({ plan, toast }: { plan: Plan; toast: (m: string) => void }) {
  const [data, setData] = useState<{ moodboard: Moodboard; generatedBy: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [extra, setExtra] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    api.plans
      .getMoodboard(plan.id)
      .then((res) => {
        if (active) {
          setData(res)
          setLoading(false)
        }
      })
      .catch((err: any) => {
        if (active) {
          if (err?.status === 404) {
            setData(null)
          } else {
            setError(err?.message || 'Failed to load moodboard')
          }
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [plan.id])

  const handleGenerate = async (steeringPrompt?: string) => {
    setGenerating(true)
    setError(null)
    try {
      const res = await api.plans.generateMoodboard(plan.id, steeringPrompt)
      setData(res)
      toast(steeringPrompt ? 'Moodboard regenerated with your vision!' : 'Moodboard generated successfully!')
    } catch (err: any) {
      setError(err?.message || 'Failed to generate moodboard. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const copyHex = (hex: string, name: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(hex).catch(() => {})
    }
    toast(`Copied ${hex} (${name}) to clipboard!`)
  }

  if (loading || generating) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: '70px 20px' }}>
        <LoopingLotus size={160} />
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 32, marginTop: 24, marginBottom: 8, color: 'var(--plum)' }}>
          {generating ? 'Composing Visual Moodboard & Color Story…' : 'Loading Bespoke Palette…'}
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: 15, maxWidth: 460, margin: '0 auto' }}>
          Harmonizing editorial color pigments, tactile decor accents, typography pairings, and celebration motifs.
        </p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: '70px 24px' }}>
        <div style={{ display: 'inline-flex', padding: 20, borderRadius: '50%', background: 'rgba(212,175,55,0.12)', color: 'var(--gold-deep)', marginBottom: 18 }}>
          <Palette size={44} />
        </div>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 36, marginBottom: 10, color: 'var(--plum)' }}>
          No Moodboard Generated Yet
        </h3>
        <p style={{ color: 'var(--muted)', maxWidth: 520, margin: '0 auto 28px', fontSize: 16, lineHeight: 1.5 }}>
          Explore an editorial 5-color palette, typography pairings, decor textures, and attire inspirations tailored to your {plan.brief.type} celebration.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => void handleGenerate()}
          style={{ gap: 10, padding: '14px 28px', fontSize: 15 }}
        >
          <Wand2 size={18} /> Generate Moodboard
        </button>
      </div>
    )
  }

  const mb = data.moodboard

  return (
    <div className="moodboard-wrap">
      <div className="moodboard-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h3>Color Story & Aesthetic Moodboard</h3>
            <span className={`badge ${data.generatedBy === 'offline' ? 'local' : ''}`}>
              {data.generatedBy === 'gemini' ? 'AI Crafted' : 'Procedural Harmony'}
            </span>
          </div>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: 14 }}>
            Click any color tile to copy its hex code directly to your clipboard.
          </p>
        </div>

        <form
          className="moodboard-controls"
          onSubmit={(e) => {
            e.preventDefault()
            void handleGenerate(extra)
          }}
        >
          <input
            className="moodboard-input"
            aria-label="Steer moodboard vision"
            placeholder="Steer vision (e.g. 'More jewel tones', 'Sunset warmth')…"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
          />
          <button className="btn btn-secondary" type="submit" style={{ gap: 8 }}>
            <RefreshCw size={14} /> Regenerate
          </button>
        </form>
      </div>

      {error && (
        <div style={{ padding: '12px 18px', background: '#fdf2f2', border: '1px solid #f8d7da', color: '#842029', borderRadius: 12, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Palette Swatches */}
      <div>
        <div className="swatches-grid">
          {mb.palette.map((color, idx) => (
            <motion.div
              key={color.hex + idx}
              className="swatch-card"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.4 }}
              onClick={() => copyHex(color.hex, color.name)}
              role="button"
              tabIndex={0}
              aria-label={`Copy hex code for ${color.name}: ${color.hex}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  copyHex(color.hex, color.name)
                }
              }}
            >
              <div className="swatch-color" style={{ backgroundColor: color.hex }}>
                <span className="swatch-copy-hint">
                  <Copy size={11} /> Copy Hex
                </span>
              </div>
              <div className="swatch-meta">
                <span className="swatch-role">{color.role}</span>
                <span className="swatch-name" title={color.name}>{color.name}</span>
                <span className="swatch-hex">
                  <code>{color.hex.toUpperCase()}</code>
                  <Copy size={10} style={{ opacity: 0.6 }} />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bento Grid: Typography, Motifs, Decor, Outfits, Music */}
      <div className="moodboard-bento">
        {/* Typography Card */}
        <div className="mb-card">
          <div className="mb-card-title">
            <Type size={16} /> Typography & Calligraphy Pairing
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(247,239,229,.6)', border: '1px solid rgba(196,160,90,.2)' }}>
              <small style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                Headline Typeface
              </small>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--plum)', fontWeight: 600 }}>
                {mb.typography.heading}
              </div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(247,239,229,.6)', border: '1px solid rgba(196,160,90,.2)' }}>
              <small style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                Body & Detail Typeface
              </small>
              <div style={{ fontSize: 16, color: 'var(--ink)', fontWeight: 500 }}>
                {mb.typography.body}
              </div>
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', fontStyle: 'italic', paddingLeft: 4 }}>
              Vibe: “{mb.typography.vibe}”
            </div>
          </div>
        </div>

        {/* Motifs Card */}
        <div className="mb-card">
          <div className="mb-card-title">
            <Sparkles size={16} /> Signature Motifs & Symbols
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
            Visual emblems and repeating patterns for stationery, signage, and backdrop arches:
          </p>
          <div className="mb-chips">
            {mb.motifs.map((motif, i) => (
              <span key={i} className="mb-chip">
                <Sparkle size={12} style={{ color: 'var(--gold)' }} />
                {motif}
              </span>
            ))}
          </div>
        </div>

        {/* Decor Styling Card */}
        <div className="mb-card">
          <div className="mb-card-title">
            <Sparkles size={16} /> Decor & Spatial Textures
          </div>
          <ul className="mb-list">
            {mb.decor.map((item, i) => (
              <li key={i}>
                <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>✦</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Outfit & Attire Styling Card */}
        <div className="mb-card">
          <div className="mb-card-title">
            <Sparkles size={16} /> Attire, Textiles & Jewelry
          </div>
          <ul className="mb-list">
            {mb.outfitNotes.map((item, i) => (
              <li key={i}>
                <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>✦</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Musical Mood / Playlist Card */}
        <div className="mb-card" style={{ gridColumn: '1 / -1' }}>
          <div className="mb-card-title">
            <Music size={16} /> Soundscape & Playlist Atmospheres
          </div>
          <div className="mb-chips">
            {mb.playlistVibes.map((vib, i) => (
              <span key={i} className="mb-chip" style={{ background: 'rgba(255,255,255,0.85)', padding: '9px 16px', fontSize: 13.5 }}>
                <Music size={13} style={{ color: 'var(--gold-deep)' }} />
                {vib}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function GuestsTab({ plan, toast }: { plan: Plan; toast: Props['toast'] }) {
  const [guests, setGuests] = useState<Guest[]>([])
  const [summary, setSummary] = useState<GuestSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | GuestStatus>('all')
  const [dietaryFilter, setDietaryFilter] = useState<'all' | DietaryOption>('all')
  const [showImportModal, setShowImportModal] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)

  // Add guest form
  const [newName, setNewName] = useState('')
  const [newParty, setNewParty] = useState(1)
  const [newStatus, setNewStatus] = useState<GuestStatus>('pending')
  const [newDietary, setNewDietary] = useState<DietaryOption>('none')
  const [newNotes, setNewNotes] = useState('')
  const [adding, setAdding] = useState(false)

  const cur = plan.brief.currency

  const loadData = async () => {
    try {
      const [gRes, sRes] = await Promise.all([
        api.plans.listGuests(plan.id),
        api.plans.getGuestSummary(plan.id),
      ])
      setGuests(gRes.guests)
      setSummary(sRes.summary)
    } catch {
      toast('Failed to load guests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [plan.id])

  const recalculateSummary = (list: Guest[]): GuestSummary => {
    const countsByStatus = { pending: 0, attending: 0, declined: 0 }
    const countsByDietary = { none: 0, veg: 0, vegan: 0, jain: 0, halal: 0, other: 0 }
    let confirmedHeadcount = 0

    for (const g of list) {
      if (countsByStatus[g.status] !== undefined) countsByStatus[g.status]++
      if (countsByDietary[g.dietary] !== undefined) countsByDietary[g.dietary]++
      if (g.status === 'attending') confirmedHeadcount += g.party
    }

    const cateringAlloc = summary?.cateringAllocation ?? 0
    const costPerHead = confirmedHeadcount > 0 ? Math.round(cateringAlloc / confirmedHeadcount) : null

    return {
      totalGuests: list.length,
      confirmedHeadcount,
      countsByStatus,
      countsByDietary,
      cateringAllocation: cateringAlloc,
      costPerHead,
    }
  }

  const updGuest = async (id: string, patch: Partial<Guest>) => {
    const prevGuests = guests
    const prevSummary = summary
    const updated = guests.map((g) => (g.id === id ? { ...g, ...patch } : g))
    setGuests(updated)
    setSummary(recalculateSummary(updated))

    try {
      await api.plans.updateGuest(plan.id, id, patch)
    } catch {
      setGuests(prevGuests)
      setSummary(prevSummary)
      toast('Failed to update guest. Changes reverted.')
    }
  }

  const delGuest = async (id: string) => {
    const prevGuests = guests
    const prevSummary = summary
    const updated = guests.filter((g) => g.id !== id)
    setGuests(updated)
    setSummary(recalculateSummary(updated))

    try {
      await api.plans.deleteGuest(plan.id, id)
      toast('Guest removed')
    } catch {
      setGuests(prevGuests)
      setSummary(prevSummary)
      toast('Failed to delete guest. Changes reverted.')
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || adding) return
    setAdding(true)
    try {
      const res = await api.plans.addGuest(plan.id, {
        name: newName.trim(),
        party: newParty,
        status: newStatus,
        dietary: newDietary,
        notes: newNotes.trim() || undefined,
      })
      const updated = [res.guest, ...guests]
      setGuests(updated)
      setSummary(recalculateSummary(updated))
      setNewName('')
      setNewParty(1)
      setNewStatus('pending')
      setNewDietary('none')
      setNewNotes('')
      toast(`Added ${res.guest.name}`)
    } catch {
      toast('Failed to add guest')
    } finally {
      setAdding(false)
    }
  }

  const handleImport = async () => {
    if (!importText.trim() || importing) return
    setImporting(true)
    try {
      const res = await api.plans.importGuests(plan.id, importText)
      const updated = [...res.guests, ...guests]
      setGuests(updated)
      setSummary(recalculateSummary(updated))
      setShowImportModal(false)
      setImportText('')
      toast(`Imported ${res.count} guests`)
    } catch (e: any) {
      toast(e?.message || 'Failed to import guests')
    } finally {
      setImporting(false)
    }
  }

  const filteredGuests = guests.filter((g) => {
    if (statusFilter !== 'all' && g.status !== statusFilter) return false
    if (dietaryFilter !== 'all' && g.dietary !== dietaryFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = g.name.toLowerCase().includes(q)
      const matchNotes = (g.notes || '').toLowerCase().includes(q)
      if (!matchName && !matchNotes) return false
    }
    return true
  })

  const importLineCount = importText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean).length

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 280 }} role="status" aria-label="Loading guests">
        <LoopingLotus />
        <p style={{ marginTop: 12, color: 'var(--muted)', fontSize: 14 }}>Loading guest list & RSVP records...</p>
      </div>
    )
  }

  const confirmedCount = summary?.confirmedHeadcount ?? 0
  const plannedCapacity = plan.brief.guests
  const overCapacity = confirmedCount > plannedCapacity

  return (
    <div className="guests-wrap">
      {/* Headcount Warning Banner */}
      {overCapacity && (
        <div className="guest-alert-banner" role="alert" aria-live="polite">
          <AlertTriangle size={20} style={{ color: '#b91c1c', flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Headcount Alert: Capacity Exceeded</strong>
            <p>
              Your confirmed guest count ({confirmedCount}) exceeds your planned venue capacity of {plannedCapacity} by {confirmedCount - plannedCapacity} {confirmedCount - plannedCapacity === 1 ? 'attendee' : 'attendees'}.
              Check your seating plan and catering buffers.
            </p>
          </div>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="stat-row">
        <Stat
          label="Confirmed Headcount"
          value={`${confirmedCount}`}
          pct={plannedCapacity ? (confirmedCount / plannedCapacity) * 100 : 0}
          sub={`${summary?.countsByStatus.attending ?? 0} parties attending (target: ${plannedCapacity})`}
        />
        <Stat
          label="Pending RSVPs"
          value={`${summary?.countsByStatus.pending ?? 0}`}
          pct={0}
          sub="awaiting response"
        />
        <Stat
          label="Declined"
          value={`${summary?.countsByStatus.declined ?? 0}`}
          pct={0}
          sub="unable to attend"
        />
        <Stat
          label="Catering / Head"
          value={summary?.costPerHead !== null && summary?.costPerHead !== undefined ? money(summary.costPerHead, cur) : '—'}
          pct={0}
          sub={summary?.costPerHead !== null && summary?.costPerHead !== undefined
            ? `from ${compactMoney(summary.cateringAllocation, cur)} catering`
            : 'requires confirmed attendees'}
        />
      </div>

      {/* Dietary Summary Chips */}
      {summary && (summary.countsByDietary.veg > 0 || summary.countsByDietary.vegan > 0 || summary.countsByDietary.jain > 0 || summary.countsByDietary.halal > 0 || summary.countsByDietary.other > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, margin: '14px 0 20px', padding: '10px 16px', background: 'rgba(255,255,255,0.7)', borderRadius: 14, border: '1px solid var(--line)' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gold-deep)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dietary Preferences:</span>
          {summary.countsByDietary.veg > 0 && <span className="mb-chip" style={{ padding: '4px 10px', fontSize: 12 }}>{summary.countsByDietary.veg} Vegetarian</span>}
          {summary.countsByDietary.vegan > 0 && <span className="mb-chip" style={{ padding: '4px 10px', fontSize: 12 }}>{summary.countsByDietary.vegan} Vegan</span>}
          {summary.countsByDietary.jain > 0 && <span className="mb-chip" style={{ padding: '4px 10px', fontSize: 12 }}>{summary.countsByDietary.jain} Jain</span>}
          {summary.countsByDietary.halal > 0 && <span className="mb-chip" style={{ padding: '4px 10px', fontSize: 12 }}>{summary.countsByDietary.halal} Halal</span>}
          {summary.countsByDietary.other > 0 && <span className="mb-chip" style={{ padding: '4px 10px', fontSize: 12 }}>{summary.countsByDietary.other} Other / Special</span>}
        </div>
      )}

      {/* Add Guest Form */}
      <div className="add-guest-card">
        <h4 style={{ fontFamily: 'var(--serif)', fontSize: 20, marginBottom: 12, color: 'var(--ink)' }}>Add New Guest</h4>
        <form className="add-guest-form" onSubmit={handleAdd}>
          <input
            className="add-guest-input"
            placeholder="Guest / Family Name (required)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            aria-label="New guest name"
            disabled={adding}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Party:</span>
            <input
              type="number"
              min={1}
              max={10}
              className="add-guest-party"
              value={newParty}
              onChange={(e) => setNewParty(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              aria-label="Party size"
              disabled={adding}
            />
          </div>
          <select
            className="guest-select"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as GuestStatus)}
            aria-label="RSVP Status"
            disabled={adding}
          >
            <option value="pending">Pending</option>
            <option value="attending">Attending</option>
            <option value="declined">Declined</option>
          </select>
          <select
            className="guest-select"
            value={newDietary}
            onChange={(e) => setNewDietary(e.target.value as DietaryOption)}
            aria-label="Dietary preference"
            disabled={adding}
          >
            <option value="none">No Dietary Restriction</option>
            <option value="veg">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="jain">Jain</option>
            <option value="halal">Halal</option>
            <option value="other">Other / Custom</option>
          </select>
          <input
            className="add-guest-notes"
            placeholder="Notes (e.g. Table 2, Groom's family)"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            aria-label="Guest notes"
            disabled={adding}
          />
          <button type="submit" className="btn btn-gold" disabled={adding || !newName.trim()} style={{ padding: '8px 18px', fontSize: 13 }}>
            <UserPlus size={15} /> <span>Add</span>
          </button>
        </form>
      </div>

      {/* Toolbar: Search, Filters & Bulk Import Button */}
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
            onChange={(e) => setStatusFilter(e.target.value as any)}
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
            onChange={(e) => setDietaryFilter(e.target.value as any)}
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
          onClick={() => setShowImportModal(true)}
          style={{ background: 'rgba(255,255,255,0.9)', padding: '8px 16px', fontSize: 13 }}
          aria-label="Open bulk paste import modal"
        >
          <Upload size={14} /> <span>Bulk Paste Import</span>
        </button>
      </div>

      {/* Guests Table */}
      <div className="guests-table-card">
        {filteredGuests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted)' }}>
            <Users size={36} style={{ color: 'var(--gold)', margin: '0 auto 12px', opacity: 0.7 }} />
            <p style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>
              {guests.length === 0 ? 'No guests added yet' : 'No guests match your filters'}
            </p>
            <p style={{ fontSize: 13.5 }}>
              {guests.length === 0
                ? 'Add attendees one by one above or paste a list with Bulk Import.'
                : 'Try clearing your search query or changing your filters.'}
            </p>
          </div>
        ) : (
          <div className="guests-table-wrap">
            <table className="guests-table" aria-label="Guest list and RSVP tracker">
              <thead>
                <tr>
                  <th style={{ minWidth: 160 }}>Guest Name</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Party</th>
                  <th style={{ width: 140 }}>RSVP Status</th>
                  <th style={{ width: 140 }}>Dietary</th>
                  <th style={{ minWidth: 180 }}>Notes / Seat</th>
                  <th style={{ width: 60, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map((g) => (
                  <tr key={g.id}>
                    <td className="guest-name-cell">
                      <input
                        value={g.name}
                        onChange={(e) => updGuest(g.id, { name: e.target.value })}
                        aria-label={`Name for guest ${g.name}`}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <select
                        className="guest-select"
                        style={{ padding: '2px 8px', fontSize: 12 }}
                        value={g.party}
                        onChange={(e) => updGuest(g.id, { party: parseInt(e.target.value) || 1 })}
                        aria-label={`Party size for ${g.name}`}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <option key={num} value={num}>
                            {num}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className={`guest-status-select status-${g.status}`}
                        value={g.status}
                        onChange={(e) => updGuest(g.id, { status: e.target.value as GuestStatus })}
                        aria-label={`RSVP status for ${g.name}`}
                      >
                        <option value="pending">⏳ Pending</option>
                        <option value="attending">✓ Attending</option>
                        <option value="declined">✕ Declined</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="guest-dietary-select"
                        value={g.dietary}
                        onChange={(e) => updGuest(g.id, { dietary: e.target.value as DietaryOption })}
                        aria-label={`Dietary preference for ${g.name}`}
                      >
                        <option value="none">Standard</option>
                        <option value="veg">Vegetarian</option>
                        <option value="vegan">Vegan</option>
                        <option value="jain">Jain</option>
                        <option value="halal">Halal</option>
                        <option value="other">Other</option>
                      </select>
                    </td>
                    <td className="guest-notes-cell">
                      <input
                        placeholder="Add notes..."
                        value={g.notes || ''}
                        onChange={(e) => updGuest(g.id, { notes: e.target.value })}
                        aria-label={`Notes for ${g.name}`}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="link-btn"
                        onClick={() => delGuest(g.id)}
                        aria-label={`Remove guest ${g.name}`}
                        style={{ color: '#991b1b', opacity: 0.7 }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div
            className="auth-overlay"
            onClick={() => setShowImportModal(false)}
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
              aria-labelledby="import-modal-title"
            >
              <button
                className="auth-close"
                onClick={() => setShowImportModal(false)}
                aria-label="Close import dialog"
              >
                <X size={20} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ padding: 10, borderRadius: '50%', background: 'rgba(212,175,55,0.15)', color: 'var(--gold-deep)' }}>
                  <Upload size={22} />
                </div>
                <div>
                  <h3 id="import-modal-title" style={{ fontFamily: 'var(--serif)', fontSize: 26, margin: 0 }}>
                    Bulk Paste Guest List
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: '2px 0 0' }}>
                    Paste guest or party names below, one per line (up to 500).
                  </p>
                </div>
              </div>

              <textarea
                className="moodboard-input"
                style={{ width: '100%', minHeight: 180, borderRadius: 14, fontFamily: 'monospace', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 14 }}
                placeholder={`Aarav & Priya Sharma\nVikram Malhotra\nSunita Sen\nDevendra Rajput\nAnanya Verma...`}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                disabled={importing}
                aria-label="Pasted guest names, one per line"
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {importLineCount > 0 ? `${importLineCount} guest ${importLineCount === 1 ? 'name' : 'names'} detected` : 'Waiting for pasted names...'}
                </span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn"
                    onClick={() => setShowImportModal(false)}
                    disabled={importing}
                    style={{ background: 'transparent' }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-gold"
                    onClick={handleImport}
                    disabled={importing || importLineCount === 0}
                  >
                    {importing ? 'Importing...' : `Import ${importLineCount || ''} Guests`}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

