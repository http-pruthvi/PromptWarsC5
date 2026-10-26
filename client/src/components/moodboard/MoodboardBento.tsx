import { Music, Sparkle, Sparkles, Type } from 'lucide-react'
import type { Moodboard } from '@soiree/shared'

interface Props {
  moodboard: Moodboard
}

/**
 * Bento grid layout for typography, motifs, decor, textiles, and musical atmosphere.
 */
export function MoodboardBento({ moodboard: mb }: Props) {
  return (
    <div className="moodboard-bento">
      <div className="mb-card">
        <div className="mb-card-title">
          <Type size={16} /> Typography & Calligraphy Pairing
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 14,
              background: 'rgba(247,239,229,.6)',
              border: '1px solid rgba(196,160,90,.2)',
            }}
          >
            <small
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              Headline Typeface
            </small>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--plum)', fontWeight: 600 }}>
              {mb.typography.heading}
            </div>
          </div>
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 14,
              background: 'rgba(247,239,229,.6)',
              border: '1px solid rgba(196,160,90,.2)',
            }}
          >
            <small
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              Body & Detail Typeface
            </small>
            <div style={{ fontSize: 16, color: 'var(--ink)', fontWeight: 500 }}>{mb.typography.body}</div>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', fontStyle: 'italic', paddingLeft: 4 }}>
            Vibe: “{mb.typography.vibe}”
          </div>
        </div>
      </div>

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

      <div className="mb-card" style={{ gridColumn: '1 / -1' }}>
        <div className="mb-card-title">
          <Music size={16} /> Soundscape & Playlist Atmospheres
        </div>
        <div className="mb-chips">
          {mb.playlistVibes.map((vib, i) => (
            <span
              key={i}
              className="mb-chip"
              style={{ background: 'rgba(255,255,255,0.85)', padding: '9px 16px', fontSize: 13.5 }}
            >
              <Music size={13} style={{ color: 'var(--gold-deep)' }} />
              {vib}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
