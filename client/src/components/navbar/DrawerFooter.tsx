import { ArrowRight, LogIn, LogOut, Pause, Play } from 'lucide-react'
import type { User } from '@soiree/shared'
import type { Route } from '../Navbar'

function DrawerMotionToggle({
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
      style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
      onClick={onToggleMotion}
      aria-pressed={motionPaused}
    >
      {motionPaused ? <Play size={14} style={{ marginRight: 6 }} /> : <Pause size={14} style={{ marginRight: 6 }} />}
      {label}
    </button>
  )
}

function DrawerAuthAction({
  user,
  onLogout,
  onOpenAuth,
  onClose,
}: {
  user: User | null
  onLogout: () => void
  onOpenAuth: () => void
  onClose: () => void
}) {
  if (user) {
    const displayName = user.isGuest ? 'Guest' : user.email?.split('@')[0] || 'User'
    return (
      <button
        className="btn btn-ghost btn-sm"
        style={{ width: '100%', justifyContent: 'center' }}
        onClick={() => {
          onClose()
          onLogout()
        }}
      >
        <LogOut size={14} style={{ marginRight: 6 }} /> Sign out ({displayName})
      </button>
    )
  }
  return (
    <button
      className="btn btn-ghost btn-sm"
      style={{ width: '100%', justifyContent: 'center' }}
      onClick={() => {
        onClose()
        onOpenAuth()
      }}
    >
      <LogIn size={14} style={{ marginRight: 6 }} /> Sign in to account
    </button>
  )
}

function DrawerCta({ route, go, onClose }: { route: Route; go: (r: Route) => void; onClose: () => void }) {
  if (route === 'home') {
    return (
      <button
        className="btn btn-primary"
        style={{ width: '100%', justifyContent: 'center' }}
        onClick={() => {
          onClose()
          go('planner')
        }}
      >
        Start planning <ArrowRight size={16} />
      </button>
    )
  }
  return (
    <button
      className="btn btn-ghost"
      style={{ width: '100%', justifyContent: 'center' }}
      onClick={() => {
        onClose()
        go('home')
      }}
    >
      Back to home
    </button>
  )
}

export function DrawerFooter({
  route,
  go,
  user,
  onLogout,
  onOpenAuth,
  close,
  motionPaused,
  onToggleMotion,
}: {
  route: Route
  go: (r: Route) => void
  user: User | null
  onLogout: () => void
  onOpenAuth: () => void
  close: () => void
  motionPaused?: boolean | undefined
  onToggleMotion?: (() => void) | undefined
}) {
  return (
    <div className="mobile-drawer-footer">
      <DrawerCta route={route} go={go} onClose={close} />
      <DrawerAuthAction user={user} onLogout={onLogout} onOpenAuth={onOpenAuth} onClose={close} />
      <DrawerMotionToggle motionPaused={motionPaused ?? false} onToggleMotion={onToggleMotion} />
    </div>
  )
}
