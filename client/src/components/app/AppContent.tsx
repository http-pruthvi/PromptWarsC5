import { AnimatePresence } from 'framer-motion'
import React, { Suspense } from 'react'
import type { EventType, User } from '@soiree/shared'
import { Landing } from '../Landing'
import type { Route } from '../Navbar'
import { LoopingLotus } from '../Vectors'

const Planner = React.lazy(() => import('../Planner'))
const SharedPlanPage = React.lazy(() => import('../SharedPlanPage'))
const AuthModal = React.lazy(() => import('../AuthModal'))

interface Props {
  route: Route
  token?: string | undefined
  preset?: EventType | undefined
  plannerKey: number
  user: User | null
  showAuth: boolean
  start: (type?: EventType | undefined) => void
  go: (r: Route, anchor?: string | undefined) => void
  setShowAuth: (show: boolean) => void
  handleAuthSuccess: (u: User) => void
  toast: (m: string) => void
}

/**
 * Main application content router switching between Landing, Planner, and Public Share.
 */
export function AppContent({
  route,
  token,
  preset,
  plannerKey,
  user,
  showAuth,
  start,
  go,
  setShowAuth,
  handleAuthSuccess,
  toast,
}: Props) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '80vh',
            display: 'grid',
            placeItems: 'center',
            padding: 40,
          }}
          role="status"
          aria-label="Loading Soirée celebration"
        >
          <LoopingLotus size={140} />
        </div>
      }
    >
      <AnimatePresence mode="wait">
        {route === 'share' ? (
          <SharedPlanPage
            key={`share-${token}`}
            token={token || ''}
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
        {showAuth && <AuthModal onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)} />}
      </AnimatePresence>
    </Suspense>
  )
}
