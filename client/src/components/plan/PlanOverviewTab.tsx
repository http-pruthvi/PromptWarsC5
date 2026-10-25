import type { Plan } from '@soiree/shared'
import { compactMoney, money } from '../../lib/utils'
import { DonutChart } from '../common'
import { MilestoneRow, Stat } from '../tabs/TabHelpers'

interface Props {
  plan: Plan
  totalAlloc: number
  totalSpent: number
  toggleMilestone: (id: string) => Promise<void>
}

export function PlanOverviewTab({ plan, totalAlloc, totalSpent, toggleMilestone }: Props) {
  const b = plan.brief
  const cur = b.currency
  const done = plan.timeline.filter((t) => t.done).length
  const booked = plan.vendors.filter((v) => v.status === 'booked').length

  return (
    <>
      <p className="summary">{plan.summary}</p>
      <div className="stat-row">
        <Stat
          label="Budget"
          value={compactMoney(b.budget, cur)}
          pct={(totalSpent / b.budget) * 100}
          sub={`${money(totalSpent, cur)} spent`}
        />
        <Stat
          label="Milestones"
          value={`${done}/${plan.timeline.length}`}
          pct={(done / plan.timeline.length) * 100}
          sub="tasks complete"
        />
        <Stat
          label="Vendors"
          value={`${booked}/${plan.vendors.length}`}
          pct={(booked / plan.vendors.length) * 100}
          sub="booked"
        />
        <Stat
          label="Per guest"
          value={compactMoney(b.guests ? b.budget / b.guests : 0, cur)}
          pct={0}
          sub="budget per head"
        />
      </div>
      <div className="budget-layout">
        <DonutChart
          data={plan.budget.map((x) => ({ label: x.category, value: x.allocated }))}
          centerLabel="Allocated"
          centerValue={compactMoney(totalAlloc, cur)}
        />
        <div>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 30, marginBottom: 14 }}>Up next</h3>
          <div className="timeline">
            {plan.timeline
              .filter((t) => !t.done)
              .slice(0, 3)
              .map((m) => (
                <MilestoneRow key={m.id} plan={plan} id={m.id} onToggle={toggleMilestone} />
              ))}
            {plan.timeline.every((t) => t.done) && (
              <p className="m-detail">Everything is done. Enjoy your celebration! 🎉</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
