import { animate, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'

/* ====================================================================
   Soirée vector kit — every ornament on the site is inline SVG.
   Scroll-linked (ScrollVine, LotusBloom, Parallax), hover-driven
   (FeatureIcon, OccasionArt) and click/pointer interactive
   (BurstButton, CursorSparkles).
   ==================================================================== */

const GOLD = 'url(#vkGold)'

/** Shared gradients, mounted once at the app root. */
export function VectorDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
      <defs>
        <linearGradient id="vkGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9a7430" />
          <stop offset=".5" stopColor="#f1d992" />
          <stop offset="1" stopColor="#b88c3c" />
        </linearGradient>
        <linearGradient id="vkGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".85" />
          <stop offset=".6" stopColor="#f6dfe3" stopOpacity=".35" />
          <stop offset="1" stopColor="#fff" stopOpacity=".6" />
        </linearGradient>
        <linearGradient id="vkPetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffaf3" />
          <stop offset="1" stopColor="#efc9cc" />
        </linearGradient>
        <radialGradient id="vkPearl" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".55" stopColor="#f7ece4" />
          <stop offset="1" stopColor="#d9bfb4" />
        </radialGradient>
        <radialGradient id="vkCore" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ff9f7a" />
          <stop offset="1" stopColor="#f6b79a" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  )
}

/* -------------------------------------------------------------------
   1. ScrollVine — gold vine on the left edge that grows with scroll,
      sprouting leaves, with a pearl riding the tip.
   ------------------------------------------------------------------- */
const VINE_D = 'M20 0 C 36 60, 4 120, 20 200 S 36 340, 20 400 S 4 540, 20 600 S 36 740, 20 800'
const LEAF = 'M0 0 C 8 -7 17 -7 24 0 C 17 7 8 7 0 0 Z'

function VineLeaf({ p, at, y, side }: { p: MotionValue<number>; at: number; y: number; side: 1 | -1 }) {
  const opacity = useTransform(p, [at, at + 0.05], [0, 1])
  const scale = useTransform(p, [at, at + 0.05], [0.2, 1])
  return (
    <g transform={`translate(20 ${y}) scale(${side} 1) rotate(-28)`}>
      <motion.path d={LEAF} fill={at > 0.5 ? '#e4b9bd' : '#dcc07e'} stroke="#b58a3c" strokeWidth=".8" style={{ opacity, scale, originX: 0, originY: 0.5 }} />
    </g>
  )
}

export function ScrollVine() {
  const { scrollYProgress } = useScroll()
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 })
  const top = useTransform(p, (v) => `${v * 100}%`)
  const leaves = [0.07, 0.17, 0.28, 0.39, 0.5, 0.61, 0.72, 0.83, 0.93]
  return (
    <div className="vine" aria-hidden>
      <svg viewBox="0 0 40 800" preserveAspectRatio="none">
        <path d={VINE_D} fill="none" stroke="rgba(91,63,85,.12)" strokeWidth="1.2" />
        <motion.path d={VINE_D} fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" style={{ pathLength: p }} />
        {leaves.map((t, i) => (
          <VineLeaf key={t} p={p} at={t} y={t * 800} side={i % 2 ? 1 : -1} />
        ))}
      </svg>
      <motion.i className="vine-pearl" style={{ top }} />
    </div>
  )
}

/* -------------------------------------------------------------------
   2. LotusBloom — petals open as `progress` goes 0 → 1.
   ------------------------------------------------------------------- */
const PETAL_L = 'M0 0 C -34 -34 -38 -104 0 -150 C 38 -104 34 -34 0 0 Z'
const PETAL_S = 'M0 0 C -24 -26 -26 -76 0 -108 C 26 -76 24 -26 0 0 Z'

function Petal({ progress, angle, d, k, line, front }: { progress: MotionValue<number>; angle: number; d: string; k: number; line: boolean; front?: boolean }) {
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

export function LotusBloom({ progress, size = 260, line = false }: { progress: MotionValue<number>; size?: number; line?: boolean }) {
  const core = useTransform(progress, [0.35, 1], [0, 1])
  return (
    <svg width={size} height={size * 0.64} viewBox="-190 -200 380 240" fill="none" aria-hidden style={{ overflow: 'visible' }}>
      <ellipse cx="0" cy="26" rx="120" ry="9" fill="#6b4862" opacity={line ? 0 : 0.12} />
      {[-72, -48, -24, 24, 48, 72].map((a) => <Petal key={`a${a}`} progress={progress} angle={a} d={PETAL_L} k={1.3} line={line} />)}
      {[-60, -36, -12, 12, 36, 60].map((a) => <Petal key={`b${a}`} progress={progress} angle={a} d={PETAL_S} k={1.4} line={line} />)}
      <motion.circle cx="0" cy="-92" r="46" fill="url(#vkCore)" style={{ opacity: core }} />
      {[-40, 0, 40].map((a) => <Petal key={`c${a}`} progress={progress} angle={a} d={PETAL_S} k={1.1} line={line} front />)}
    </svg>
  )
}

/** Bloom that follows the scroll position of `target`. */
export function ScrollLotus({ target, size, line }: { target: RefObject<HTMLElement>; size?: number; line?: boolean }) {
  const { scrollYProgress } = useScroll({ target, offset: ['start 85%', 'center 45%'] })
  const p = useSpring(scrollYProgress, { stiffness: 80, damping: 22 })
  return <LotusBloom progress={p} size={size} line={line} />
}

/** Bloom that opens and closes on its own (loaders). */
export function LoopingLotus({ size = 200 }: { size?: number }) {
  const p = useMotionValue(0)
  useEffect(() => {
    const c = animate(p, [0, 1, 1, 0], { duration: 3.8, repeat: Infinity, ease: 'easeInOut', times: [0, 0.5, 0.7, 1] })
    return () => c.stop()
  }, [p])
  return <LotusBloom progress={p} size={size} />
}

/* -------------------------------------------------------------------
   3. SectionOrnament — gold rules that draw outward from a lotus.
   ------------------------------------------------------------------- */
export function SectionOrnament() {
  return (
    <div className="ornament" aria-hidden>
      <motion.svg viewBox="0 0 600 50" initial="hide" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
        <motion.path d="M284 33 H 20 C 6 33 0 26 0 20" stroke={GOLD} strokeWidth="1.2" fill="none" strokeLinecap="round" variants={{ hide: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 1.6, ease: [0.22, 1, 0.36, 1] } } }} />
        <motion.path d="M316 33 H 580 C 594 33 600 26 600 20" stroke={GOLD} strokeWidth="1.2" fill="none" strokeLinecap="round" variants={{ hide: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 1.6, ease: [0.22, 1, 0.36, 1] } } }} />
        <motion.g transform="translate(300 40)" variants={{ hide: { scale: 0, opacity: 0 }, show: { scale: 1, opacity: 1, transition: { delay: 0.5, type: 'spring', stiffness: 160, damping: 14 } } }} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          {[-60, -30, 0, 30, 60].map((a) => (
            <path key={a} d={PETAL_S} transform={`rotate(${a}) scale(.2)`} fill="url(#vkPetal)" stroke={GOLD} strokeWidth="4" />
          ))}
        </motion.g>
      </motion.svg>
    </div>
  )
}

/* -------------------------------------------------------------------
   4. FloralCorner — sprig that draws itself into a card corner.
   ------------------------------------------------------------------- */
export function FloralCorner({ pos = 'tr', size = 120 }: { pos?: 'tr' | 'tl' | 'br' | 'bl'; size?: number }) {
  const leaves: Array<[number, number, number]> = [[96, 22, -50], [78, 40, 10], [58, 54, -45], [38, 78, 15], [20, 98, -40]]
  return (
    <motion.svg
      className={`corner corner-${pos}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden
      initial="hide"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
    >
      <motion.path d="M116 4 C 98 20, 88 40, 66 52 S 28 82, 6 116" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" variants={{ hide: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 1.6, ease: [0.22, 1, 0.36, 1] } } }} />
      {leaves.map(([x, y, r], i) => (
        <motion.path
          key={i}
          d="M0 0 C 7 -6 15 -6 20 0 C 15 6 7 6 0 0 Z"
          transform={`translate(${x} ${y}) rotate(${r})`}
          fill={i % 2 ? '#ecc9cd' : '#e3cf9a'}
          stroke="#b58a3c"
          strokeWidth=".7"
          variants={{ hide: { opacity: 0, scale: 0 }, show: { opacity: 1, scale: 1, transition: { delay: 0.5 + i * 0.15, duration: 0.6 } } }}
          style={{ transformBox: 'fill-box', transformOrigin: 'left center' }}
        />
      ))}
      <motion.circle cx="116" cy="4" r="4" fill="url(#vkPearl)" variants={{ hide: { scale: 0 }, show: { scale: 1, transition: { delay: 1.4, type: 'spring' } } }} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
    </motion.svg>
  )
}

/* -------------------------------------------------------------------
   5. Parallax decorations (sprig, pearls, sparkle) that drift and
      rotate as the page scrolls.
   ------------------------------------------------------------------- */
export function Parallax({ children, speed = 70, spin = 14, className = '' }: { children: ReactNode; speed?: number; spin?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed])
  const rotate = useTransform(scrollYProgress, [0, 1], [-spin, spin])
  return (
    <motion.div ref={ref} className={`deco ${className}`} style={reduce ? undefined : { y, rotate }} aria-hidden>
      {children}
    </motion.div>
  )
}

export function Sprig({ size = 170 }: { size?: number }) {
  const leaves: Array<[number, number, number, number]> = [[78, 205, -40, 1], [82, 170, 220, 1], [76, 135, -35, 0.95], [80, 102, 215, 0.9], [72, 70, -30, 0.8], [78, 40, 210, 0.7]]
  return (
    <motion.svg width={size} height={size * 1.6} viewBox="0 0 160 256" fill="none" initial="hide" whileInView="show" viewport={{ once: true, margin: '-50px' }}>
      <motion.path d="M80 255 C 70 200, 95 150, 78 100 S 70 30, 82 5" stroke={GOLD} strokeWidth="2" strokeLinecap="round" variants={{ hide: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 2, ease: [0.22, 1, 0.36, 1] } } }} />
      {leaves.map(([x, y, r, s], i) => (
        <motion.path key={i} d="M0 0 C 14 -12 34 -12 44 0 C 34 12 14 12 0 0 Z" transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} fill={i % 2 ? 'url(#vkPetal)' : '#e6d4a2'} stroke="#b58a3c" strokeWidth="1" variants={{ hide: { opacity: 0, scale: 0 }, show: { opacity: 0.95, scale: s, transition: { delay: 0.4 + i * 0.18, duration: 0.7 } } }} style={{ transformBox: 'fill-box', transformOrigin: 'left center' }} />
      ))}
      <motion.circle cx="82" cy="5" r="6" fill="url(#vkPearl)" variants={{ hide: { scale: 0 }, show: { scale: 1, transition: { delay: 1.6, type: 'spring' } } }} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
    </motion.svg>
  )
}

export function Pearls({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
      {[[40, 70, 26], [82, 44, 16], [86, 90, 11], [24, 24, 8]].map(([x, y, r], i) => (
        <g key={i} className="v-bob" style={{ animationDelay: `${-i * 1.4}s` }}>
          <circle cx={x} cy={y} r={r} fill="url(#vkPearl)" />
          <circle cx={x - r * 0.35} cy={y - r * 0.38} r={r * 0.22} fill="#fff" />
        </g>
      ))}
    </svg>
  )
}

export function Sparkle({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-24 -24 48 48" aria-hidden>
      <path className="v-twinkle-star" d="M0 -22 C 2 -6 6 -2 22 0 C 6 2 2 6 0 22 C -2 6 -6 2 -22 0 C -6 -2 -2 -6 0 -22 Z" fill={GOLD} />
    </svg>
  )
}

/* -------------------------------------------------------------------
   6. FeatureIcon — line icons that draw themselves on card hover.
   ------------------------------------------------------------------- */
export type IconName = 'budget' | 'timeline' | 'vendors' | 'ideas' | 'chat' | 'export'

const ICONS: Record<IconName, string[]> = {
  budget: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'M8.5 7.5h7', 'M8.5 11h7', 'M9 7.5c4.5 0 4.5 5 0 5h-.5l6.5 5.5'],
  timeline: ['M6.5 5h11A3 3 0 0 1 20.5 8v9a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z', 'M8 3v4', 'M16 3v4', 'M3.5 10h17', 'M8.5 15l2.5 2.5L16 13'],
  vendors: ['M4 9l1.5-5h13L20 9', 'M4 9c0 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 4 2 4 0', 'M5.5 11.5V20h13v-8.5', 'M10 20v-5h4v5'],
  ideas: ['M5 19L15 9', 'M13.5 7.5l3 3', 'M17.5 3v4', 'M15.5 5h4', 'M20 11v3', 'M18.5 12.5h3'],
  chat: ['M6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5v-7A2.5 2.5 0 0 1 6.5 4Z', 'M12 13.2c-2.2-1.5-3-2.5-3-3.6 0-1 .8-1.6 1.6-1.6.6 0 1.1.3 1.4.9.3-.6.8-.9 1.4-.9.8 0 1.6.6 1.6 1.6 0 1.1-.8 2.1-3 3.6Z'],
  export: ['M6 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z', 'M18 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z', 'M18 15.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z', 'M8.2 10.8l7.6-3.6', 'M8.2 13.2l7.6 3.6'],
}

export function FeatureIcon({ name, size = 28 }: { name: IconName; size?: number }) {
  return (
    <svg className="draw-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name].map((d, i) => (
        <path key={i} d={d} pathLength={1} style={{ animationDelay: `${i * 0.08}s` }} />
      ))}
    </svg>
  )
}

/* -------------------------------------------------------------------
   7. OccasionArt — illustrated vignettes that animate on card hover.
   ------------------------------------------------------------------- */
export function OccasionArt({ type }: { type: 'wedding' | 'birthday' | 'community' }) {
  if (type === 'wedding') {
    return (
      <svg className="art art-wedding" viewBox="0 0 220 220" fill="none" aria-hidden>
        <g className="ring ring-a"><circle cx="84" cy="130" r="42" stroke={GOLD} strokeWidth="4" /><circle cx="84" cy="130" r="34" stroke="#fff" strokeOpacity=".6" strokeWidth="1.2" /></g>
        <g className="ring ring-b"><circle cx="136" cy="130" r="42" stroke="#5b3f55" strokeWidth="3" /><circle cx="136" cy="130" r="34" stroke="#fff" strokeOpacity=".6" strokeWidth="1.2" /></g>
        <g className="gem"><polygon points="110,66 123,82 110,102 97,82" fill="url(#vkGlass)" stroke="#5b3f55" strokeWidth="2" /><path d="M97 82h26M110 66l-6 16 6 20 6-20z" stroke="#5b3f55" strokeWidth="1" opacity=".6" /></g>
        <g stroke={GOLD} strokeWidth="2" strokeLinecap="round" className="rays"><path d="M110 44v10M86 52l6 8M134 52l-6 8M70 70l8 4M150 70l-8 4" /></g>
      </svg>
    )
  }
  if (type === 'birthday') {
    const b = [
      { x: 62, y: 98, c: '#e8a9b3', cls: 'b1' },
      { x: 112, y: 76, c: '#f1d28a', cls: 'b2' },
      { x: 162, y: 104, c: '#b8a0cf', cls: 'b3' },
    ]
    return (
      <svg className="art art-birthday" viewBox="0 0 220 220" fill="none" aria-hidden>
        {b.map((x) => (
          <g key={x.cls} className={`balloon ${x.cls}`}>
            <path d={`M${x.x} ${x.y + 38} C ${x.x - 10} ${x.y + 80}, ${x.x + 12} ${x.y + 110}, ${x.x} ${x.y + 140}`} stroke="#5b3f55" strokeWidth="1.5" strokeOpacity=".6" />
            <ellipse cx={x.x} cy={x.y} rx="30" ry="37" fill={x.c} fillOpacity=".75" stroke="#5b3f55" strokeWidth="2" />
            <path d={`M${x.x - 14} ${x.y - 18} C ${x.x - 20} ${x.y - 8}, ${x.x - 20} ${x.y + 4}, ${x.x - 16} ${x.y + 10}`} stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7" />
            <path d={`M${x.x - 5} ${x.y + 38} h10 l-5 7z`} fill="#5b3f55" />
          </g>
        ))}
        <g className="confetti" fill={GOLD}>{[[30, 40], [188, 50], [200, 160], [20, 150], [96, 30]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3 + (i % 2)} />)}</g>
      </svg>
    )
  }
  const dots = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2
    return [110 + Math.cos(a) * 64, 110 + Math.sin(a) * 64] as const
  })
  return (
    <svg className="art art-community" viewBox="0 0 220 220" fill="none" aria-hidden>
      <g className="orbit-art">
        <circle cx="110" cy="110" r="64" stroke={GOLD} strokeWidth="1.6" strokeDasharray="3 7" />
        {dots.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y - 7} r="7" fill="#fff" fillOpacity=".7" stroke="#5b3f55" strokeWidth="2" />
            <path d={`M${x - 11} ${y + 14} c0 -10 6 -14 11 -14 s11 4 11 14`} stroke="#5b3f55" strokeWidth="2" strokeLinecap="round" />
          </g>
        ))}
      </g>
      <g className="heart">
        <path d="M110 128c-22-14-30-24-30-34 0-9 7-15 15-15 6 0 12 3 15 10 3-7 9-10 15-10 8 0 15 6 15 15 0 10-8 20-30 34Z" fill="url(#vkPetal)" stroke="#5b3f55" strokeWidth="2.2" />
      </g>
    </svg>
  )
}

/* -------------------------------------------------------------------
   8. BurstButton — petals explode from the button on click.
   ------------------------------------------------------------------- */
interface Burst { id: number; petals: Array<{ x: number; y: number; r: number; s: number }> }

export function BurstButton({ children, onActivate, className = '', delay = 420, disabled }: { children: ReactNode; onActivate: () => void; className?: string; delay?: number; disabled?: boolean }) {
  const [bursts, setBursts] = useState<Burst[]>([])
  const reduce = useReducedMotion()
  const click = () => {
    if (!reduce) {
      const id = Date.now()
      const petals = Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2 + Math.random() * 0.4
        const d = 70 + Math.random() * 90
        return { x: Math.cos(a) * d, y: Math.sin(a) * d - 20, r: Math.random() * 540 - 270, s: 0.7 + Math.random() * 0.8 }
      })
      setBursts((b) => [...b, { id, petals }])
      window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1200)
      window.setTimeout(onActivate, delay)
    } else onActivate()
  }
  return (
    <button className={`${className} burst-host`} onClick={click} disabled={disabled}>
      {children}
      {bursts.map((b) => (
        <span className="burst" key={b.id} aria-hidden>
          {b.petals.map((p, i) => (
            <motion.svg key={i} width="16" height="22" viewBox="0 0 16 22" initial={{ x: 0, y: 0, opacity: 1, scale: 0.3, rotate: 0 }} animate={{ x: p.x, y: p.y + 40, opacity: 0, scale: p.s, rotate: p.r }} transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}>
              <path d="M8 0 C 16 6 16 16 8 22 C 0 16 0 6 8 0Z" fill="url(#vkPetal)" stroke="#d6a3a9" strokeWidth="1" />
            </motion.svg>
          ))}
        </span>
      ))}
    </button>
  )
}

/* -------------------------------------------------------------------
   9. CursorSparkles — gold stars trail the pointer inside `target`.
   ------------------------------------------------------------------- */
export function CursorSparkles({ target }: { target: RefObject<HTMLElement> }) {
  const [stars, setStars] = useState<Array<{ id: number; x: number; y: number; s: number }>>([])
  const last = useRef(0)
  const reduce = useReducedMotion()
  const remove = useCallback((id: number) => setStars((s) => s.filter((x) => x.id !== id)), [])
  useEffect(() => {
    const el = target.current
    if (!el || reduce || window.matchMedia('(pointer: coarse)').matches) return
    const move = (e: PointerEvent) => {
      const now = performance.now()
      if (now - last.current < 55) return
      last.current = now
      const r = el.getBoundingClientRect()
      const id = now + Math.random()
      setStars((s) => [...s.slice(-22), { id, x: e.clientX - r.left, y: e.clientY - r.top, s: 0.5 + Math.random() * 0.9 }])
      window.setTimeout(() => remove(id), 1100)
    }
    el.addEventListener('pointermove', move)
    return () => el.removeEventListener('pointermove', move)
  }, [target, reduce, remove])
  return (
    <div className="sparkles" aria-hidden>
      {stars.map((s) => (
        <motion.svg key={s.id} width="22" height="22" viewBox="-24 -24 48 48" style={{ left: s.x - 11, top: s.y - 11 }} initial={{ scale: 0, opacity: 1, rotate: 0 }} animate={{ scale: s.s, opacity: 0, rotate: 90, y: 26 }} transition={{ duration: 1, ease: 'easeOut' }}>
          <path d="M0 -22 C 2 -6 6 -2 22 0 C 6 2 2 6 0 22 C -2 6 -6 2 -22 0 C -6 -2 -2 -6 0 -22 Z" fill={GOLD} />
        </motion.svg>
      ))}
    </div>
  )
}
