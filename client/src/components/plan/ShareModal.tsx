import { AnimatePresence, motion } from 'framer-motion'
import { Copy, Share2, ShieldCheck, X } from 'lucide-react'

interface ShareData {
  shareToken: string | null
  shareEnabled: boolean
}

interface Props {
  show: boolean
  onClose: () => void
  shareData: ShareData | null
  busyShare: boolean
  toggleShareEnabled: () => Promise<void>
  copyShareLink: () => void
}

function SharePrivacyNotice() {
  return (
    <div
      style={{
        background: 'rgba(247,239,229,0.7)',
        border: '1px solid rgba(196,160,90,0.25)',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--gold-deep)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 8,
        }}
      >
        <ShieldCheck size={16} /> Privacy & Visibility Notice
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
        <li>
          <b>Visible to viewers:</b> Title, event date, city, celebration overview, milestone timeline, vendor category
          statuses, creative ideas, and aesthetic moodboard.
        </li>
        <li style={{ marginTop: 4 }}>
          <b>Confidential (Hidden):</b> Exact budget allocations, spend tracking, confidential notes, chat history, and
          account email.
        </li>
      </ul>
    </div>
  )
}

function ShareLinkControls({ token, onCopy }: { token: string; onCopy: () => void }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <label
        style={{
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--muted)',
          fontWeight: 600,
        }}
      >
        Shareable URL
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          readOnly
          className="input"
          aria-label="Shareable URL"
          value={`${origin}/#/share/${token}`}
          style={{ fontSize: 13, padding: '10px 14px' }}
        />
        <button className="btn btn-secondary" onClick={onCopy} style={{ gap: 6, whiteSpace: 'nowrap' }}>
          <Copy size={15} /> Copy
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <a
          href={`/#/share/${token}`}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 12.5, color: 'var(--gold-deep)', textDecoration: 'underline' }}
        >
          Preview public view ↗
        </a>
      </div>
    </div>
  )
}

export function ShareModal({ show, onClose, shareData, busyShare, toggleShareEnabled, copyShareLink }: Props) {
  const isEnabled = Boolean(shareData?.shareEnabled)
  return (
    <AnimatePresence>
      {show && (
        <div className="auth-overlay" onClick={onClose} role="presentation">
          <motion.div
            className="auth-card"
            style={{ maxWidth: 520, width: '92%' }}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-modal-title"
          >
            <button className="auth-close" onClick={onClose} aria-label="Close share dialog">
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div
                style={{
                  padding: 10,
                  borderRadius: '50%',
                  background: 'rgba(212,175,55,0.15)',
                  color: 'var(--gold-deep)',
                }}
              >
                <Share2 size={22} />
              </div>
              <h3 id="share-modal-title" style={{ fontFamily: 'var(--serif)', fontSize: 28, margin: 0 }}>
                Share Celebration Plan
              </h3>
            </div>

            <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 18px', lineHeight: 1.45 }}>
              Generate an elegant, read-only link to share with loved ones, co-hosts, or vendors.
            </p>

            <SharePrivacyNotice />

            <div style={{ display: 'grid', gap: 14 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: 14,
                  background: '#fff',
                  border: '1px solid var(--line)',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14, display: 'block' }}>Public Link Access</span>
                  <small style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {isEnabled ? 'Link is active and accessible' : 'Link is currently revoked and inactive'}
                  </small>
                </div>
                <button
                  className={`btn btn-sm ${isEnabled ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={toggleShareEnabled}
                  disabled={busyShare}
                  style={{
                    minWidth: 100,
                    color: isEnabled ? 'var(--ink)' : '#fffaf0',
                  }}
                >
                  {isEnabled ? 'Revoke link' : 'Enable link'}
                </button>
              </div>

              {isEnabled && shareData?.shareToken && (
                <ShareLinkControls token={shareData.shareToken} onCopy={copyShareLink} />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
