import { animate, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import { useEffect } from 'react'
import type { RefObject } from 'react'

const GOLD = 'url(#vkGold)'
const PETAL_L = 'M0 0 C -34 -34 -38 -104 0 -150 C 38 -104 34 -34 0 0 Z'
const PETAL_S = 'M0 0 C -24 -26 -26 -76 0 -108 C 26 -76 24 -26 0 0 Z'

function Petal({
  progress,
  angle,
  d,
  k,
  line,
  front,
}: {
  progress: MotionValue<number>
  angle: number
  d: string
  k: number
  line: boolean
  front?: boolean
}) {
  const rotate = useTransform(progress, [0, 1], [angle * 0.08, angle])
  const scale = useTransform(progress, [0, 1], [k * 0.72, k])
  return (
    <motion.path
      d={d}
      style={{ rotate, scale, originX: 0.5, originY: 1 }}
      fill={line ? 'none' : 'url(#vkGlass)'}
      stroke={line ? GOLD : front ? '#fff' : '#f0cfd3'}
      strokeWidth={line ? 2 : 1.6}
      strokeOpacity={line ? 1 : 0.95}
    />
  )
}

/**
 * Animated blooming lotus vector whose petals unfurl based on progress value.
 */
export function LotusBloom({
  progress,
  size = 260,
  line = false,
}: {
  progress: MotionValue<number>
  size?: number | undefined
  line?: boolean | undefined
}) {
  const core = useTransform(progress, [0.35, 1], [0, 1])
  return (
    <svg
      width={size}
      height={size * 0.64}
      viewBox="-190 -200 380 240"
      fill="none"
      aria-hidden
      style={{ overflow: 'visible' }}
    >
      <ellipse cx="0" cy="26" rx="120" ry="9" fill="#6b4862" opacity={line ? 0 : 0.12} />
      {[-72, -48, -24, 24, 48, 72].map((a) => (
        <Petal key={`a${a}`} progress={progress} angle={a} d={PETAL_L} k={1.3} line={line} />
      ))}
      {[-60, -36, -12, 12, 36, 60].map((a) => (
        <Petal key={`b${a}`} progress={progress} angle={a} d={PETAL_S} k={1.4} line={line} />
      ))}
      <motion.circle cx="0" cy="-92" r="46" fill="url(#vkCore)" style={{ opacity: core }} />
      {[-40, 0, 40].map((a) => (
        <Petal key={`c${a}`} progress={progress} angle={a} d={PETAL_S} k={1.1} line={line} front />
      ))}
    </svg>
  )
}

/**
 * Lotus bloom tied to the scroll position of a reference element.
 */
export function ScrollLotus({
  target,
  size,
  line,
}: {
  target: RefObject<HTMLElement>
  size?: number | undefined
  line?: boolean | undefined
}) {
  const { scrollYProgress } = useScroll({ target, offset: ['start 85%', 'center 45%'] })
  const p = useSpring(scrollYProgress, { stiffness: 80, damping: 22 })
  return <LotusBloom progress={p} size={size} line={line} />
}

/**
 * Self-animating looping lotus for loading indicators.
 */
export function LoopingLotus({ size = 200 }: { size?: number | undefined }) {
  const p = useMotionValue(0)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce) return
    let anim: ReturnType<typeof animate> | null = null
    const start = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      anim = animate(p, [0, 1, 1, 0], { duration: 3.8, repeat: Infinity, ease: 'easeInOut', times: [0, 0.5, 0.7, 1] })
    }
    const onVisibility = () => {
      if (document.hidden) anim?.stop()
      else start()
    }
    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      anim?.stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [p, reduce])

  return <LotusBloom progress={p} size={size} />
}
