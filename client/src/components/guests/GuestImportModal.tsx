import { AnimatePresence, motion } from 'framer-motion'
import { Upload, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Props {
  show: boolean
  onClose: () => void
  onImport: (text: string) => Promise<void>
  importing: boolean
}

/**
 * Bulk modal dialog to parse and add multi-line pasted guest names.
 */
export function GuestImportModal({ show, onClose, onImport, importing }: Props) {
  const [importText, setImportText] = useState('')

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show && !importing) {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [show, importing, onClose])

  const importLineCount = importText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean).length

  const handleConfirm = async () => {
    if (!importText.trim() || importing) return
    await onImport(importText)
    setImportText('')
  }

  return (
    <AnimatePresence>
      {show && (
        <div className="auth-overlay" onClick={() => !importing && onClose()} role="presentation">
          <motion.div
            className="auth-card"
            style={{ maxWidth: 520, width: '92%' }}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-modal-title"
          >
            <button className="auth-close" onClick={() => !importing && onClose()} aria-label="Close import dialog">
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
                <Upload size={22} />
              </div>
              <div>
                <h3 id="import-modal-title" style={{ fontFamily: 'var(--serif)', fontSize: 26, margin: 0 }}>
                  Bulk Paste Guest List
                </h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '2px 0 0' }}>
                  Paste guest or party names below, one per line (up to 500).
                </p>
              </div>
            </div>

            <textarea
              className="moodboard-input"
              style={{
                width: '100%',
                minHeight: 180,
                borderRadius: 14,
                fontFamily: 'monospace',
                fontSize: 13,
                resize: 'vertical',
                boxSizing: 'border-box',
                marginBottom: 14,
              }}
              placeholder={`Aarav & Priya Sharma\nVikram Malhotra\nSunita Sen\nDevendra Rajput\nAnanya Verma...`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              disabled={importing}
              aria-label="Pasted guest names, one per line"
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                {importLineCount > 0
                  ? `${importLineCount} guest ${importLineCount === 1 ? 'name' : 'names'} detected`
                  : 'Waiting for pasted names...'}
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" onClick={onClose} disabled={importing} style={{ background: 'transparent' }}>
                  Cancel
                </button>
                <button className="btn btn-gold" onClick={handleConfirm} disabled={importing || importLineCount === 0}>
                  {importing ? 'Importing...' : `Import ${importLineCount || ''} Guests`}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
