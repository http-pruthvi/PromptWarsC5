import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useRef } from 'react'
import {
  VectorDefs,
  ScrollVine,
  LoopingLotus,
  SectionOrnament,
  FloralCorner,
  Pearls,
  Sprig,
  Sparkle,
  Parallax,
  FeatureIcon,
  OccasionArt,
  BurstButton,
  CursorSparkles,
} from '../components/Vectors.js'

import { VectorScene } from '../components/VectorScene.js'
import { AppContent } from '../components/app/AppContent.js'
import { api } from '../lib/api.js'
import App from '../App.js'

describe('Vectors, Scene & Full App Rendering Suite', () => {
  it('renders vector definitions and ornamentation primitives', () => {
    const { container } = render(
      <div>
        <VectorDefs />
        <ScrollVine />
        <LoopingLotus size={80} />
        <SectionOrnament />
        <FloralCorner pos="tl" size={80} />
        <Pearls size={100} />
        <Sprig size={80} />
        <Sparkle size={50} />
        <Parallax>Parallax Content</Parallax>
      </div>,
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByText('Parallax Content')).toBeInTheDocument()
  })

  it('renders all feature icons without errors', () => {
    const { container } = render(
      <div>
        <FeatureIcon name="budget" size={24} />
        <FeatureIcon name="timeline" size={24} />
        <FeatureIcon name="vendors" size={24} />
        <FeatureIcon name="ideas" size={24} />
        <FeatureIcon name="chat" size={24} />
        <FeatureIcon name="export" size={24} />
      </div>,
    )
    expect(container.querySelectorAll('svg').length).toBe(6)
  })

  it('renders occasion illustrations and interactive effects', () => {
    const { container } = render(
      <div>
        <OccasionArt type="wedding" />
        <OccasionArt type="birthday" />
        <OccasionArt type="community" />
        <BurstButton onActivate={vi.fn()}>Activate</BurstButton>
        <VectorScene />
      </div>,
    )
    expect(screen.getByText('Activate')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders cursor sparkles and responds to pointer events', () => {
    function SparkleTest() {
      const ref = useRef<HTMLDivElement>(null)
      return (
        <div ref={ref} style={{ width: 300, height: 300 }}>
          <CursorSparkles target={ref} />
        </div>
      )
    }
    const { container } = render(<SparkleTest />)
    const el = container.firstElementChild as HTMLElement
    fireEvent.pointerMove(el, { clientX: 50, clientY: 50 })
    expect(container.querySelector('.sparkles')).toBeInTheDocument()
  })

  it('renders AppContent router across routes and auth modal', async () => {
    const start = vi.fn()
    const go = vi.fn()
    const setShowAuth = vi.fn()
    const handleAuthSuccess = vi.fn()
    const toast = vi.fn()
    vi.spyOn(api.plans, 'list').mockResolvedValue({ plans: [] })
    vi.spyOn(api.public, 'getPlan').mockRejectedValue(new Error('no link'))

    const { rerender } = render(
      <AppContent
        route="home"
        plannerKey={1}
        user={null}
        showAuth={false}
        start={start}
        go={go}
        setShowAuth={setShowAuth}
        handleAuthSuccess={handleAuthSuccess}
        toast={toast}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('AI-Crafted Celebrations')).toBeInTheDocument()
    })

    rerender(
      <AppContent
        route="share"
        token="demo"
        plannerKey={1}
        user={null}
        showAuth={false}
        start={start}
        go={go}
        setShowAuth={setShowAuth}
        handleAuthSuccess={handleAuthSuccess}
        toast={toast}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Plan Not Found')).toBeInTheDocument()
    })

    rerender(
      <AppContent
        route="planner"
        preset="wedding"
        plannerKey={2}
        user={null}
        showAuth={true}
        start={start}
        go={go}
        setShowAuth={setShowAuth}
        handleAuthSuccess={handleAuthSuccess}
        toast={toast}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText(/Welcome back to Soirée/i)).toBeInTheDocument()
    })
  })

  it('renders root App shell cleanly', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getAllByText('Soirée').length).toBeGreaterThan(0)
    })
  })
})
