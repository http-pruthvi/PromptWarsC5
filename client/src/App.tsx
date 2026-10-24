import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import type { EventType, User } from '@soiree/shared'
import { api } from './lib/api'
import { AuthModal } from './components/AuthModal'
import { Landing } from './components/Landing'
import { Navbar } from './components/Navbar'
import type { Route } from './components/Navbar'
import { Planner } from './components/Planner'
import { Petals, Toast } from './components/common'
import { ScrollVine, VectorDefs } from './components/Vectors'
import { SharedPlanPage } from './components/SharedPlanPage'

interface RouteState {
  route: Route
  token?: string
}

const readRoute = (): RouteState => {
  const hash = window.location.hash
  if (hash.startsWith('#/share/')) {
    return { route: 'share', token: hash.replace('#/share/', '').trim() }
  }
  if (hash.startsWith('#/planner')) {
    return { route: 'planner' }
  }
  return { route: 'home' }
}

export default function App() {
  const [routeState, setRouteState] = useState<RouteState>(readRoute)
  const route = routeState.route
  const [user, setUser] = useState<User | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [preset, setPreset] = useState<EventType | undefined>()
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [plannerKey, setPlannerKey] = useState(0)

  // Sync route from URL hash
  useEffect(() => {
    const on = () => setRouteState(readRoute())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  // Check initial user authentication session
  useEffect(() => {
    api.auth
      .me()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
  }, [])

  const toast = useCallback((m: string) => {
    setToastMsg(m)
    window.setTimeout(() => setToastMsg(null), 2600)
  }, [])

  const go = useCallback((r: Route, anchor?: string) => {
    if (r === 'planner') {
      window.location.hash = '#/planner'
      window.scrollTo({ top: 0 })
      return
    }
    window.location.hash = '#/'
    setRouteState({ route: 'home' })
    window.setTimeout(() => {
      if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' })
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 60)
  }, [])

  const start = useCallback(
    (type?: EventType) => {
      setPreset(type)
      setPlannerKey((k) => k + 1)
      go('planner')
    },
    [go],
  )

  const handleLogout = async () => {
    try {
      await api.auth.logout()
      setUser(null)
      toast('Signed out successfully')
    } catch {
      toast('Failed to sign out')
    }
  }

  const handleAuthSuccess = (u: User) => {
    setUser(u)
    setShowAuth(false)
    toast(u.isGuest ? 'Welcome to Soirée (Guest Mode ✨)' : `Welcome back, ${u.email?.split('@')[0]}!`)
  }

  return (
    <>
      <VectorDefs />
      <ScrollVine />
      <Petals />
      <Navbar
        route={route}
        go={go}
        user={user}
        onOpenAuth={() => setShowAuth(true)}
        onLogout={handleLogout}
      />

      <AnimatePresence mode="wait">
        {route === 'share' ? (
          <SharedPlanPage
            key={`share-${routeState.token}`}
            token={routeState.token || ''}
            onStartPlanning={() => start()}
            onGoHome={() => go('home')}
          />
        ) : route === 'home' ? (
          <Landing key="home" onStart={start} />
        ) : (
          <Planner
            key={`planner-${plannerKey}`}
            presetType={preset}
            user={user}
            onRequireAuth={() => setShowAuth(true)}
            toast={toast}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAuth && (
          <AuthModal
            onSuccess={handleAuthSuccess}
            onClose={() => setShowAuth(false)}
          />
        )}
      </AnimatePresence>

      <Toast message={toastMsg} />
    </>
  )
}
