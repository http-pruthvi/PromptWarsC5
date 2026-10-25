import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CalendarDays, LayoutGrid, Lightbulb, MessageCircleHeart, Palette, PiggyBank, Store, Users } from 'lucide-react'
import React, { Suspense, useEffect, useRef, useState } from 'react'
import type { Plan } from '@soiree/shared'
import { api } from '../lib/api'
import { LoopingLotus } from './Vectors'
import { MilestoneRow } from './tabs/TabHelpers'
import { PlanHeader } from './plan/PlanHeader'
import { PlanOverviewTab } from './plan/PlanOverviewTab'
import { ShareModal } from './plan/ShareModal'

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

export default function PlanView({ plan, setPlan, onNew, onBackToDashboard, toast }: Props) {
  const shouldReduceMotion = useReducedMotion()
  const [tab, setTab] = useState<Tab>('overview')
  const totalAlloc = plan.budget.reduce((s, x) => s + x.allocated, 0)
  const totalSpent = plan.budget.reduce((s, x) => s + x.spent, 0)

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
      <PlanHeader
        plan={plan}
        onNew={onNew}
        onBackToDashboard={onBackToDashboard}
        openShareModal={openShareModal}
        toast={toast}
      />

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
              <motion.span
                layoutId="tabpill"
                className="pill"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <t.icon size={15} /> <span>{t.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.35 }}
        >
          {tab === 'overview' && (
            <PlanOverviewTab
              plan={plan}
              totalAlloc={totalAlloc}
              totalSpent={totalSpent}
              toggleMilestone={toggleMilestone}
            />
          )}

          <div className="tab-content-area">
            <Suspense
              fallback={
                <div
                  style={{ display: 'grid', placeItems: 'center', minHeight: 520, padding: 30 }}
                  role="status"
                  aria-label="Loading section"
                >
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
          </div>
        </motion.div>
      </AnimatePresence>

      <ShareModal
        show={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareData={shareData}
        busyShare={busyShare}
        toggleShareEnabled={toggleShareEnabled}
        copyShareLink={copyShareLink}
      />
    </div>
  )
}
