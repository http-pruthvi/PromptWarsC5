import React from 'react'
import { AlertTriangle } from 'lucide-react'
import type { Currency, Plan } from '@soiree/shared'
import { money } from '../../lib/utils'

interface BudgetRowProps {
  x: Plan['budget'][number]
  color: string
  cur?: Currency
  onEdit: (id: string, key: 'allocated' | 'spent', v: number) => void
}

/**
 * Single budget category row with live allocation/spent editing and deficit detection.
 */
export const BudgetRow = React.memo(function BudgetRow({ x, color, cur, onEdit }: BudgetRowProps) {
  const over = x.spent > x.allocated
  const overAmount = x.spent - x.allocated
  return (
    <div className={`row ${over ? 'row-overspent' : ''}`}>
      <span className="swatch" style={{ background: color }} />
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
})
