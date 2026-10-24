import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Cake, Heart, Sparkles, Users } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import { todayISO } from '../lib/utils'
import type { Brief, EventType, Plan } from '@soiree/shared'
import { FloralCorner, LoopingLotus } from './Vectors'

const TYPES: Array<{ id: EventType; title: string; text: string; icon: typeof Heart }> = [
  { id: 'wedding', title: 'Wedding', text: 'Ceremonies, sangeet, receptions', icon: Heart },
  { id: 'birthday', title: 'Birthday', text: 'Milestones and surprise parties', icon: Cake },
  { id: 'community', title: 'Community event', text: 'Fests, drives and gatherings', icon: Users },
]

const VIBES: Record<EventType, string[]> = {
  wedding: ['Romantic floral', 'Royal traditional', 'Boho rustic', 'Modern minimal', 'Beachside'],
  birthday: ['Colourful & fun', 'Elegant brunch', 'Retro party', 'Garden pastel', 'Tropical summer'],
  community: ['Cultural & traditional', 'Modern & youthful', 'Family friendly', 'Eco-conscious', 'Festive & vibrant'],
}

const DEFAULTS: Record<EventType, { guests: number; budget: number; offset: number; title: string }> = {
  wedding: { guests: 250, budget: 1500000, offset: 180, title: '' },
  birthday: { guests: 40, budget: 60000, offset: 45, title: '' },
  community: { guests: 300, budget: 250000, offset: 75, title: '' },
}

export function Wizard({ initialType, onDone }: { initialType?: EventType; onDone: (p: Plan) => void }) {
  const first = initialType ?? 'wedding'
  const [step, setStep] = useState(initialType ? 1 : 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [brief, setBrief] = useState<Brief>({
    type: first,
    title: DEFAULTS[first].title,
    date: todayISO(DEFAULTS[first].offset),
    guests: DEFAULTS[first].guests,
    budget: DEFAULTS[first].budget,
    currency: 'INR',
    city: '',
    vibe: '',
    notes: '',
  })
  const set = <K extends keyof Brief>(k: K, v: Brief[K]) => setBrief((b) => ({ ...b, [k]: v }))

  const chooseType = (t: EventType) => {
    const d = DEFAULTS[t]
    setBrief((b) => ({ ...b, type: t, guests: d.guests, budget: d.budget, date: todayISO(d.offset), vibe: '' }))
  }

  const detailsValid = brief.guests > 0 && brief.budget > 0 && brief.date >= todayISO()

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      // Ensure user session exists (auto-guest if anonymous)
      try {
        await api.auth.me()
      } catch {
        await api.auth.guest()
      }

      const [res] = await Promise.all([
        api.plans.create(brief),
        new Promise((r) => setTimeout(r, 1800)),
      ])
      onDone(res.plan)
    } catch (err: any) {
      setError(err.message || 'Failed to compose plan. Please try again.')
      setBusy(false)
    }
  }

  const placeholder = { wedding: 'e.g. Aarav & Meera', birthday: 'e.g. Anaya turns 5', community: 'e.g. Diwali Mela 2026' }[brief.type]

  return (
    <div className="wizard panel">
      <FloralCorner pos="tr" size={130} />
      <FloralCorner pos="bl" size={100} />
      {busy ? (
        <div className="generating" role="status">
          <div style={{ display: 'grid', placeItems: 'center' }}><LoopingLotus size={230} /></div>
          <h3>Composing your plan…</h3>
          <p>Balancing your budget, arranging milestones, and shortlisting vendors.</p>
        </div>
      ) : (
        <>
          <div className="progress" aria-hidden>
            {[0, 1, 2].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}
          </div>
          {error && (
            <div style={{ background: 'rgba(179, 71, 63, 0.08)', border: '1px solid rgba(179, 71, 63, 0.25)', color: '#b3473f', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
              {step === 0 && (
                <>
                  <h2>What are we <em>celebrating?</em></h2>
                  <p className="sub">Choose an occasion and we will tailor everything to it.</p>
                  <div className="type-pick">
                    {TYPES.map((t) => (
                      <button key={t.id} className={`pick ${brief.type === t.id ? 'on' : ''}`} onClick={() => chooseType(t.id)} aria-pressed={brief.type === t.id}>
                        <t.icon size={26} strokeWidth={1.5} />
                        <h4>{t.title}</h4>
                        <p>{t.text}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <h2>The <em>essentials</em></h2>
                  <p className="sub">A few numbers help us build a realistic plan.</p>
                  <div className="form-grid">
                    <div className="field full">
                      <label htmlFor="title">Event name</label>
                      <input id="title" className="input" value={brief.title} placeholder={placeholder} onChange={(e) => set('title', e.target.value)} />
                    </div>
                    <div className="field">
                      <label htmlFor="date">Date</label>
                      <input id="date" type="date" className="input" min={todayISO()} value={brief.date} onChange={(e) => set('date', e.target.value)} />
                    </div>
                    <div className="field">
                      <label htmlFor="guests">Guests</label>
                      <input id="guests" type="number" min={1} className="input" value={brief.guests || ''} onChange={(e) => set('guests', Number(e.target.value))} />
                    </div>
                    <div className="field">
                      <label htmlFor="budget">Total budget</label>
                      <input id="budget" type="number" min={1} step={5000} className="input" value={brief.budget || ''} onChange={(e) => set('budget', Number(e.target.value))} />
                    </div>
                    <div className="field">
                      <label htmlFor="currency">Currency</label>
                      <select id="currency" className="input" value={brief.currency} onChange={(e) => set('currency', e.target.value as Brief['currency'])}>
                        <option value="INR">₹ INR</option>
                        <option value="USD">$ USD</option>
                        <option value="EUR">€ EUR</option>
                      </select>
                    </div>
                    <div className="field full">
                      <label htmlFor="city">City</label>
                      <input id="city" className="input" value={brief.city} placeholder="e.g. Jalgaon, Pune, Mumbai" onChange={(e) => set('city', e.target.value)} />
                    </div>
                  </div>
                  {!detailsValid && <p className="sub" style={{ marginTop: 14, marginBottom: 0, color: '#b3473f' }}>Please enter a future date, guests and a budget.</p>}
                </>
              )}
              {step === 2 && (
                <>
                  <h2>Set the <em>mood</em></h2>
                  <p className="sub">Pick a vibe or describe your own. The more detail, the more personal the ideas.</p>
                  <div className="vibe-chips" style={{ marginBottom: 20 }}>
                    {VIBES[brief.type].map((v) => (
                      <button key={v} className={`chip ${brief.vibe === v ? 'on' : ''}`} onClick={() => set('vibe', v)}>{v}</button>
                    ))}
                  </div>
                  <div className="form-grid">
                    <div className="field full">
                      <label htmlFor="vibe">Vibe</label>
                      <input id="vibe" className="input" value={brief.vibe} placeholder="e.g. pastel florals, intimate, live music" onChange={(e) => set('vibe', e.target.value)} />
                    </div>
                    <div className="field full">
                      <label htmlFor="notes">Anything else?</label>
                      <textarea id="notes" className="input" value={brief.notes} placeholder="Dietary needs, must-have rituals, accessibility, special surprises…" onChange={(e) => set('notes', e.target.value)} />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="wizard-actions">
            <button className="btn btn-ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ArrowLeft size={16} /> Back
            </button>
            {step < 2 ? (
              <button className="btn btn-primary" onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !detailsValid}>
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={submit}>
                <Sparkles size={16} /> Generate my plan
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
