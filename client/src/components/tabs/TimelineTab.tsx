import type { Plan } from '@soiree/shared'
import { MilestoneRow } from './TabHelpers'

interface Props {
  plan: Plan
  toggleMilestone: (id: string) => Promise<void>
}

/**
 * Timeline tab displaying chronological celebration milestones with optimistic status toggling.
 */
export default function TimelineTab({ plan, toggleMilestone }: Props) {
  return (
    <div className="timeline">
      {plan.timeline.map((m) => (
        <MilestoneRow key={m.id} plan={plan} id={m.id} onToggle={toggleMilestone} />
      ))}
    </div>
  )
}
