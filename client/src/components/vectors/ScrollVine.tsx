import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import type { MotionValue } from 'framer-motion'

const GOLD = 'url(#vkGold)'
const VINE_D = 'M20 0 C 36 60, 4 120, 20 200 S 36 340, 20 400 S 4 540, 20 600 S 36 740, 20 800'
const LEAF = 'M0 0 C 8 -7 17 -7 24 0 C 17 7 8 7 0 0 Z'

function VineLeaf({ p, at, y, side }: { p: MotionValue<number>; at: number; y: number; side: 1 | -1 }) {
  const opacity = useTransform(p, [at, at + 0.05], [0, 1])
  const scale = useTransform(p, [at, at + 0.05], [0.2, 1])
  return (
    <g transform={`translate(20 ${y}) scale(${side} 1) rotate(-28)`}>
      <motion.path
        d={LEAF}
        fill={at > 0.5 ? '#e4b9bd' : '#dcc07e'}
        stroke="#b58a3c"
        strokeWidth=".8"
        style={{ opacity, scale, originX: 0, originY: 0.5 }}
      />
    </g>
  )
}

/**
 * Scroll-linked animated gold vine on the left page boundary.
 */
export function ScrollVine() {
  const { scrollYProgress } = useScroll()
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 })
  const top = useTransform(p, (v) => `${v * 100}%`)
  const leaves = [0.07, 0.17, 0.28, 0.39, 0.5, 0.61, 0.72, 0.83, 0.93]

  return (
    <div className="vine" aria-hidden>
      <svg viewBox="0 0 40 800" preserveAspectRatio="none">
        <path d={VINE_D} fill="none" stroke="rgba(91,63,85,.12)" strokeWidth="1.2" />
        <motion.path
          d={VINE_D}
          fill="none"
          stroke={GOLD}
          strokeWidth="1.8"
          strokeLinecap="round"
          style={{ pathLength: p }}
        />
        {leaves.map((t, i) => (
          <VineLeaf key={t} p={p} at={t} y={t * 800} side={i % 2 ? 1 : -1} />
        ))}
      </svg>
      <motion.i className="vine-pearl" style={{ top }} />
    </div>
  )
}
