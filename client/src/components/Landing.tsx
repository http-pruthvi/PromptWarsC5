import type { EventType } from '@soiree/shared'
import { Ribbon } from './common'
import { LandingFeatures, LandingHowItWorks } from './landing/LandingFeatures'
import { LandingHero, LandingMarquee } from './landing/LandingHero'
import { LandingFinalCta, LandingFooter, LandingOccasions, LandingPreview } from './landing/LandingOccasions'
import { SectionOrnament } from './Vectors'

interface Props {
  onStart: (type?: EventType) => void
}

/**
 * High-aesthetic landing page presenting Soirée capabilities, interactive preview, and occasion entrypoints.
 */
export function Landing({ onStart }: Props) {
  return (
    <>
      <LandingHero onStart={onStart} />
      <LandingMarquee />
      <LandingFeatures />
      <Ribbon />
      <LandingHowItWorks />
      <SectionOrnament />
      <LandingOccasions onStart={onStart} />
      <SectionOrnament />
      <LandingPreview onStart={onStart} />
      <LandingFinalCta onStart={onStart} />
      <LandingFooter />
    </>
  )
}
