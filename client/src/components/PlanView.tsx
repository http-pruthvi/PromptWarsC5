import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarDays, Check, Download, LayoutDashboard, Lightbulb, LayoutGrid, MapPin, MessageCircleHeart, PiggyBank,
  Plus, Printer, Send, Shuffle, Store, Trash2, Users, Wand2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { addDays, compactMoney, fmtDate, money, todayISO } from '../lib/utils'
import type { ChatMessage, Plan, Vendor, VendorStatus } from '@soiree/shared'
import { DonutChart, PALETTE } from './common'

type Tab = 'overview' | 'budget' | 'timeline' | 'vendors' | 'ideas' | 'ask'

const TABS: Array<{ id: Tab; label: string; icon: typeof PiggyBank }> = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'budget', label: 'Budget', icon: PiggyBank },
  { id: 'timeline', label: 'Timeline', icon: CalendarDays },
  { id: 'vendors', label: 'Vendors', icon: Store },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb },
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
              totalAlloc={totalAlloc}
              totalSpent={totalSpent}
              onEdit={editBudget}
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

          {tab === 'ideas' && (
            <IdeasTab plan={plan} setPlan={setPlan} toast={toast} />
          )}

          {tab === 'ask' && (
            <AskTab plan={plan} />
          )}
        </motion.div>
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
  totalAlloc,
  totalSpent,
  onEdit,
}: {
  plan: Plan
  totalAlloc: number
  totalSpent: number
  onEdit: (id: string, key: 'allocated' | 'spent', v: number) => void
}) {
  const b = plan.brief
  const cur = b.currency
  const diff = b.budget - totalAlloc
  const remaining = b.budget - totalSpent

  return (
    <>
      <div className="stat-row">
        <Stat label="Total budget" value={money(b.budget, cur)} sub={diff === 0 ? 'Fully allocated' : diff > 0 ? `${money(diff, cur)} unallocated` : `${money(-diff, cur)} over-allocated`} pct={(totalAlloc / b.budget) * 100} />
        <Stat label="Spent" value={money(totalSpent, cur)} sub={`${Math.round((totalSpent / b.budget) * 100)}% of budget`} pct={(totalSpent / b.budget) * 100} />
        <Stat label="Remaining" value={money(remaining, cur)} sub={remaining < 0 ? 'Over budget!' : 'still available'} pct={0} />
      </div>
      <div className="budget-layout">
        <DonutChart data={plan.budget.map((x) => ({ label: x.category, value: x.allocated }))} centerLabel="Allocated" centerValue={compactMoney(totalAlloc, cur)} />
        <div className="table">
          <div className="row row-head"><span /><span>Category</span><span style={{ textAlign: 'right' }}>Allocated</span><span style={{ textAlign: 'right' }}>Spent</span></div>
          {plan.budget.map((x, i) => {
            const over = x.spent > x.allocated
            return (
              <div className="row" key={x.id}>
                <span className="swatch" style={{ background: PALETTE[i % PALETTE.length] }} />
                <div className="name">
                  <b>{x.category}</b>
                  <small>{x.note}</small>
                  <div className={`bar ${over ? 'warn' : ''}`} style={{ marginTop: 8 }}><i style={{ width: `${x.allocated ? Math.min(100, (x.spent / x.allocated) * 100) : 0}%` }} /></div>
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
