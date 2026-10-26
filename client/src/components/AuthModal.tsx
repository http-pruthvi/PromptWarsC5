import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { api } from '../lib/api.js'
import type { User } from '@soiree/shared'
import { AuthForm, GuestDemoBanner, AuthModalHeader } from './auth/AuthForm.js'

interface Props {
  onSuccess: (user: User) => void
  onClose?: () => void
  initialMode?: 'login' | 'register'
}

export default function AuthModal({ onSuccess, onClose, initialMode = 'login' }: Props) {
  const shouldReduceMotion = useReducedMotion()
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = mode === 'register' ? await api.auth.register(email, password) : await api.auth.login(email, password)
      onSuccess(res.user)
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setError(apiErr?.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setBusy(false)
    }
  }

  const handleGuest = async () => {
    setError(null)
    setBusy(true)
    try {
      const res = await api.auth.guest()
      onSuccess(res.user)
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setError(apiErr?.message || 'Guest login failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <motion.div
        className="modal"
        style={{ maxWidth: 460 }}
        onClick={(e) => e.stopPropagation()}
        initial={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -8 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {onClose && (
          <button
            type="button"
            className="link-btn"
            style={{ position: 'absolute', top: 16, right: 16 }}
            onClick={onClose}
            aria-label="Close authentication dialog"
          >
            <X size={18} />
          </button>
        )}

        <AuthModalHeader mode={mode} />

        <GuestDemoBanner onGuest={handleGuest} busy={busy} />

        <div
          style={{
            display: 'flex',
            gap: 6,
            marginBottom: 16,
            padding: 4,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 10,
          }}
        >
          <button
            type="button"
            className={`btn ${mode === 'login' ? 'btn-primary' : ''}`}
            style={{ flex: 1, justifyContent: 'center', fontSize: 13, padding: '7px 12px' }}
            onClick={() => {
              setMode('login')
              setError(null)
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`btn ${mode === 'register' ? 'btn-primary' : ''}`}
            style={{ flex: 1, justifyContent: 'center', fontSize: 13, padding: '7px 12px' }}
            onClick={() => {
              setMode('register')
              setError(null)
            }}
          >
            Create Account
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                marginBottom: 14,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: 13,
              }}
              role="alert"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AuthForm
          mode={mode}
          email={email}
          password={password}
          busy={busy}
          setEmail={setEmail}
          setPassword={setPassword}
          onSubmit={handleSubmit}
        />
      </motion.div>
    </div>
  )
}
