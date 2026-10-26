import { useState } from 'react'
import { Copy, Music, Sparkles, Type } from 'lucide-react'
import type { Moodboard } from '@soiree/shared'

interface Props {
  moodboard: Moodboard
}

/**
 * Moodboard and palette display card for shared public event view.
 */
export function SharedMoodboardSection({ moodboard }: Props) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null)

  const copyHex = (hex: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(hex).catch(() => {})
    }
    setCopiedHex(hex)
    setTimeout(() => setCopiedHex(null), 2000)
  }

  return (
    <div className="panel" style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Sparkles size={20} style={{ color: 'var(--gold-deep)' }} />
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, margin: 0 }}>Color Palette & Moodboard</h2>
      </div>

      <div className="swatches-grid" style={{ marginBottom: 24 }}>
        {moodboard.palette.map((color, idx) => (
          <div
            key={idx}
            className="swatch-card"
            onClick={() => copyHex(color.hex)}
            role="button"
            tabIndex={0}
            aria-label={`Copy hex ${color.hex}`}
          >
            <div className="swatch-color" style={{ backgroundColor: color.hex }}>
              <span className="swatch-copy-hint">
                <Copy size={11} /> {copiedHex === color.hex ? 'Copied!' : 'Copy Hex'}
              </span>
            </div>
            <div className="swatch-meta">
              <span className="swatch-role">{color.role}</span>
              <span className="swatch-name">{color.name}</span>
              <span className="swatch-hex">
                <code>{color.hex.toUpperCase()}</code>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="moodboard-bento">
        <div className="mb-card">
          <div className="mb-card-title">
            <Type size={16} /> Typography & Calligraphy
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div>
              <small style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase' }}>Heading Font</small>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--plum)' }}>
                {moodboard.typography.heading}
              </div>
            </div>
            <div>
              <small style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase' }}>Body Font</small>
              <div style={{ fontSize: 15 }}>{moodboard.typography.body}</div>
            </div>
            <div style={{ fontStyle: 'italic', fontSize: 13, color: 'var(--muted)' }}>
              “{moodboard.typography.vibe}”
            </div>
          </div>
        </div>

        <div className="mb-card">
          <div className="mb-card-title">
            <Sparkles size={16} /> Signature Motifs
          </div>
          <div className="mb-chips">
            {moodboard.motifs.map((motif, i) => (
              <span key={i} className="mb-chip">
                ✦ {motif}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-card">
          <div className="mb-card-title">
            <Sparkles size={16} /> Decor Accents
          </div>
          <ul className="mb-list">
            {moodboard.decor.map((item, i) => (
              <li key={i}>
                <span style={{ color: 'var(--gold)' }}>✦</span> {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-card">
          <div className="mb-card-title">
            <Music size={16} /> Musical Atmosphere
          </div>
          <div className="mb-chips">
            {moodboard.playlistVibes.map((item, i) => (
              <span key={i} className="mb-chip">
                ♫ {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
