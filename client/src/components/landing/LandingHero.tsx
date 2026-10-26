import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, CalendarCheck, PiggyBank, Store } from 'lucide-react'
import { useRef } from 'react'
import type { EventType } from '@soiree/shared'
import { VectorScene } from '../VectorScene'
import { BurstButton, CursorSparkles } from '../Vectors'

interface Props {
  onStart: (type?: EventType) => void
}

const MARQUEE = [
  'Weddings',
  'Sangeet nights',
  'Birthdays',
  'Baby showers',
  'Anniversaries',
  'Garba evenings',
  'Community fairs',
  'Cultural fests',
  'Charity drives',
  'Reunions',
  'Housewarmings',
]

const lineVariants = {
  hidden: { y: '110%' },
  show: (i: number) => ({
    y: 0,
    transition: { duration: 1.1, delay: 0.25 + i * 0.14, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

export function LandingHero({ onStart }: Props) {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const mediaY = useTransform(scrollYProgress, [0, 1], ['0%', '14%'])
  const copyY = useTransform(scrollYProgress, [0, 1], ['0%', '-12%'])
  const copyOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 50, damping: 18 })
  const sy = useSpring(my, { stiffness: 50, damping: 18 })
  const sceneX = useTransform(sx, [-0.5, 0.5], [22, -22])
  const sceneY = useTransform(sy, [-0.5, 0.5], [14, -14])

  const onMove = (e: React.PointerEvent) => {
    mx.set(e.clientX / window.innerWidth - 0.5)
    my.set(e.clientY / window.innerHeight - 0.5)
  }

  return (
    <section className="hero" ref={ref} onPointerMove={onMove}>
      <motion.div style={{ y: reduce ? 0 : mediaY, position: 'absolute', inset: 0, zIndex: -2 }}>
        <motion.div style={{ x: reduce ? 0 : sceneX, y: reduce ? 0 : sceneY, width: '100%', height: '100%' }}>
          <VectorScene />
        </motion.div>
      </motion.div>
      <CursorSparkles target={ref} />

      <div className="wrap">
        <motion.div className="hero-copy" style={{ y: reduce ? 0 : copyY, opacity: reduce ? 1 : copyOpacity }}>
          <div className="badge">
            <span className="dot" />
            <span>AI-Crafted Celebrations</span>
          </div>
          <h1>
            <span className="line">
              <motion.span custom={0} variants={lineVariants} initial="hidden" animate="show">
                Where every detail
              </motion.span>
            </span>
            <span className="line">
              <motion.span custom={1} variants={lineVariants} initial="hidden" animate="show">
                finds its <em className="gold-text">grace.</em>
              </motion.span>
            </span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            Intelligent planning for weddings, milestone birthdays and community gatherings. From per-head budgets to
            countdown timelines and bespoke ideas — all tailored in seconds.
          </motion.p>
          <motion.div
            className="hero-cta"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.05 }}
          >
            <BurstButton className="btn btn-primary btn-lg" onActivate={() => onStart()}>
              Create your plan <ArrowRight size={18} />
            </BurstButton>
            <a
              href="#preview"
              className="btn btn-ghost"
              onClick={(e) => {
                e.preventDefault()
                document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              See sample plan
            </a>
          </motion.div>

          <motion.div
            className="trust"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 1.4 }}
          >
            <div>
              <strong>3</strong>event types
            </div>
            <div>
              <strong>40+</strong>milestones
            </div>
            <div>
              <strong>60s</strong>to a full plan
            </div>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="float-chip chip-c"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.8, duration: 0.8 }}
      >
        <i>
          <CalendarCheck size={18} />
        </i>
        <span>
          Timeline<b>24 weeks, 12 milestones</b>
        </span>
      </motion.div>
      <motion.div
        className="float-chip chip-a"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2.1, duration: 0.8 }}
      >
        <i>
          <PiggyBank size={18} />
        </i>
        <span>
          Budget balanced<b>₹12,00,000 · 8 categories</b>
        </span>
      </motion.div>
      <motion.div
        className="float-chip chip-b"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2.4, duration: 0.8 }}
      >
        <i>
          <Store size={18} />
        </i>
        <span>
          Vendors<b>3 of 9 booked</b>
        </span>
      </motion.div>

      <div className="scroll-cue" aria-hidden />
    </section>
  )
}

export function LandingMarquee() {
  const items = [...MARQUEE, ...MARQUEE]
  return (
    <div className="marquee" aria-hidden>
      <div className="marquee-track">
        {items.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>
    </div>
  )
}
