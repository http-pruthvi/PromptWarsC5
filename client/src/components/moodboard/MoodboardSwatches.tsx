import { motion } from 'framer-motion'
import { Copy } from 'lucide-react'
import type { PaletteColor } from '@soiree/shared'

interface Props {
  palette: PaletteColor[]
  copyHex: (hex: string, name: string) => void
}

/**
 * Interactive color swatches grid allowing one-click hex copying.
 */
export function MoodboardSwatches({ palette, copyHex }: Props) {
  return (
    <div className="swatches-grid">
      {palette.map((color, idx) => (
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
  )
}
