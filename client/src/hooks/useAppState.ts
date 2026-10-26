import { useCallback, useEffect, useState } from 'react'
import type { EventType, User } from '@soiree/shared'
import { api } from '../lib/api'
import type { Route } from '../components/Navbar'

export interface RouteState {
  route: Route
  token?: string
}

export const readRoute = (): RouteState => {
  const hash = window.location.hash
  if (hash.startsWith('#/share/')) {
    return { route: 'share', token: hash.replace('#/share/', '').trim() }
  }
  if (hash.startsWith('#/planner')) {
    return { route: 'planner' }
  }
  return { route: 'home' }
}

function useNavigationState() {
  const [routeState, setRouteState] = useState<RouteState>(readRoute)

  useEffect(() => {
    const on = () => setRouteState(readRoute())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
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

  return { routeState, route: routeState.route, go }
}

function useAuthSession(toast: (m: string) => void) {
  const [user, setUser] = useState<User | null>(null)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    api.auth
      .me()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
  }, [])

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

  return { user, showAuth, setShowAuth, handleLogout, handleAuthSuccess }
}

function useTabVisibility() {
  useEffect(() => {
    const onVisibility = () => {
      document.body.classList.toggle('tab-hidden', document.hidden)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
}

/**
 * Custom hook encapsulating global application routing, auth session, and toast state.
 */
export function useAppState() {
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [preset, setPreset] = useState<EventType | undefined>()
  const [plannerKey, setPlannerKey] = useState(0)

  const toast = useCallback((m: string) => {
    setToastMsg(m)
    window.setTimeout(() => setToastMsg(null), 2600)
  }, [])

  const nav = useNavigationState()
  const auth = useAuthSession(toast)
  useTabVisibility()

  const start = useCallback(
    (type?: EventType) => {
      setPreset(type)
      setPlannerKey((k) => k + 1)
      nav.go('planner')
    },
    [nav],
  )

  return {
    ...nav,
    ...auth,
    preset,
    toastMsg,
    plannerKey,
    toast,
    start,
  }
}
