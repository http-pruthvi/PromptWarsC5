import { animate, motion, useMotionValue } from 'framer-motion'
import { ArrowRight, CalendarCheck, Check, Gem, Sparkles } from 'lucide-react'
import { useRef } from 'react'
import type { EventType } from '@soiree/shared'
import { DonutChart, PALETTE, Reveal } from '../common'
import { VectorScene } from '../VectorScene'
import { BurstButton, FloralCorner, LotusBloom, OccasionArt, Parallax, Pearls, Sparkle, Sprig } from '../Vectors'

interface Props {
  onStart: (type?: EventType) => void
}

export function LandingOccasions({ onStart }: Props) {
  const cards: Array<{ type: EventType; title: string; text: string; bg: string; tags: string[] }> = [
    {
      type: 'wedding',
      title: 'Weddings',
      text: 'Multi-day celebrations with rituals, guests and vendors to coordinate.',
      bg: 'bg-wed',
      tags: ['Venue', 'Catering', 'Sangeet', 'Stay'],
    },
    {
      type: 'birthday',
      title: 'Birthdays',
      text: 'Milestone parties and surprises with games, cake and unforgettable moments.',
      bg: 'bg-bday',
      tags: ['Theme', 'Cake', 'Games', 'Favours'],
    },
    {
      type: 'community',
      title: 'Community events',
      text: 'Fests, drives and gatherings with committees, permits and volunteers.',
      bg: 'bg-comm',
      tags: ['Permits', 'Volunteers', 'Sound', 'Outreach'],
    },
  ]

  return (
    <section className="section" id="occasions">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="kicker">Occasions</span>
          <h2>
            Made for the moments <em>that matter.</em>
          </h2>
        </Reveal>
        <div className="types">
          {cards.map((c, i) => (
            <Reveal key={c.type} delay={i * 0.12}>
              <button className="type-card" onClick={() => onStart(c.type)} style={{ width: '100%' }}>
                <div className={`bg ${c.bg}`} />
                <OccasionArt type={c.type} />
                <h3>{c.title}</h3>
                <p>{c.text}</p>
                <ul>
                  {c.tags.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function LandingPreview({ onStart }: Props) {
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
      <Parallax className="deco-l2" speed={60} spin={20}>
        <Sparkle size={54} />
      </Parallax>
      <div className="wrap preview">
        <Reveal>
          <div className="mock">
            <FloralCorner pos="tr" />
            <div className="mock-head">
              <h4>Aarav &amp; Meera</h4>
              <div className="dots">
                <i />
                <i />
                <i />
              </div>
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
            <h2>
              A plan that <em>breathes</em> with you.
            </h2>
          </div>
          <ul className="bullets">
            <li>
              <Gem size={20} />
              <span>
                <b>Budgets that stay honest.</b> Edit any category and see totals, remaining and warnings instantly.
              </span>
            </li>
            <li>
              <CalendarCheck size={20} />
              <span>
                <b>Countdown to the big day.</b> Every milestone has a real due date and flags what is running late.
              </span>
            </li>
            <li>
              <Sparkles size={20} />
              <span>
                <b>Powered by Gemini.</b> Add your key for fully generative plans, or use the built-in planner offline.
              </span>
            </li>
          </ul>
          <BurstButton className="btn btn-primary" onActivate={() => onStart()}>
            Try it now <ArrowRight size={18} />
          </BurstButton>
        </Reveal>
      </div>
    </section>
  )
}

export function LandingFinalCta({ onStart }: Props) {
  return (
    <section className="cta">
      <div className="hero-media" aria-hidden>
        <VectorScene mirror />
      </div>
      <Parallax className="deco-cta-l" speed={40}>
        <Sprig size={110} />
      </Parallax>
      <Parallax className="deco-cta-r" speed={60}>
        <Pearls size={110} />
      </Parallax>
      <div className="wrap">
        <Reveal>
          <h2>
            Your next celebration, <em className="gold-text">beautifully planned.</em>
          </h2>
          <p>No spreadsheets. No stress. Just a plan that feels as special as the occasion.</p>
          <BurstButton className="btn btn-primary" onActivate={() => onStart()}>
            Start planning free <ArrowRight size={18} />
          </BurstButton>
        </Reveal>
      </div>
    </section>
  )
}

function FooterLotus() {
  const p = useMotionValue(0)
  const ref = useRef<HTMLDivElement>(null)
  return (
    <motion.div
      className="footer-lotus"
      ref={ref}
      onViewportEnter={() => animate(p, 1, { duration: 2.4, ease: [0.22, 1, 0.36, 1] })}
      viewport={{ once: true, margin: '-40px' }}
    >
      <LotusBloom progress={p} size={140} line />
    </motion.div>
  )
}

export function LandingFooter() {
  return (
    <footer className="footer">
      <FooterLotus />
      <div className="wrap footer-inner">
        <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--plum)' }}>Soirée</span>
        <span>AI-powered planning for weddings, birthdays &amp; community events.</span>
        <span>© {new Date().getFullYear()} Soirée · PromptWars Challenge 5</span>
      </div>
    </footer>
  )
}
