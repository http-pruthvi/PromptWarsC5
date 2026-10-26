import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import type { BudgetRebalanceProposal, Currency } from '@soiree/shared'
import { money } from '../../lib/utils'
import { LoopingLotus } from '../Vectors'

interface Props {
  show: boolean
  onClose: () => void
  proposal: BudgetRebalanceProposal | null
  loading: boolean
  applying: boolean
  onApply: () => void
  cur?: Currency
}

/**
 * Interactive preview modal displaying AI budget reallocation proposals before applying.
 */
export function BudgetRebalanceModal({ show, onClose, proposal, loading, applying, onApply, cur }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <div className="auth-overlay" onClick={() => !applying && onClose()} role="presentation">
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
            <button className="auth-close" onClick={() => !applying && onClose()} aria-label="Close rebalance dialog">
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

            {loading ? (
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
                  <button className="btn" onClick={onClose} disabled={applying} style={{ background: 'transparent' }}>
                    Cancel
                  </button>
                  <button className="btn btn-gold" onClick={onApply} disabled={applying}>
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
  )
}
