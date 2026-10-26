import { motion } from 'framer-motion'
import { CalendarDays, LayoutGrid, Lightbulb, MessageCircleHeart, Palette, PiggyBank, Store, Users } from 'lucide-react'

export type Tab = 'overview' | 'budget' | 'timeline' | 'vendors' | 'guests' | 'ideas' | 'moodboard' | 'ask'

export const TABS: Array<{ id: Tab; label: string; icon: typeof PiggyBank }> = [
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
  tab: Tab
  setTab: (tab: Tab) => void
}

/**
 * Plan tabs navigation bar with animated pill selector.
 */
export function PlanTabBar({ tab, setTab }: Props) {
  return (
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
  )
}
