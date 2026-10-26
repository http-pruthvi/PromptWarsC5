import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, LogIn, LogOut, X } from 'lucide-react'
import type { RefObject } from 'react'
import { Logo } from '../common'
import type { User } from '@soiree/shared'
import type { Route } from '../Navbar'

interface Props {
  open: boolean
  setOpen: (open: boolean) => void
  drawerRef: RefObject<HTMLDivElement>

  route: Route
  go: (r: Route, anchor?: string) => void
  user: User | null
  onOpenAuth: () => void
  onLogout: () => void
  navigateTo: (anchor?: string) => void
}

/**
 * Mobile navigation drawer with accessible focus-trap and backdrop.
 */
export function NavMobileDrawer({
  open,
  setOpen,
  drawerRef,
  route,
  go,
  user,
  onOpenAuth,
  onLogout,
  navigateTo,
}: Props) {
  return (
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
              <a
                href="#/features"
                onClick={(e) => {
                  e.preventDefault()
                  navigateTo('features')
                }}
              >
                Features
              </a>
              <a
                href="#/how"
                onClick={(e) => {
                  e.preventDefault()
                  navigateTo('how')
                }}
              >
                How it works
              </a>
              <a
                href="#/occasions"
                onClick={(e) => {
                  e.preventDefault()
                  navigateTo('occasions')
                }}
              >
                Occasions
              </a>
              <a
                href="#/preview"
                onClick={(e) => {
                  e.preventDefault()
                  navigateTo('preview')
                }}
              >
                Preview
              </a>
            </nav>

            <div className="mobile-drawer-footer">
              {route === 'home' ? (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    setOpen(false)
                    go('planner')
                  }}
                >
                  Start planning <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    setOpen(false)
                    go('home')
                  }}
                >
                  Back to home
                </button>
              )}

              {user ? (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    setOpen(false)
                    onLogout()
                  }}
                >
                  <LogOut size={14} style={{ marginRight: 6 }} /> Sign out (
                  {user.isGuest ? 'Guest' : user.email?.split('@')[0] || 'User'})
                </button>
              ) : (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    setOpen(false)
                    onOpenAuth()
                  }}
                >
                  <LogIn size={14} style={{ marginRight: 6 }} /> Sign in to account
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
