import { useRef } from 'react'
import { Reveal, spotlight } from '../common'
import { FeatureIcon, Pearls, Parallax, ScrollLotus, Sprig, type IconName } from '../Vectors'

const FEATURES: Array<{ icon: IconName; title: string; text: string }> = [
  {
    icon: 'budget',
    title: 'Smart budgets',
    text: 'Tell us your total and guest count. We split it across categories, track every rupee spent and warn you before you overshoot.',
  },
  {
    icon: 'timeline',
    title: 'Adaptive timelines',
    text: 'Milestones counted back from your date — automatically compressed when you are short on time. Export to your calendar.',
  },
  {
    icon: 'vendors',
    title: 'Vendor checklists',
    text: 'From venue to makeup artist: budget estimates, status tracking and insider tips for every vendor you need to book.',
  },
  {
    icon: 'ideas',
    title: 'Personalised ideas',
    text: 'Themes, menus, entertainment and guest touches tuned to your vibe, city and crowd — shuffle until it feels right.',
  },
  {
    icon: 'chat',
    title: 'Ask Soirée',
    text: 'A planning companion that knows your budget, tasks and vendors. Ask how to save, what to do next, or for a fresh idea.',
  },
  {
    icon: 'export',
    title: 'Share & export',
    text: 'Print a clean plan, download a calendar file, and keep everything saved privately in your browser.',
  },
]

export function LandingFeatures() {
  return (
    <section className="section" id="features">
      <Parallax className="deco-r" speed={50}>
        <Pearls size={150} />
      </Parallax>
      <Parallax className="deco-l" speed={80}>
        <Sprig size={120} />
      </Parallax>
      <div className="wrap">
        <Reveal className="section-head">
          <span className="kicker">Everything in one place</span>
          <h2>
            Every detail, <em>gracefully</em> handled.
          </h2>
          <p>
            Stop juggling spreadsheets and chat groups. Soirée turns a few answers into a plan you can actually run.
          </p>
        </Reveal>
        <div className="grid-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.1}>
              <div className="card" onMouseMove={spotlight} style={{ height: '100%' }}>
                <div className="icon-orb">
                  <FeatureIcon name={f.icon} />
                </div>
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

const HOW_IT_WORKS_STEPS = [
  {
    t: 'Share the occasion',
    p: 'Pick wedding, birthday or community event, then add date, guests, budget, city and the vibe you imagine.',
  },
  {
    t: 'AI composes your plan',
    p: 'In moments you get a balanced budget, a countdown timeline, a vendor checklist and a set of tailored ideas.',
  },
  {
    t: 'Refine and track',
    p: 'Edit numbers, tick off milestones, book vendors and ask Soirée anything. Your plan updates as you go.',
  },
]

export function LandingHowItWorks() {
  const ref = useRef<HTMLElement>(null)

  return (
    <section className="section" id="how" ref={ref}>
      <div className="wrap">
        <Reveal className="section-head center">
          <span className="kicker">How it works</span>
          <h2>
            From idea to itinerary in <em>three</em> steps.
          </h2>
        </Reveal>
        <div className="bloom-stage">
          <ScrollLotus target={ref} size={300} />
        </div>
        <div className="steps">
          {HOW_IT_WORKS_STEPS.map((s, i) => (
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
