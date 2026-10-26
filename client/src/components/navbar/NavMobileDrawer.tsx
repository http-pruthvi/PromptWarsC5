import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { RefObject } from 'react'
import { Logo } from '../common'
import type { User } from '@soiree/shared'
import type { Route } from '../Navbar'
import { DrawerFooter } from './DrawerFooter'

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
  motionPaused?: boolean | undefined
  onToggleMotion?: (() => void) | undefined
}

const DRAWER_LINKS: Array<{ id: string; label: string }> = [
  { id: 'features', label: 'Features' },
  { id: 'how', label: 'How it works' },
  { id: 'occasions', label: 'Occasions' },
  { id: 'preview', label: 'Preview' },
]

function DrawerNavLinks({ navigateTo }: { navigateTo: (anchor: string) => void }) {
  return (
    <nav className="mobile-links" aria-label="Mobile Navigation Links">
      {DRAWER_LINKS.map(({ id, label }) => (
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

function DrawerHeader({ onClose, navigateTo }: { onClose: () => void; navigateTo: (anchor?: string) => void }) {
  return (
    <div className="mobile-drawer-head">
      <button className="brand" onClick={() => navigateTo()} aria-label="Soirée home">
        <Logo /> Soirée
      </button>
      <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close menu" style={{ padding: '6px' }}>
        <X size={18} />
      </button>
    </div>
  )
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
  motionPaused = false,
  onToggleMotion,
}: Props) {
  const close = () => setOpen(false)
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
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
            <DrawerHeader onClose={close} navigateTo={navigateTo} />
            <DrawerNavLinks navigateTo={navigateTo} />
            <DrawerFooter
              route={route}
              go={go}
              user={user}
              onLogout={onLogout}
              onOpenAuth={onOpenAuth}
              close={close}
              motionPaused={motionPaused}
              onToggleMotion={onToggleMotion}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
