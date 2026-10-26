import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'
import type { Plan } from '@soiree/shared'
import { api } from '../lib/api'
import { useShareModal } from '../hooks/useShareModal'
import { PlanHeader } from './plan/PlanHeader'
import { PlanOverviewTab } from './plan/PlanOverviewTab'
import { PlanTabBar, type Tab } from './plan/PlanTabBar'
import { PlanTabContent } from './plan/PlanTabContent'
import { ShareModal } from './plan/ShareModal'

interface Props {
  plan: Plan
  setPlan: (fn: (p: Plan) => Plan) => void
  onNew: () => void
  onBackToDashboard: () => void
  toast: (m: string) => void
}

/** Debounce delay in milliseconds for budget field edits. */
const BUDGET_DEBOUNCE_MS = 450

/**
 * PlanView renders the full event plan workspace with modular tab components.
 */
export default function PlanView({ plan, setPlan, onNew, onBackToDashboard, toast }: Props) {
  const shouldReduceMotion = useReducedMotion()
  const [tab, setTab] = useState<Tab>('overview')
  const totalAlloc = plan.budget.reduce((s, x) => s + x.allocated, 0)
  const totalSpent = plan.budget.reduce((s, x) => s + x.spent, 0)

  const share = useShareModal()

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
      setPlan((p) => ({
        ...p,
        timeline: p.timeline.map((t) => (t.id === id ? { ...t, done: m.done } : t)),
      }))
      toast('Failed to update milestone on server')
    }
  }

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
    }, BUDGET_DEBOUNCE_MS)
  }

  return (
    <div>
      <PlanHeader
        plan={plan}
        onNew={onNew}
        onBackToDashboard={onBackToDashboard}
        openShareModal={() => share.openShareModal(plan.id)}
        toast={toast}
      />

      <PlanTabBar tab={tab} setTab={setTab} />

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          {...(!shouldReduceMotion ? { exit: { opacity: 0, y: -8 } } : {})}
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

          <PlanTabContent
            tab={tab}
            plan={plan}
            setPlan={setPlan}
            totalAlloc={totalAlloc}
            totalSpent={totalSpent}
            toggleMilestone={toggleMilestone}
            onEdit={editBudget}
            toast={toast}
          />
        </motion.div>
      </AnimatePresence>

      <ShareModal
        show={share.showShareModal}
        onClose={share.closeShareModal}
        shareData={share.shareData}
        busyShare={share.busyShare}
        toggleShareEnabled={() => share.toggleShareEnabled(plan.id, toast)}
        copyShareLink={() => share.copyShareLink(toast)}
      />
    </div>
  )
}
