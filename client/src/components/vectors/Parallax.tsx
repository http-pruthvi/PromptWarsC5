import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef, type ReactNode } from 'react'

/**
 * Parallax floating wrapper reacting to scroll velocity.
 */
export function Parallax({
  children,
  speed = 70,
  spin = 14,
  className = '',
}: {
  children: ReactNode
  speed?: number
  spin?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed])
  const rotate = useTransform(scrollYProgress, [0, 1], [-spin, spin])

  return (
    <motion.div
      ref={ref}
      className={`deco ${className ?? ''}`}
      {...(!reduce ? { style: { y, rotate } } : {})}
      aria-hidden
    >
      {children}
    </motion.div>
  )
}
