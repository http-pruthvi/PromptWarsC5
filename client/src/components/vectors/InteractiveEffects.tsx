import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'

const GOLD = 'url(#vkGold)'

interface Burst {
  id: number
  petals: Array<{ x: number; y: number; r: number; s: number }>
}

/**
 * Interactive button unleashing floating flower petal particles on click.
 */
export function BurstButton({
  children,
  onActivate,
  className = '',
  delay = 420,
  disabled,
}: {
  children: ReactNode
  onActivate: () => void
  className?: string
  delay?: number
  disabled?: boolean
}) {
  const [bursts, setBursts] = useState<Burst[]>([])
  const reduce = useReducedMotion()

  const click = () => {
    if (!reduce) {
      const id = Date.now()
      const petals = Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2 + Math.random() * 0.4
        const d = 70 + Math.random() * 90
        return {
          x: Math.cos(a) * d,
          y: Math.sin(a) * d - 20,
          r: Math.random() * 540 - 270,
          s: 0.7 + Math.random() * 0.8,
        }
      })
      setBursts((b) => [...b, { id, petals }])
      window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1200)
      window.setTimeout(onActivate, delay)
    } else {
      onActivate()
    }
  }

  return (
    <button className={`${className} burst-host`} onClick={click} disabled={disabled}>
      {children}
      {bursts.map((b) => (
        <span className="burst" key={b.id} aria-hidden>
          {b.petals.map((p, i) => (
            <motion.svg
              key={i}
              width="16"
              height="22"
              viewBox="0 0 16 22"
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.3, rotate: 0 }}
              animate={{ x: p.x, y: p.y + 40, opacity: 0, scale: p.s, rotate: p.r }}
              transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <path d="M8 0 C 16 6 16 16 8 22 C 0 16 0 6 8 0Z" fill="url(#vkPetal)" stroke="#d6a3a9" strokeWidth="1" />
            </motion.svg>
          ))}
        </span>
      ))}
    </button>
  )
}

/**
 * Trailing interactive golden sparkles following pointer movement within target container.
 */
export function CursorSparkles({ target }: { target: RefObject<HTMLElement> }) {
  const [stars, setStars] = useState<Array<{ id: number; x: number; y: number; s: number }>>([])
  const last = useRef(0)
  const reduce = useReducedMotion()
  const remove = useCallback((id: number) => setStars((s) => s.filter((x) => x.id !== id)), [])

  useEffect(() => {
    const el = target.current
    if (!el || reduce || window.matchMedia?.('(pointer: coarse)')?.matches) return

    const move = (e: PointerEvent) => {
      const now = performance.now()
      if (now - last.current < 55) return
      last.current = now
      const r = el.getBoundingClientRect()
      const id = now + Math.random()
      setStars((s) => [
        ...s.slice(-22),
        {
          id,
          x: (e.clientX ?? 0) - (r.left || 0),
          y: (e.clientY ?? 0) - (r.top || 0),
          s: 0.5 + Math.random() * 0.9,
        },
      ])

      window.setTimeout(() => remove(id), 1100)
    }

    el.addEventListener('pointermove', move)
    return () => el.removeEventListener('pointermove', move)
  }, [target, reduce, remove])

  return (
    <div className="sparkles" aria-hidden>
      {stars.map((s) => (
        <motion.svg
          key={s.id}
          width="22"
          height="22"
          viewBox="-24 -24 48 48"
          style={{ left: s.x - 11, top: s.y - 11 }}
          initial={{ scale: 0, opacity: 1, rotate: 0 }}
          animate={{ scale: s.s, opacity: 0, rotate: 90, y: 26 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <path d="M0 -22 C 2 -6 6 -2 22 0 C 6 2 2 6 0 22 C -2 6 -6 2 -22 0 C -6 -2 -2 -6 0 -22 Z" fill={GOLD} />
        </motion.svg>
      ))}
    </div>
  )
}
