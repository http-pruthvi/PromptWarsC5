import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Wizard from '../components/Wizard'
import { api } from '../lib/api'
import type { Plan } from '@soiree/shared'

vi.mock('../lib/api', () => ({
  api: {
    auth: {
      me: vi.fn(),
      guest: vi.fn(),
    },
    plans: {
      create: vi.fn(),
    },
  },
}))

describe('Wizard Component Unit & Integration Tests', () => {
  const mockPlan: Plan = {
    id: 'test-wizard-plan-123',
    createdAt: Date.now(),
    brief: {
      type: 'wedding',
      title: 'Aria & Rohan Celebration',
      date: '2028-12-01',
      guests: 200,
      budget: 2000000,
      currency: 'INR',
      city: 'Udaipur',
      vibe: 'Royal Heritage',
      notes: 'Lakefront venue',
    },
    summary: 'A bespoke celebration in Udaipur.',
    budget: [],
    timeline: [],
    vendors: [],
    ideas: [],
    generatedBy: 'local',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial step 0 with event type selection options', () => {
    render(<Wizard onDone={vi.fn()} />)

    expect(screen.getByRole('heading', { name: /What are we celebrating/i })).toBeInTheDocument()
    expect(screen.getByText('Wedding')).toBeInTheDocument()
    expect(screen.getByText('Birthday')).toBeInTheDocument()
    expect(screen.getByText('Community event')).toBeInTheDocument()
  })

  it('progresses from step 0 to step 1 upon clicking Continue', async () => {
    render(<Wizard onDone={vi.fn()} />)

    const continueBtn = screen.getByRole('button', { name: /continue/i })
    fireEvent.click(continueBtn)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /The essentials/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/Event name/i)).toBeInTheDocument()
    })
  })

  it('updates title, guests, budget, and progresses to step 2', async () => {
    render(<Wizard initialType="wedding" onDone={vi.fn()} />)

    const titleInput = screen.getByLabelText(/Event name/i)
    fireEvent.change(titleInput, { target: { value: 'Meera & Kabir Nuptials' } })
    expect(titleInput).toHaveValue('Meera & Kabir Nuptials')

    const continueBtn = screen.getByRole('button', { name: /continue/i })
    fireEvent.click(continueBtn)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Set the mood/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Generate my plan/i })).toBeInTheDocument()
    })
  })

  it('submits the form, authenticates if anonymous, and invokes onDone callback', async () => {
    vi.mocked(api.auth.me).mockResolvedValue({
      user: { id: 'u1', email: 'guest@soiree.luxury', isGuest: true, createdAt: Date.now() },
    })
    vi.mocked(api.plans.create).mockResolvedValue({ plan: mockPlan })

    const onDoneMock = vi.fn()
    render(<Wizard initialType="wedding" onDone={onDoneMock} />)

    // Fill title on step 1
    const titleInput = screen.getByLabelText(/Event name/i)
    fireEvent.change(titleInput, { target: { value: 'Aria & Rohan Celebration' } })

    // Step 2
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Generate my plan/i })).toBeInTheDocument()
    })

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /Generate my plan/i })
    fireEvent.click(submitBtn)

    // Expect loading state
    expect(screen.getByText(/Composing your plan…/i)).toBeInTheDocument()

    await waitFor(
      () => {
        expect(onDoneMock).toHaveBeenCalledWith(mockPlan)
      },
      { timeout: 4000 },
    )
  })
})
