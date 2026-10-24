import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, LogIn, LogOut, Menu, User as UserIcon, X } from 'lucide-react'
import { Logo } from './common'
import type { User } from '@soiree/shared'

export type Route = 'home' | 'planner' | 'share'

interface Props {
  route: Route
  go: (r: Route, anchor?: string) => void
  user: User | null
  onOpenAuth: () => void
  onLogout: () => void
}

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

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Focus trap inside drawer while open
  useEffect(() => {
    if (!open) return
    const drawer = drawerRef.current
    if (!drawer) return
    const focusable = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length > 0) focusable[0].focus()

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    drawer.addEventListener('keydown', handleTab)
    return () => drawer.removeEventListener('keydown', handleTab)
  }, [open])

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

  return (
    <>
      <header className={`nav ${scrolled || route === 'planner' ? 'scrolled' : ''}`}>
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

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="mobile-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              id="mobile-nav-drawer"
              ref={drawerRef}
              className="mobile-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              <div className="mobile-drawer-head">
                <button className="brand" onClick={() => navigateTo()} aria-label="Soirée home">
                  <Logo /> Soirée
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  style={{ padding: '6px' }}
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="mobile-links" aria-label="Mobile Navigation Links">
                <a href="#/features" onClick={(e) => { e.preventDefault(); navigateTo('features') }}>Features</a>
                <a href="#/how" onClick={(e) => { e.preventDefault(); navigateTo('how') }}>How it works</a>
                <a href="#/occasions" onClick={(e) => { e.preventDefault(); navigateTo('occasions') }}>Occasions</a>
                <a href="#/preview" onClick={(e) => { e.preventDefault(); navigateTo('preview') }}>Preview</a>
              </nav>

              <div className="mobile-drawer-footer">
                {route === 'home' ? (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => { setOpen(false); go('planner') }}
                  >
                    Start planning <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    className="btn btn-ghost"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => { setOpen(false); go('home') }}
                  >
                    Back to home
                  </button>
                )}

                {user ? (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => { setOpen(false); onLogout() }}
                  >
                    <LogOut size={14} style={{ marginRight: 6 }} /> Sign out ({user.isGuest ? 'Guest' : (user.email?.split('@')[0] || 'User')})
                  </button>
                ) : (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => { setOpen(false); onOpenAuth() }}
                  >
                    <LogIn size={14} style={{ marginRight: 6 }} /> Sign in to account
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
