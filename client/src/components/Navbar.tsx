import { useEffect, useState } from 'react'
import { ArrowRight, LogIn, LogOut, User as UserIcon } from 'lucide-react'
import { Logo } from './common'
import type { User } from '@soiree/shared'

export type Route = 'home' | 'planner'

interface Props {
  route: Route
  go: (r: Route, anchor?: string) => void
  user: User | null
  onOpenAuth: () => void
  onLogout: () => void
}

export function Navbar({ route, go, user, onOpenAuth, onLogout }: Props) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  const link = (label: string, id: string) => (
    <a
      key={id}
      href={`#/${id}`}
      onClick={(e) => {
        e.preventDefault()
        go('home', id)
      }}
    >
      {label}
    </a>
  )

  return (
    <header className={`nav ${scrolled || route === 'planner' ? 'scrolled' : ''}`}>
      <div className="wrap nav-inner">
        <button className="brand" onClick={() => go('home')} aria-label="Soirée home">
          <Logo /> Soirée
        </button>
        <nav className="nav-links" aria-label="Primary">
          {link('Features', 'features')}
          {link('How it works', 'how')}
          {link('Occasions', 'occasions')}
          {link('Preview', 'preview')}
        </nav>
        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                className={`badge ${user.isGuest ? 'local' : ''}`}
                style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                title={user.email || 'Guest demo user'}
              >
                <UserIcon size={12} /> {user.isGuest ? 'Guest' : (user.email?.split('@')[0] || 'Member')}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={onLogout}
                title="Sign out"
                style={{ padding: '6px 10px' }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={onOpenAuth}>
              <LogIn size={14} /> Sign in
            </button>
          )}

          {route === 'home' ? (
            <button className="btn btn-primary btn-sm" onClick={() => go('planner')}>
              Start planning <ArrowRight size={16} />
            </button>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => go('home')}>
              Back to home
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
