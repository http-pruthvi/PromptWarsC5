import { AlertTriangle, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { BudgetRebalanceProposal, Plan } from '@soiree/shared'
import { api } from '../../lib/api'
import { compactMoney, money } from '../../lib/utils'
import { DonutChart, PALETTE } from '../common'
import { Stat } from './TabHelpers'
import { BudgetRow } from '../budget/BudgetRow'
import { BudgetRebalanceModal } from '../budget/BudgetRebalanceModal'

interface Props {
  plan: Plan
  setPlan: (fn: (p: Plan) => Plan) => void
  totalAlloc: number
  totalSpent: number
  onEdit: (id: string, key: 'allocated' | 'spent', v: number) => void
  toast: (m: string) => void
}

/**
 * BudgetTab provides real-time allocation breakdown, expenditure monitoring, and AI rebalancing.
 */
export default function BudgetTab({ plan, setPlan, totalAlloc, totalSpent, onEdit, toast }: Props) {
  const b = plan.brief
  const cur = b.currency
  const diff = b.budget - totalAlloc
  const remaining = b.budget - totalSpent
  const isOver90Percent = totalSpent > 0.9 * b.budget

  const chartData = useMemo(
    () =>
      plan.budget.map((x, i) => ({
        label: x.category,
        value: x.allocated,
        color: PALETTE[i % PALETTE.length] ?? '#b88c3c',
      })),
    [plan.budget],
  )

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showRebalanceModal && !applying) {
        setShowRebalanceModal(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showRebalanceModal, applying])

  return (
    <>
      {isOver90Percent && (
        <div className="budget-sticky-alert" role="alert" aria-live="polite">
          <AlertTriangle size={22} style={{ color: '#b91c1c', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>Budget Alert: {Math.round((totalSpent / b.budget) * 100)}% of total funds utilized</strong>
            <p>
              You have spent {money(totalSpent, cur)} of your {money(b.budget, cur)} total plan budget. Only{' '}
              {money(remaining, cur)} remains available. Use AI Budget Rebalancing to redistribute funds safely.
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
          sub={
            diff === 0
              ? 'Fully allocated'
              : diff > 0
                ? `${money(diff, cur)} unallocated`
                : `${money(-diff, cur)} over-allocated`
          }
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
        <DonutChart data={chartData} centerLabel="Allocated" centerValue={compactMoney(totalAlloc, cur)} />
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 24, margin: 0 }}>Category Breakdown</h3>
            <button
              className="btn btn-gold"
              onClick={handleOpenRebalance}
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              <Sparkles size={14} /> <span>Rebalance with AI</span>
            </button>
          </div>

          <div className="table">
            <div className="row row-head">
              <span />
              <span>Category</span>
              <span style={{ textAlign: 'right' }}>Allocated</span>
              <span style={{ textAlign: 'right' }}>Spent</span>
            </div>
            {plan.budget.map((x, i) => (
              <BudgetRow key={x.id} x={x} color={PALETTE[i % PALETTE.length] ?? '#b88c3c'} cur={cur} onEdit={onEdit} />
            ))}
          </div>
        </div>
      </div>

      <BudgetRebalanceModal
        show={showRebalanceModal}
        onClose={() => setShowRebalanceModal(false)}
        proposal={proposal}
        loading={loadingProposal}
        applying={applying}
        onApply={handleApplyRebalance}
        cur={cur}
      />
    </>
  )
}
