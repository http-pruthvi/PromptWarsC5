import { Cake, Heart, Users } from 'lucide-react'
import type { Brief, EventType } from '@soiree/shared'
import { todayISO } from '../../lib/utils'

export const TYPES: Array<{ id: EventType; title: string; text: string; icon: typeof Heart }> = [
  { id: 'wedding', title: 'Wedding', text: 'Ceremonies, sangeet, receptions', icon: Heart },
  { id: 'birthday', title: 'Birthday', text: 'Milestones and surprise parties', icon: Cake },
  { id: 'community', title: 'Community event', text: 'Fests, drives and gatherings', icon: Users },
]

export const VIBES: Record<EventType, string[]> = {
  wedding: ['Romantic floral', 'Royal traditional', 'Boho rustic', 'Modern minimal', 'Beachside'],
  birthday: ['Colourful & fun', 'Elegant brunch', 'Retro party', 'Garden pastel', 'Tropical summer'],
  community: ['Cultural & traditional', 'Modern & youthful', 'Family friendly', 'Eco-conscious', 'Festive & vibrant'],
}

export const DEFAULTS: Record<EventType, { guests: number; budget: number; offset: number; title: string }> = {
  wedding: { guests: 250, budget: 1500000, offset: 180, title: '' },
  birthday: { guests: 40, budget: 60000, offset: 45, title: '' },
  community: { guests: 300, budget: 250000, offset: 75, title: '' },
}

interface StepTypeProps {
  currentType: EventType
  onSelect: (type: EventType) => void
}

/**
 * Step 0: Event type selection cards.
 */
export function StepTypePick({ currentType, onSelect }: StepTypeProps) {
  return (
    <>
      <h2>
        What are we <em>celebrating?</em>
      </h2>
      <p className="sub">Choose an occasion and we will tailor everything to it.</p>
      <div className="type-pick">
        {TYPES.map((t) => (
          <button
            key={t.id}
            className={`pick ${currentType === t.id ? 'on' : ''}`}
            onClick={() => onSelect(t.id)}
            aria-pressed={currentType === t.id}
          >
            <t.icon size={26} strokeWidth={1.5} />
            <h3>{t.title}</h3>
            <p>{t.text}</p>
          </button>
        ))}
      </div>
    </>
  )
}

interface StepEssentialsProps {
  brief: Brief
  set: <K extends keyof Brief>(k: K, v: Brief[K]) => void
  detailsValid: boolean
}

/**
 * Step 1: Fundamental celebration metrics (date, guest count, budget, city).
 */
export function StepEssentials({ brief, set, detailsValid }: StepEssentialsProps) {
  const placeholder = {
    wedding: 'e.g. Aarav & Meera',
    birthday: 'e.g. Anaya turns 5',
    community: 'e.g. Diwali Mela 2026',
  }[brief.type]

  return (
    <>
      <h2>
        The <em>essentials</em>
      </h2>
      <p className="sub">A few numbers help us build a realistic plan.</p>
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="title">Event name</label>
          <input
            id="title"
            className="input"
            value={brief.title}
            placeholder={placeholder}
            onChange={(e) => set('title', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            className="input"
            min={todayISO()}
            value={brief.date}
            onChange={(e) => set('date', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="guests">Guests</label>
          <input
            id="guests"
            type="number"
            min={1}
            className="input"
            value={brief.guests || ''}
            onChange={(e) => set('guests', Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="budget">Total budget</label>
          <input
            id="budget"
            type="number"
            min={1}
            step={5000}
            className="input"
            value={brief.budget || ''}
            onChange={(e) => set('budget', Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="currency">Currency</label>
          <select
            id="currency"
            className="input"
            value={brief.currency}
            onChange={(e) => set('currency', e.target.value as Brief['currency'])}
          >
            <option value="INR">₹ INR</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
          </select>
        </div>
        <div className="field full">
          <label htmlFor="city">City</label>
          <input
            id="city"
            className="input"
            value={brief.city}
            placeholder="e.g. Jalgaon, Pune, Mumbai"
            onChange={(e) => set('city', e.target.value)}
          />
        </div>
      </div>
      {!detailsValid && (
        <p className="sub" style={{ marginTop: 14, marginBottom: 0, color: '#b3473f' }}>
          Please enter a future date, guests and a budget.
        </p>
      )}
    </>
  )
}

interface StepMoodProps {
  brief: Brief
  set: <K extends keyof Brief>(k: K, v: Brief[K]) => void
}

/**
 * Step 2: Styling direction and additional event context.
 */
export function StepMood({ brief, set }: StepMoodProps) {
  return (
    <>
      <h2>
        Set the <em>mood</em>
      </h2>
      <p className="sub">Pick a vibe or describe your own. The more detail, the more personal the ideas.</p>
      <div className="vibe-chips" style={{ marginBottom: 20 }}>
        {VIBES[brief.type].map((v) => (
          <button key={v} className={`chip ${brief.vibe === v ? 'on' : ''}`} onClick={() => set('vibe', v)}>
            {v}
          </button>
        ))}
      </div>
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="vibe">Vibe</label>
          <input
            id="vibe"
            className="input"
            value={brief.vibe}
            placeholder="e.g. pastel florals, intimate, live music"
            onChange={(e) => set('vibe', e.target.value)}
          />
        </div>
        <div className="field full">
          <label htmlFor="notes">Anything else?</label>
          <textarea
            id="notes"
            className="input"
            value={brief.notes}
            placeholder="Dietary needs, must-have rituals, accessibility, special surprises…"
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>
      </div>
    </>
  )
}
