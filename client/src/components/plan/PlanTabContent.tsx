import React, { Suspense } from 'react'
import type { Plan } from '@soiree/shared'
import { LoopingLotus } from '../Vectors'
import type { Tab } from './PlanTabBar'

const BudgetTab = React.lazy(() => import('../tabs/BudgetTab'))
const TimelineTab = React.lazy(() => import('../tabs/TimelineTab'))
const VendorsTab = React.lazy(() => import('../tabs/VendorsTab'))
const GuestsTab = React.lazy(() => import('../tabs/GuestsTab'))
const IdeasTab = React.lazy(() => import('../tabs/IdeasTab'))
const MoodboardTab = React.lazy(() => import('../tabs/MoodboardTab'))
const AskTab = React.lazy(() => import('../tabs/AskTab'))

interface Props {
  tab: Tab
  plan: Plan
  setPlan: (fn: (p: Plan) => Plan) => void
  totalAlloc: number
  totalSpent: number
  toggleMilestone: (id: string) => Promise<void>
  onEdit: (id: string, key: 'allocated' | 'spent', value: number) => void
  toast: (m: string) => void
}

/**
 * Lazy tab content area for budget, timeline, vendors, guests, ideas, moodboard, and concierge.
 */
export function PlanTabContent({ tab, plan, setPlan, totalAlloc, totalSpent, toggleMilestone, onEdit, toast }: Props) {
  return (
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
            onEdit={onEdit}
            toast={toast}
          />
        )}
        {tab === 'timeline' && <TimelineTab plan={plan} toggleMilestone={toggleMilestone} />}
        {tab === 'vendors' && <VendorsTab plan={plan} setPlan={setPlan} toast={toast} />}
        {tab === 'guests' && <GuestsTab plan={plan} toast={toast} />}
        {tab === 'ideas' && <IdeasTab plan={plan} setPlan={setPlan} toast={toast} />}
        {tab === 'moodboard' && <MoodboardTab plan={plan} toast={toast} />}
        {tab === 'ask' && <AskTab plan={plan} />}
      </Suspense>
    </div>
  )
}
