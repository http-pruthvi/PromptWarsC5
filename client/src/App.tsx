import { MotionConfig } from 'framer-motion'
import { Navbar } from './components/Navbar'
import { Petals, Toast } from './components/common'
import { ScrollVine, VectorDefs } from './components/Vectors'
import { useAppState } from './hooks/useAppState'
import { useMotionControl } from './hooks/useMotionControl'
import { AppContent } from './components/app/AppContent'

/**
 * Root Application component integrating navigation, background animations, and route rendering.
 */
export default function App() {
  const s = useAppState()
  const { motionPaused, toggleMotion } = useMotionControl()

  return (
    <MotionConfig reducedMotion={motionPaused ? 'always' : 'user'}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <VectorDefs />
      <ScrollVine />
      <Petals />
      <Navbar
        route={s.route}
        go={s.go}
        user={s.user}
        onOpenAuth={() => s.setShowAuth(true)}
        onLogout={s.handleLogout}
        motionPaused={motionPaused}
        onToggleMotion={toggleMotion}
      />

      <main id="main-content" tabIndex={-1} style={{ outline: 'none' }}>
        <AppContent
          route={s.route}
          token={s.routeState.token}
          preset={s.preset}
          plannerKey={s.plannerKey}
          user={s.user}
          showAuth={s.showAuth}
          start={s.start}
          go={s.go}
          setShowAuth={s.setShowAuth}
          handleAuthSuccess={s.handleAuthSuccess}
          toast={s.toast}
        />
      </main>

      <Toast message={s.toastMsg} />
    </MotionConfig>
  )
}
