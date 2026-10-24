import { motion } from 'framer-motion'
import { Copy, Music, Palette, RefreshCw, Sparkle, Sparkles, Type, Wand2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Moodboard, Plan } from '@soiree/shared'
import { api } from '../../lib/api'
import { LoopingLotus } from '../Vectors'

interface Props {
  plan: Plan
  toast: (m: string) => void
}

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
      .catch((err: any) => {
        if (active) {
          if (err?.status === 404) {
            setData(null)
          } else {
            setError(err?.message || 'Failed to load moodboard')
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
    } catch (err: any) {
      setError(err?.message || 'Failed to generate moodboard. Please try again.')
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
        <div style={{ display: 'inline-flex', padding: 20, borderRadius: '50%', background: 'rgba(212,175,55,0.12)', color: 'var(--gold-deep)', marginBottom: 18 }}>
          <Palette size={44} />
        </div>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 36, marginBottom: 10, color: 'var(--plum)' }}>
          No Moodboard Generated Yet
        </h3>
        <p style={{ color: 'var(--muted)', maxWidth: 520, margin: '0 auto 28px', fontSize: 16, lineHeight: 1.5 }}>
          Explore an editorial 5-color palette, typography pairings, decor textures, and attire inspirations tailored to your {plan.brief.type} celebration.
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
        <div style={{ padding: '12px 18px', background: '#fdf2f2', border: '1px solid #f8d7da', color: '#842029', borderRadius: 12, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Palette Swatches */}
      <div>
        <div className="swatches-grid">
          {mb.palette.map((color, idx) => (
            <motion.div
              key={color.hex + idx}
              className="swatch-card"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.4 }}
              onClick={() => copyHex(color.hex, color.name)}
              role="button"
              tabIndex={0}
              aria-label={`Copy hex code for ${color.name}: ${color.hex}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  copyHex(color.hex, color.name)
                }
              }}
            >
              <div className="swatch-color" style={{ backgroundColor: color.hex }}>
                <span className="swatch-copy-hint">
                  <Copy size={11} /> Copy Hex
                </span>
              </div>
              <div className="swatch-meta">
                <span className="swatch-role">{color.role}</span>
                <span className="swatch-name" title={color.name}>
                  {color.name}
                </span>
                <span className="swatch-hex">
                  <code>{color.hex.toUpperCase()}</code>
                  <Copy size={10} style={{ opacity: 0.6 }} />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bento Grid: Typography, Motifs, Decor, Outfits, Music */}
      <div className="moodboard-bento">
        {/* Typography Card */}
        <div className="mb-card">
          <div className="mb-card-title">
            <Type size={16} /> Typography & Calligraphy Pairing
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(247,239,229,.6)', border: '1px solid rgba(196,160,90,.2)' }}>
              <small style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                Headline Typeface
              </small>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--plum)', fontWeight: 600 }}>
                {mb.typography.heading}
              </div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(247,239,229,.6)', border: '1px solid rgba(196,160,90,.2)' }}>
              <small style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                Body & Detail Typeface
              </small>
              <div style={{ fontSize: 16, color: 'var(--ink)', fontWeight: 500 }}>
                {mb.typography.body}
              </div>
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', fontStyle: 'italic', paddingLeft: 4 }}>
              Vibe: “{mb.typography.vibe}”
            </div>
          </div>
        </div>

        {/* Motifs Card */}
        <div className="mb-card">
          <div className="mb-card-title">
            <Sparkles size={16} /> Signature Motifs & Symbols
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
            Visual emblems and repeating patterns for stationery, signage, and backdrop arches:
          </p>
          <div className="mb-chips">
            {mb.motifs.map((motif, i) => (
              <span key={i} className="mb-chip">
                <Sparkle size={12} style={{ color: 'var(--gold)' }} />
                {motif}
              </span>
            ))}
          </div>
        </div>

        {/* Decor Styling Card */}
        <div className="mb-card">
          <div className="mb-card-title">
            <Sparkles size={16} /> Decor & Spatial Textures
          </div>
          <ul className="mb-list">
            {mb.decor.map((item, i) => (
              <li key={i}>
                <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>✦</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Outfit & Attire Styling Card */}
        <div className="mb-card">
          <div className="mb-card-title">
            <Sparkles size={16} /> Attire, Textiles & Jewelry
          </div>
          <ul className="mb-list">
            {mb.outfitNotes.map((item, i) => (
              <li key={i}>
                <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>✦</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Musical Mood / Playlist Card */}
        <div className="mb-card" style={{ gridColumn: '1 / -1' }}>
          <div className="mb-card-title">
            <Music size={16} /> Soundscape & Playlist Atmospheres
          </div>
          <div className="mb-chips">
            {mb.playlistVibes.map((vib, i) => (
              <span key={i} className="mb-chip" style={{ background: 'rgba(255,255,255,0.85)', padding: '9px 16px', fontSize: 13.5 }}>
                <Music size={13} style={{ color: 'var(--gold-deep)' }} />
                {vib}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
