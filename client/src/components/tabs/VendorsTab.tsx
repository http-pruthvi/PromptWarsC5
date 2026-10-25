import { motion } from 'framer-motion'
import { Lightbulb, Plus, Store, Trash2 } from 'lucide-react'
import React, { useCallback, useRef, useState } from 'react'
import type { Plan, Vendor, VendorStatus } from '@soiree/shared'
import { api } from '../../lib/api'

const STATUS_NEXT: Record<VendorStatus, VendorStatus> = { todo: 'contacted', contacted: 'booked', booked: 'todo' }
const STATUS_LABEL: Record<VendorStatus, string> = { todo: 'To contact', contacted: 'Contacted', booked: 'Booked ✓' }

interface Props {
  plan: Plan
  setPlan: (fn: (p: Plan) => Plan) => void
  toast: (m: string) => void
}

interface VendorCardProps {
  v: Vendor
  cur: string
  onToggleStatus: (id: string, current: Vendor['status']) => void
  onRemove: (id: string) => void
  onUpdateText: (id: string, patch: Partial<Vendor>) => void
}

const VendorCard = React.memo(function VendorCard({ v, cur, onToggleStatus, onRemove, onUpdateText }: VendorCardProps) {
  return (
    <motion.div layout className="vendor" key={v.id}>
      <div className="vendor-top">
        <h4>{v.category}</h4>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            className={`status ${v.status}`}
            onClick={() => onToggleStatus(v.id, v.status)}
            title="Click to toggle status"
          >
            {STATUS_LABEL[v.status]}
          </button>
          <button className="link-btn" aria-label={`Remove ${v.category}`} onClick={() => onRemove(v.id)}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <input
        className="input"
        placeholder="Vendor name / contact"
        aria-label={`${v.category} vendor name`}
        value={v.name}
        onChange={(e) => onUpdateText(v.id, { name: e.target.value })}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <small style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>Estimate ({cur})</small>
        <input
          className="num"
          type="number"
          min={0}
          aria-label={`${v.category} estimate`}
          value={v.estimate}
          onChange={(e) => onUpdateText(v.id, { estimate: Math.max(0, Number(e.target.value) || 0) })}
        />
      </div>
      {v.tips && (
        <div className="tip">
          <Lightbulb size={15} />
          <span>{v.tips}</span>
        </div>
      )}
    </motion.div>
  )
})

export default function VendorsTab({ plan, setPlan, toast }: Props) {
  const [cat, setCat] = useState('')
  const [busy, setBusy] = useState(false)
  const cur = plan.brief.currency
  const debounceTimers = useRef<Record<string, number>>({})

  // Debounced server patch for text fields
  const queuePatch = useCallback(
    (id: string, patch: Partial<Vendor>, orig: Vendor) => {
      if (debounceTimers.current[id]) {
        window.clearTimeout(debounceTimers.current[id])
      }
      debounceTimers.current[id] = window.setTimeout(async () => {
        try {
          await api.plans.updateVendor(plan.id, id, patch)
        } catch {
          setPlan((p) => ({
            ...p,
            vendors: p.vendors.map((v) => (v.id === id ? orig : v)),
          }))
          toast('Failed to save vendor update')
        }
      }, 400)
    },
    [plan.id, setPlan, toast],
  )

  const onUpdateText = useCallback(
    (id: string, patch: Partial<Vendor>) => {
      const orig = plan.vendors.find((v) => v.id === id)
      if (!orig) return

      setPlan((p) => ({
        ...p,
        vendors: p.vendors.map((v) => (v.id === id ? { ...v, ...patch } : v)),
      }))
      queuePatch(id, patch, orig)
    },
    [plan.vendors, queuePatch, setPlan],
  )

  const onToggleStatus = useCallback(
    async (id: string, currentStatus: Vendor['status']) => {
      const orig = plan.vendors.find((v) => v.id === id)
      if (!orig) return
      const nextStatus = STATUS_NEXT[currentStatus]

      setPlan((p) => ({
        ...p,
        vendors: p.vendors.map((v) => (v.id === id ? { ...v, status: nextStatus } : v)),
      }))

      try {
        await api.plans.updateVendor(plan.id, id, { status: nextStatus })
      } catch {
        setPlan((p) => ({
          ...p,
          vendors: p.vendors.map((v) => (v.id === id ? orig : v)),
        }))
        toast('Failed to update status')
      }
    },
    [plan.id, plan.vendors, setPlan, toast],
  )

  const remove = useCallback(
    async (id: string) => {
      const orig = plan.vendors.find((v) => v.id === id)
      if (!orig) return

      setPlan((p) => ({
        ...p,
        vendors: p.vendors.filter((v) => v.id !== id),
      }))

      try {
        await api.plans.deleteVendor(plan.id, id)
        toast('Vendor removed')
      } catch {
        setPlan((p) => ({ ...p, vendors: [...p.vendors, orig] }))
        toast('Failed to delete vendor')
      }
    },
    [plan.id, plan.vendors, setPlan, toast],
  )

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cat.trim() || busy) return
    setBusy(true)
    try {
      const res = await api.plans.addVendor(plan.id, { category: cat.trim() })
      setPlan((p) => ({ ...p, vendors: [...p.vendors, res.vendor] }))
      setCat('')
      toast(`Added ${res.vendor.category}`)
    } catch {
      toast('Failed to add vendor')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {plan.vendors.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 20px',
            color: 'var(--muted)',
            background: 'rgba(255,255,255,0.7)',
            borderRadius: 20,
            border: '1px solid var(--line)',
            marginBottom: 20,
          }}
        >
          <Store size={36} style={{ color: 'var(--gold)', margin: '0 auto 12px', opacity: 0.7 }} />
          <p style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>No vendors added yet</p>
          <p style={{ fontSize: 13.5 }}>
            Add your first vendor category below (e.g. Catering, Photography, Floral Decor).
          </p>
        </div>
      ) : (
        <div className="vendor-grid">
          {plan.vendors.map((v) => (
            <VendorCard
              key={v.id}
              v={v}
              cur={cur}
              onToggleStatus={onToggleStatus}
              onRemove={remove}
              onUpdateText={onUpdateText}
            />
          ))}
        </div>
      )}
      <form className="vendor-add" onSubmit={add}>
        <input
          className="input"
          placeholder="Add another vendor category (e.g. Pandit, Live Band, Valet)"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          aria-label="New vendor category"
          disabled={busy}
        />
        <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !cat.trim()}>
          <Plus size={15} /> {busy ? 'Adding…' : 'Add vendor'}
        </button>
      </form>
    </>
  )
}
