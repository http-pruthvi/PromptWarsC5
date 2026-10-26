import React from 'react'
import { Sparkles, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react'

export interface FormProps {
  mode: 'login' | 'register'
  email: string
  password: string
  busy: boolean
  setEmail: (val: string) => void
  setPassword: (val: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export function GuestDemoBanner({ onGuest, busy }: { onGuest: () => void; busy: boolean }) {
  return (
    <div
      style={{
        marginBottom: 22,
        padding: 14,
        background: 'rgba(197, 160, 89, 0.08)',
        borderRadius: 14,
        border: '1px solid rgba(197, 160, 89, 0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--gold-deep)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Sparkles size={14} /> Evaluation & Instant Demo
        </span>
        <span className="badge local" style={{ fontSize: 11, padding: '2px 6px' }}>
          Zero-Config
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text)', opacity: 0.85, margin: '0 0 10px 0' }}>
        Judging or testing? Skip registration and enter immediately as a guest. All features and plans persist in local
        database storage.
      </p>
      <button
        type="button"
        className="btn btn-primary"
        style={{ width: '100%', justifyContent: 'center' }}
        onClick={onGuest}
        disabled={busy}
      >
        <UserCheck size={16} /> Continue as Guest (1-Click)
      </button>
    </div>
  )
}

export function AuthForm({ mode, email, password, busy, setEmail, setPassword, onSubmit }: FormProps) {
  const isRegister = mode === 'register'
  return (
    <form onSubmit={onSubmit}>
      <div className="field full" style={{ marginBottom: 12 }}>
        <label htmlFor="auth-email" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Mail size={13} /> Email Address
        </label>
        <input
          id="auth-email"
          type="email"
          className="input"
          placeholder="you@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="field full" style={{ marginBottom: 18 }}>
        <label htmlFor="auth-pass" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Lock size={13} /> Password
        </label>
        <input
          id="auth-pass"
          type="password"
          className="input"
          placeholder={isRegister ? 'At least 6 characters' : 'Enter password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={isRegister ? 6 : 1}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%', justifyContent: 'center' }}
        disabled={busy}
      >
        {busy ? 'Please wait…' : isRegister ? 'Create Account' : 'Sign In'}
        {!busy && <ArrowRight size={16} />}
      </button>
    </form>
  )
}

export function AuthModalHeader({ mode }: { mode: 'login' | 'register' }) {
  const isLogin = mode === 'login'
  return (
    <div style={{ textAlign: 'center', marginBottom: 20 }}>
      <span className="badge" style={{ marginBottom: 10 }}>
        Personal Event Concierge
      </span>
      <h3 id="auth-modal-title" style={{ fontFamily: 'var(--serif)', fontSize: 32, marginBottom: 6 }}>
        {isLogin ? 'Welcome back to Soirée' : 'Begin your celebration'}
      </h3>
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>
        {isLogin
          ? 'Access your saved luxury event plans & timelines'
          : 'Create an account to save and orchestrate events'}
      </p>
    </div>
  )
}
