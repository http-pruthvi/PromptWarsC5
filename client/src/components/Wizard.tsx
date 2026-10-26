import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import { todayISO } from '../lib/utils'
import type { Brief, EventType, Plan } from '@soiree/shared'
import { FloralCorner, LoopingLotus } from './Vectors'
import { DEFAULTS, StepEssentials, StepMood, StepTypePick } from './wizard/WizardSteps'

interface Props {
  initialType?: EventType | undefined
  onDone: (p: Plan) => void
}

function WizardGenerating() {
  return (
    <div className="generating" role="status">
      <div style={{ display: 'grid', placeItems: 'center' }}>
        <LoopingLotus size={230} />
      </div>
      <h3>Composing your plan…</h3>
      <p>Balancing your budget, arranging milestones, and shortlisting vendors.</p>
    </div>
  )
}

interface ActionProps {
  step: number
  detailsValid: boolean
  onBack: () => void
  onNext: () => void
  onSubmit: () => void
}

function WizardActions({ step, detailsValid, onBack, onNext, onSubmit }: ActionProps) {
  const isLast = step >= 2
  const nextDisabled = step === 1 && !detailsValid

  return (
    <div className="wizard-actions">
      <button className="btn btn-ghost" onClick={onBack} disabled={step === 0}>
        <ArrowLeft size={16} /> Back
      </button>
      {!isLast ? (
        <button className="btn btn-primary" onClick={onNext} disabled={nextDisabled}>
          Continue <ArrowRight size={16} />
        </button>
      ) : (
        <button className="btn btn-primary" onClick={onSubmit}>
          <Sparkles size={16} /> Generate my plan
        </button>
      )}
    </div>
  )
}

/**
 * Multi-step interactive wizard to configure event brief and generate a new plan.
 */
export default function Wizard({ initialType, onDone }: Props) {
  const first = initialType ?? 'wedding'
  const [step, setStep] = useState(initialType ? 1 : 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [brief, setBrief] = useState<Brief>(() => {
    const d = DEFAULTS[first]
    return {
      type: first,
      title: d.title,
      date: todayISO(d.offset),
      guests: d.guests,
      budget: d.budget,
      currency: 'INR',
      city: '',
      vibe: '',
      notes: '',
    }
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
      try {
        await api.auth.me()
      } catch {
        await api.auth.guest()
      }

      const [res] = await Promise.all([api.plans.create(brief), new Promise((r) => setTimeout(r, 1800))])
      onDone(res.plan)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to compose plan. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="wizard panel">
      <FloralCorner pos="tr" size={130} />
      <FloralCorner pos="bl" size={100} />
      {busy ? (
        <WizardGenerating />
      ) : (
        <>
          <div className="progress" aria-hidden>
            {[0, 1, 2].map((i) => (
              <i key={i} className={i <= step ? 'on' : ''} />
            ))}
          </div>
          {error && (
            <div
              style={{
                background: 'rgba(179, 71, 63, 0.08)',
                border: '1px solid rgba(179, 71, 63, 0.25)',
                color: '#b3473f',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 && <StepTypePick currentType={brief.type} onSelect={chooseType} />}
              {step === 1 && <StepEssentials brief={brief} set={set} detailsValid={detailsValid} />}
              {step === 2 && <StepMood brief={brief} set={set} />}
            </motion.div>
          </AnimatePresence>
          <WizardActions
            step={step}
            detailsValid={detailsValid}
            onBack={() => setStep((s) => Math.max(0, s - 1))}
            onNext={() => setStep((s) => s + 1)}
            onSubmit={submit}
          />
        </>
      )}
    </div>
  )
}
