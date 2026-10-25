import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Sparkles, X } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import type { BudgetRebalanceProposal, Currency, Plan } from '@soiree/shared'
import { api } from '../../lib/api'
import { compactMoney, money } from '../../lib/utils'
import { DonutChart, PALETTE } from '../common'
import { LoopingLotus } from '../Vectors'
import { Stat } from './TabHelpers'

interface Props {
  plan: Plan
  setPlan: (fn: (p: Plan) => Plan) => void
  totalAlloc: number
  totalSpent: number
  onEdit: (id: string, key: 'allocated' | 'spent', v: number) => void
  toast: (m: string) => void
}

interface BudgetRowProps {
  x: Plan['budget'][number]
  color: string
  cur?: Currency
  onEdit: (id: string, key: 'allocated' | 'spent', v: number) => void
}

const BudgetRow = React.memo(function BudgetRow({ x, color, cur, onEdit }: BudgetRowProps) {
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
      {/* Sticky Alert Banner when Total Spent exceeds 90% */}
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
            <div className="row row-head">
              <span />
              <span>Category</span>
              <span style={{ textAlign: 'right' }}>Allocated</span>
              <span style={{ textAlign: 'right' }}>Spent</span>
            </div>
            {plan.budget.map((x, i) => (
              <BudgetRow key={x.id} x={x} color={PALETTE[i % PALETTE.length]} cur={cur} onEdit={onEdit} />
            ))}
          </div>
        </div>
      </div>

      {/* AI Budget Rebalance Preview Modal */}
      <AnimatePresence>
        {showRebalanceModal && (
          <div className="auth-overlay" onClick={() => !applying && setShowRebalanceModal(false)} role="presentation">
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
                <div
                  style={{
                    padding: 10,
                    borderRadius: '50%',
                    background: 'rgba(212,175,55,0.15)',
                    color: 'var(--gold-deep)',
                  }}
                >
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
                  <div
                    style={{
                      background: 'rgba(247,239,229,0.7)',
                      padding: '12px 16px',
                      borderRadius: 14,
                      border: '1px solid var(--line)',
                      marginBottom: 16,
                    }}
                  >
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
                              <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {money(c.to, cur)}
                              </td>
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
                    <button className="btn btn-gold" onClick={handleApplyRebalance} disabled={applying}>
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
