import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { ArrowRight, LogIn, LogOut, Menu, User as UserIcon, X, Pause, Play } from 'lucide-react'
import { Logo } from './common'
import type { User } from '@soiree/shared'
import { NavMobileDrawer } from './navbar/NavMobileDrawer'
import { useDrawerFocusTrap } from './navbar/useDrawerFocusTrap'

export type Route = 'home' | 'planner' | 'share'

interface Props {
  route: Route
  go: (r: Route, anchor?: string) => void
  user: User | null
  onOpenAuth: () => void
  onLogout: () => void
  motionPaused?: boolean | undefined
  onToggleMotion?: (() => void) | undefined
}

function useNavState(route: Route) {
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

  const isScrolled = scrolled || route === 'planner'
  return { open, setOpen, drawerRef, isScrolled }
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

function NavMotionToggle({
  motionPaused,
  onToggleMotion,
}: {
  motionPaused: boolean
  onToggleMotion?: (() => void) | undefined
}) {
  if (!onToggleMotion) return null
  const label = motionPaused ? 'Resume animations' : 'Pause animations'
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={onToggleMotion}
      aria-label={label}
      title={label}
      aria-pressed={motionPaused}
      style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}
    >
      {motionPaused ? <Play size={15} /> : <Pause size={15} />}
    </button>
  )
}

function NavRouteButton({ route, go }: { route: Route; go: (r: Route) => void }) {
  if (route === 'home') {
    return (
      <button className="btn btn-primary btn-sm" onClick={() => go('planner')}>
        Start planning <ArrowRight size={16} />
      </button>
    )
  }
  return (
    <button className="btn btn-ghost btn-sm" onClick={() => go('home')}>
      Back to home
    </button>
  )
}

function NavLinks({ navigateTo }: { navigateTo: (anchor: string) => void }) {
  const items: Array<{ id: string; label: string }> = [
    { id: 'features', label: 'Features' },
    { id: 'how', label: 'How it works' },
    { id: 'occasions', label: 'Occasions' },
    { id: 'preview', label: 'Preview' },
  ]
  return (
    <nav className="nav-links" aria-label="Primary">
      {items.map(({ id, label }) => (
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
      ))}
    </nav>
  )
}

function NavHeaderActions({
  user,
  onLogout,
  onOpenAuth,
  motionPaused,
  onToggleMotion,
  route,
  go,
  open,
  setOpen,
}: {
  user: User | null
  onLogout: () => void
  onOpenAuth: () => void
  motionPaused: boolean
  onToggleMotion?: (() => void) | undefined
  route: Route
  go: (r: Route) => void
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}) {
  return (
    <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <NavUserBadge user={user} onLogout={onLogout} onOpenAuth={onOpenAuth} />
      <NavMotionToggle motionPaused={motionPaused} onToggleMotion={onToggleMotion} />
      <NavRouteButton route={route} go={go} />
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
  )
}

/**
 * Global navigation header for Soirée with responsive links and mobile drawer.
 */
export function Navbar({ route, go, user, onOpenAuth, onLogout, motionPaused = false, onToggleMotion }: Props) {
  const { open, setOpen, drawerRef, isScrolled } = useNavState(route)
  const navigateTo = (anchor?: string) => {
    setOpen(false)
    go('home', anchor)
  }

  return (
    <>
      <header className={`nav ${isScrolled ? 'scrolled' : ''}`}>
        <div className="wrap nav-inner">
          <button className="brand" onClick={() => navigateTo()} aria-label="Soirée home">
            <Logo /> Soirée
          </button>
          <NavLinks navigateTo={navigateTo} />
          <NavHeaderActions
            user={user}
            onLogout={onLogout}
            onOpenAuth={onOpenAuth}
            motionPaused={motionPaused}
            onToggleMotion={onToggleMotion}
            route={route}
            go={go}
            open={open}
            setOpen={setOpen}
          />
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
        motionPaused={motionPaused}
        onToggleMotion={onToggleMotion}
      />
    </>
  )
}
