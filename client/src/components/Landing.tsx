import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight, CalendarCheck, Check, Gem, MessageCircleHeart, PiggyBank, Share2, Sparkles, Store, Wand2,
} from 'lucide-react'
import { useRef } from 'react'
import type { EventType } from '../types'
import { DonutChart, PALETTE, Reveal, Ribbon, VideoBg, spotlight } from './common'

interface Props {
  onStart: (type?: EventType) => void
}

const MARQUEE = [
  'Weddings', 'Sangeet nights', 'Birthdays', 'Baby showers', 'Anniversaries', 'Garba evenings',
  'Community fairs', 'Cultural fests', 'Charity drives', 'Reunions', 'Housewarmings',
]

const lineVariants = {
  hidden: { y: '110%' },
  show: (i: number) => ({ y: 0, transition: { duration: 1.1, delay: 0.25 + i * 0.14, ease: [0.22, 1, 0.36, 1] as const } }),
}

export function Hero({ onStart }: Props) {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const mediaY = useTransform(scrollYProgress, [0, 1], ['0%', '14%'])
  const copyY = useTransform(scrollYProgress, [0, 1], ['0%', '-12%'])
  const copyOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  return (
    <section className="hero" ref={ref}>
      <motion.div style={{ y: reduce ? 0 : mediaY, position: 'absolute', inset: 0, zIndex: -2 }}>
        <VideoBg />
      </motion.div>
      <div className="hero-veil" />

      <div className="wrap hero-inner">
        <motion.div className="hero-copy" style={{ y: reduce ? 0 : copyY, opacity: reduce ? 1 : copyOpacity }}>
          <motion.span className="eyebrow" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
            <Sparkles size={14} /> GenAI event planning
          </motion.span>

          <h1>
            {['Celebrations,', 'composed with'].map((t, i) => (
              <span className="line" key={t}>
                <motion.span style={{ display: 'block' }} custom={i} variants={lineVariants} initial="hidden" animate="show">
                  {t}
                </motion.span>
              </span>
            ))}
            <span className="line">
              <motion.span style={{ display: 'block' }} custom={2} variants={lineVariants} initial="hidden" animate="show">
                <em className="gold-text">intelligence.</em>
              </motion.span>
            </span>
          </h1>

          <motion.p className="lede" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.9 }}>
            Soirée is your AI planning assistant for weddings, birthdays and community events — budgets that balance,
            timelines that run themselves, vendor checklists and ideas that feel like you.
          </motion.p>

          <motion.div className="cta-row" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1.1 }}>
            <button className="btn btn-primary" onClick={() => onStart()}>
              Plan my event <ArrowRight size={18} />
            </button>
            <a className="btn btn-ghost" href="#/features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }}>
              See how it works
            </a>
          </motion.div>

          <motion.div className="trust" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 1.4 }}>
            <div><strong>3</strong>event types</div>
            <div><strong>40+</strong>milestones</div>
            <div><strong>60s</strong>to a full plan</div>
          </motion.div>
        </motion.div>
      </div>

      <motion.div className="float-chip chip-c" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.8, duration: 0.8 }}>
        <i><CalendarCheck size={18} /></i>
        <span>Timeline<b>24 weeks, 12 milestones</b></span>
      </motion.div>
      <motion.div className="float-chip chip-a" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2.1, duration: 0.8 }}>
        <i><PiggyBank size={18} /></i>
        <span>Budget balanced<b>₹12,00,000 · 8 categories</b></span>
      </motion.div>
      <motion.div className="float-chip chip-b" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2.4, duration: 0.8 }}>
        <i><Store size={18} /></i>
        <span>Vendors<b>3 of 9 booked</b></span>
      </motion.div>

      <div className="scroll-cue" aria-hidden />
    </section>
  )
}

export function Marquee() {
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

const FEATURES = [
  { icon: PiggyBank, title: 'Smart budgets', text: 'Tell us your total and guest count. We split it across categories, track every rupee spent and warn you before you overshoot.' },
  { icon: CalendarCheck, title: 'Adaptive timelines', text: 'Milestones counted back from your date — automatically compressed when you are short on time. Export to your calendar.' },
  { icon: Store, title: 'Vendor checklists', text: 'From venue to makeup artist: budget estimates, status tracking and insider tips for every vendor you need to book.' },
  { icon: Wand2, title: 'Personalised ideas', text: 'Themes, menus, entertainment and guest touches tuned to your vibe, city and crowd — shuffle until it feels right.' },
  { icon: MessageCircleHeart, title: 'Ask Soirée', text: 'A planning companion that knows your budget, tasks and vendors. Ask how to save, what to do next, or for a fresh idea.' },
  { icon: Share2, title: 'Share & export', text: 'Print a clean plan, download a calendar file, and keep everything saved privately in your browser.' },
]

export function Features() {
  return (
    <section className="section" id="features">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="kicker">Everything in one place</span>
          <h2>Every detail, <em>gracefully</em> handled.</h2>
          <p>Stop juggling spreadsheets and chat groups. Soirée turns a few answers into a plan you can actually run.</p>
        </Reveal>
        <div className="grid-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.1}>
              <div className="card" onMouseMove={spotlight} style={{ height: '100%' }}>
                <div className="icon-orb"><f.icon size={24} strokeWidth={1.6} /></div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HowItWorks() {
  const steps = [
    { t: 'Share the occasion', p: 'Pick wedding, birthday or community event, then add date, guests, budget, city and the vibe you imagine.' },
    { t: 'AI composes your plan', p: 'In moments you get a balanced budget, a countdown timeline, a vendor checklist and a set of tailored ideas.' },
    { t: 'Refine and track', p: 'Edit numbers, tick off milestones, book vendors and ask Soirée anything. Your plan updates as you go.' },
  ]
  return (
    <section className="section" id="how">
      <div className="wrap">
        <Reveal className="section-head center">
          <span className="kicker">How it works</span>
          <h2>From idea to itinerary in <em>three</em> steps.</h2>
        </Reveal>
        <div className="steps">
          {steps.map((s, i) => (
            <Reveal key={s.t} delay={i * 0.15} className="step">
              <h3>{s.t}</h3>
              <p>{s.p}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Occasions({ onStart }: Props) {
  const cards: Array<{ type: EventType; title: string; text: string; bg: string; glyph: string; tags: string[] }> = [
    { type: 'wedding', title: 'Weddings', text: 'Multi-day celebrations with rituals, guests and vendors to coordinate.', bg: 'bg-wed', glyph: '&', tags: ['Venue', 'Catering', 'Sangeet', 'Stay'] },
    { type: 'birthday', title: 'Birthdays', text: 'Milestone parties and surprises with games, cake and unforgettable moments.', bg: 'bg-bday', glyph: '✦', tags: ['Theme', 'Cake', 'Games', 'Favours'] },
    { type: 'community', title: 'Community events', text: 'Fests, drives and gatherings with committees, permits and volunteers.', bg: 'bg-comm', glyph: '❋', tags: ['Permits', 'Volunteers', 'Sound', 'Outreach'] },
  ]
  return (
    <section className="section" id="occasions">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="kicker">Occasions</span>
          <h2>Made for the moments <em>that matter.</em></h2>
        </Reveal>
        <div className="types">
          {cards.map((c, i) => (
            <Reveal key={c.type} delay={i * 0.12}>
              <button className="type-card" onClick={() => onStart(c.type)} style={{ width: '100%' }}>
                <div className={`bg ${c.bg}`} />
                <span className="glyph" aria-hidden>{c.glyph}</span>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
                <ul>{c.tags.map((t) => <li key={t}>{t}</li>)}</ul>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Preview({ onStart }: Props) {
  const data = [
    { label: 'Venue & Decor', value: 28 },
    { label: 'Catering', value: 30 },
    { label: 'Photography', value: 10 },
    { label: 'Attire & Beauty', value: 10 },
    { label: 'Music', value: 6 },
    { label: 'Other', value: 16 },
  ]
  const tasks = [
    { t: 'Shortlist and book venue', w: '36 wks', done: true },
    { t: 'Hire planner & key vendors', w: '30 wks', done: true },
    { t: 'Finalise theme & palette', w: '24 wks', done: false },
  ]
  return (
    <section className="section" id="preview">
      <div className="wrap preview">
        <Reveal>
          <div className="mock">
            <div className="mock-head">
              <h4>Aarav &amp; Meera</h4>
              <div className="dots"><i /><i /><i /></div>
            </div>
            <div className="mock-body">
              <DonutChart data={data} centerLabel="Budget" centerValue="₹12L" />
              <div className="legend">
                {data.map((d, i) => (
                  <div key={d.label}>
                    <i style={{ background: PALETTE[i] }} />
                    <span>{d.label}</span>
                    <span>{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="check-list">
              {tasks.map((t) => (
                <div key={t.t} className={`check-row ${t.done ? 'done' : ''}`}>
                  <span className="tick">{t.done && <Check size={14} />}</span>
                  <span>{t.t}</span>
                  <small>{t.w}</small>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <span className="kicker">Live preview</span>
          <div className="section-head" style={{ marginBottom: 0 }}>
            <h2>A plan that <em>breathes</em> with you.</h2>
          </div>
          <ul className="bullets">
            <li><Gem size={20} /><span><b>Budgets that stay honest.</b> Edit any category and see totals, remaining and warnings instantly.</span></li>
            <li><CalendarCheck size={20} /><span><b>Countdown to the big day.</b> Every milestone has a real due date and flags what is running late.</span></li>
            <li><Sparkles size={20} /><span><b>Powered by Gemini.</b> Add your key for fully generative plans, or use the built-in planner offline.</span></li>
          </ul>
          <button className="btn btn-primary" onClick={() => onStart()}>Try it now <ArrowRight size={18} /></button>
        </Reveal>
      </div>
    </section>
  )
}

export function FinalCta({ onStart }: Props) {
  return (
    <section className="cta">
      <VideoBg playbackRate={0.8} />
      <div className="wrap">
        <Reveal>
          <h2>Your next celebration, <em className="gold-text">beautifully planned.</em></h2>
          <p>No spreadsheets. No stress. Just a plan that feels as special as the occasion.</p>
          <button className="btn btn-primary" onClick={() => onStart()}>Start planning free <ArrowRight size={18} /></button>
        </Reveal>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--plum)' }}>Soirée</span>
        <span>AI-powered planning for weddings, birthdays &amp; community events.</span>
        <span>© {new Date().getFullYear()} Soirée · PromptWars Challenge 5</span>
      </div>
    </footer>
  )
}

export function Landing({ onStart }: Props) {
  return (
    <>
      <Hero onStart={onStart} />
      <Marquee />
      <Features />
      <Ribbon />
      <HowItWorks />
      <Occasions onStart={onStart} />
      <Preview onStart={onStart} />
      <FinalCta onStart={onStart} />
      <Footer />
    </>
  )
}
