import { Palette, RefreshCw, Wand2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Moodboard, Plan } from '@soiree/shared'
import { api } from '../../lib/api'
import { LoopingLotus } from '../Vectors'
import { MoodboardSwatches } from '../moodboard/MoodboardSwatches'
import { MoodboardBento } from '../moodboard/MoodboardBento'

interface Props {
  plan: Plan
  toast: (m: string) => void
}

/**
 * MoodboardTab renders the aesthetic color story and tactile design bento grid.
 */
export default function MoodboardTab({ plan, toast }: Props) {
  const [data, setData] = useState<{ moodboard: Moodboard; generatedBy: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [extra, setExtra] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    api.plans
      .getMoodboard(plan.id)
      .then((res) => {
        if (active) {
          setData(res)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const apiErr = err as { status?: number; message?: string }
          if (apiErr?.status === 404) {
            setData(null)
          } else {
            setError(apiErr?.message || 'Failed to load moodboard')
          }
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [plan.id])

  const handleGenerate = async (steeringPrompt?: string) => {
    setGenerating(true)
    setError(null)
    try {
      const res = await api.plans.generateMoodboard(plan.id, steeringPrompt)
      setData(res)
      toast(steeringPrompt ? 'Moodboard regenerated with your vision!' : 'Moodboard generated successfully!')
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setError(apiErr?.message || 'Failed to generate moodboard. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const copyHex = (hex: string, name: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(hex).catch(() => {})
    }
    toast(`Copied ${hex} (${name}) to clipboard!`)
  }

  if (loading || generating) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: '70px 20px' }}>
        <LoopingLotus size={160} />
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 32, marginTop: 24, marginBottom: 8, color: 'var(--plum)' }}>
          {generating ? 'Composing Visual Moodboard & Color Story…' : 'Loading Bespoke Palette…'}
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: 15, maxWidth: 460, margin: '0 auto' }}>
          Harmonizing editorial color pigments, tactile decor accents, typography pairings, and celebration motifs.
        </p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: '70px 24px' }}>
        <div
          style={{
            display: 'inline-flex',
            padding: 20,
            borderRadius: '50%',
            background: 'rgba(212,175,55,0.12)',
            color: 'var(--gold-deep)',
            marginBottom: 18,
          }}
        >
          <Palette size={44} />
        </div>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 36, marginBottom: 10, color: 'var(--plum)' }}>
          No Moodboard Generated Yet
        </h3>
        <p style={{ color: 'var(--muted)', maxWidth: 520, margin: '0 auto 28px', fontSize: 16, lineHeight: 1.5 }}>
          Explore an editorial 5-color palette, typography pairings, decor textures, and attire inspirations tailored to
          your {plan.brief.type} celebration.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => void handleGenerate()}
          style={{ gap: 10, padding: '14px 28px', fontSize: 15 }}
        >
          <Wand2 size={18} /> Generate Moodboard
        </button>
      </div>
    )
  }

  const mb = data.moodboard

  return (
    <div className="moodboard-wrap">
      <div className="moodboard-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h3>Color Story & Aesthetic Moodboard</h3>
            <span className={`badge ${data.generatedBy === 'offline' ? 'local' : ''}`}>
              {data.generatedBy === 'gemini' ? 'AI Crafted' : 'Procedural Harmony'}
            </span>
          </div>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: 14 }}>
            Click any color tile to copy its hex code directly to your clipboard.
          </p>
        </div>

        <form
          className="moodboard-controls"
          onSubmit={(e) => {
            e.preventDefault()
            void handleGenerate(extra)
          }}
        >
          <input
            className="moodboard-input"
            aria-label="Steer moodboard vision"
            placeholder="Steer vision (e.g. 'More jewel tones', 'Sunset warmth')…"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
          />
          <button className="btn btn-secondary" type="submit" style={{ gap: 8 }}>
            <RefreshCw size={14} /> Regenerate
          </button>
        </form>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 18px',
            background: '#fdf2f2',
            border: '1px solid #f8d7da',
            color: '#842029',
            borderRadius: 12,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      <MoodboardSwatches palette={mb.palette} copyHex={copyHex} />
      <MoodboardBento moodboard={mb} />
    </div>
  )
}
