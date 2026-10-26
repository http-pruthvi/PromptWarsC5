import { useEffect, useRef, useState } from 'react'
import { ArrowRight, LogIn, LogOut, Menu, User as UserIcon, X } from 'lucide-react'
import { Logo } from './common'
import type { User } from '@soiree/shared'
import { NavMobileDrawer } from './navbar/NavMobileDrawer'

export type Route = 'home' | 'planner' | 'share'

interface Props {
  route: Route
  go: (r: Route, anchor?: string) => void
  user: User | null
  onOpenAuth: () => void
  onLogout: () => void
}

function useDrawerFocusTrap(open: boolean, drawerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!open) return
    const drawer = drawerRef.current
    if (!drawer) return
    const focusable = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length > 0) focusable[0]?.focus()

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }

    drawer.addEventListener('keydown', handleTab)
    return () => drawer.removeEventListener('keydown', handleTab)
  }, [open, drawerRef])
}

function NavUserBadge({
  user,
  onLogout,
  onOpenAuth,
}: {
  user: User | null
  onLogout: () => void
  onOpenAuth: () => void
}) {
  if (!user) {
    return (
      <button className="btn btn-ghost btn-sm" onClick={onOpenAuth}>
        <LogIn size={14} /> Sign in
      </button>
    )
  }

  const name = user.isGuest ? 'Guest' : user.email?.split('@')[0] || 'Member'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        className={`badge ${user.isGuest ? 'local' : ''}`}
        style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
        title={user.email || 'Guest demo user'}
      >
        <UserIcon size={12} /> {name}
      </span>
      <button className="btn btn-ghost btn-sm" onClick={onLogout} title="Sign out" style={{ padding: '6px 10px' }}>
        <LogOut size={14} />
      </button>
    </div>
  )
}

/**
 * Global navigation header for Soirée with responsive links and mobile drawer.
 */
export function Navbar({ route, go, user, onOpenAuth, onLogout }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useDrawerFocusTrap(open, drawerRef)

  const navigateTo = (anchor?: string) => {
    setOpen(false)
    go('home', anchor)
  }

  const link = (label: string, id: string) => (
    <a
      key={id}
      href={`#/${id}`}
      onClick={(e) => {
        e.preventDefault()
        navigateTo(id)
      }}
    >
      {label}
    </a>
  )

  const isScrolled = scrolled || route === 'planner'

  return (
    <>
      <header className={`nav ${isScrolled ? 'scrolled' : ''}`}>
        <div className="wrap nav-inner">
          <button className="brand" onClick={() => navigateTo()} aria-label="Soirée home">
            <Logo /> Soirée
          </button>
          <nav className="nav-links" aria-label="Primary">
            {link('Features', 'features')}
            {link('How it works', 'how')}
            {link('Occasions', 'occasions')}
            {link('Preview', 'preview')}
          </nav>
          <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <NavUserBadge user={user} onLogout={onLogout} onOpenAuth={onOpenAuth} />

            {route === 'home' ? (
              <button className="btn btn-primary btn-sm" onClick={() => go('planner')}>
                Start planning <ArrowRight size={16} />
              </button>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => go('home')}>
                Back to home
              </button>
            )}

            <button
              className="nav-burger"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={open}
              aria-controls="mobile-nav-drawer"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <NavMobileDrawer
        open={open}
        setOpen={setOpen}
        drawerRef={drawerRef}
        route={route}
        go={go}
        user={user}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
        navigateTo={navigateTo}
      />
    </>
  )
}
