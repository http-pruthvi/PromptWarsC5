import { motion, useReducedMotion } from 'framer-motion'
import React, { useMemo } from 'react'
import type { MouseEvent, ReactNode } from 'react'

export const PALETTE = [
  '#c4a05a',
  '#d6a3a9',
  '#a98ba5',
  '#5b3f55',
  '#e8d6a8',
  '#b88a8f',
  '#8f7a9c',
  '#c9a98a',
  '#9fb3a0',
]

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M16 3c4.2 5 4.2 11 0 17-4.2-6-4.2-12 0-17Z" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M4 13c5.5-.2 9.5 2.6 12 8-5.5.2-9.5-2.6-12-8Zm24 0c-2.5 5.4-6.5 8.2-12 8 2.5-5.4 6.5-8.2 12-8Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="16" cy="26" r="2.2" fill="currentColor" />
    </svg>
  )
}

export function Reveal({
  children,
  delay = 0,
  y = 34,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** Soft spotlight that follows the cursor inside cards. */
export function spotlight(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export const Petals = React.memo(function Petals({ count = 16 }: { count?: number }) {
  const reduce = useReducedMotion()
  const petals = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 9 + Math.random() * 12,
        dur: 14 + Math.random() * 16,
        delay: -Math.random() * 28,
        drift: (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 90),
      })),
    [count],
  )

  if (reduce) return null

  return (
    <div className="petals" aria-hidden>
      {petals.map((p) => (
        <span
          key={p.id}
          className="petal"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.3,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            ['--drift' as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  )
})

export const DonutChart = React.memo(function DonutChart({
  data,
  centerLabel,
  centerValue,
}: {
  data: Array<{ label: string; value: number }>
  centerLabel?: string
  centerValue?: string
}) {
  const r = 42
  const C = 2 * Math.PI * r
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  let acc = 0
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 100 100" role="img" aria-label="Budget breakdown">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(91,63,85,.08)" strokeWidth="11" />
        <g transform="rotate(-90 50 50)">
          {data.map((d, i) => {
            const len = (d.value / total) * C
            const gap = data.length > 1 ? 0.9 : 0
            const off = acc
            acc += len
            return (
              <motion.circle
                key={d.label}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth="11"
                strokeDashoffset={-off}
                initial={{ strokeDasharray: `0 ${C}` }}
                animate={{ strokeDasharray: `${Math.max(0, len - gap)} ${C - Math.max(0, len - gap)}` }}
                transition={{ duration: 1.1, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
              />
            )
          })}
        </g>
      </svg>
      {(centerLabel || centerValue) && (
        <div className="donut-center">
          <small>{centerLabel}</small>
          <b>{centerValue}</b>
        </div>
      )}
    </div>
  )
})

export function Ribbon() {
  return (
    <svg className="ribbon" viewBox="0 0 1200 90" preserveAspectRatio="none" fill="none" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d={`M-20 ${52 + i * 4} C 200 ${-10 + i * 12}, 360 ${100 - i * 8}, 600 ${46 + i * 3} S 1000 ${-6 + i * 10}, 1220 ${50 + i * 4}`}
          stroke="currentColor"
          strokeWidth={i === 1 ? 1.4 : 0.8}
          strokeLinecap="round"
          opacity={i === 1 ? 0.9 : 0.45}
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 2.2, delay: i * 0.25, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </svg>
  )
}

export function Toast({ message }: { message: string | null }) {
  return (
    <>
      {message && (
        <motion.div
          className="toast"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          role="status"
        >
          {message}
        </motion.div>
      )}
    </>
  )
}
