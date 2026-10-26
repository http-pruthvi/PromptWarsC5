import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react'
import AuthModal from '../components/AuthModal.js'
import { Toast, spotlight, DonutChart, Logo, Ribbon } from '../components/common.js'
import { PlanTabContent } from '../components/plan/PlanTabContent.js'
import { useShareModal } from '../hooks/useShareModal.js'
import { api } from '../lib/api.js'
import type { Plan, Moodboard } from '@soiree/shared'

const mockMoodboard: Moodboard = {
  palette: [{ hex: '#d4af37', name: 'Gold', role: 'Primary' }],
  typography: { heading: 'Cinzel', body: 'Inter', vibe: 'Grand' },
  motifs: ['Silk'],
  decor: ['Chandeliers'],
  outfitNotes: ['Black Tie'],
  playlistVibes: ['Jazz'],
}

const mockPlan: Plan = {
  id: 'extra-p1',
  createdAt: 1774900000000,
  brief: {
    title: 'Branch Test Gala',
    type: 'wedding',
    date: '2026-11-15',
    guests: 50,
    budget: 10000,
    currency: 'USD',
    city: 'Chicago',
    vibe: 'Elegant',
    notes: '',
  },
  summary: 'Evening gala celebration.',
  budget: [{ id: 'b1', category: 'Venue', allocated: 4000, spent: 3800, note: '' }],
  timeline: [{ id: 'm1', label: 'Catering', detail: 'Finalize menu', weeksBefore: 2, done: false }],
  vendors: [{ id: 'v1', category: 'Caterer', name: 'Gourmet Co', status: 'contacted', estimate: 2000, tips: '' }],
  ideas: [{ title: 'Decor', items: ['Centerpieces'] }],
  generatedBy: 'gemini',
}

describe('ComponentsExtra Branch Coverage Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('covers AuthModal register success, register failure, and guest failure', async () => {
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    vi.spyOn(api.auth, 'register').mockResolvedValueOnce({
      user: { id: 'u-reg', email: 'registered@test.com', isGuest: false, createdAt: 100 },
    })

    render(<AuthModal onSuccess={onSuccess} onClose={onClose} initialMode="register" />)
    expect(screen.getByText(/Begin your celebration/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'registered@test.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'securePass123' } })
    const submitBtns = screen.getAllByRole('button', { name: /create account/i })
    const submitBtn = submitBtns[submitBtns.length - 1]!
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(api.auth.register).toHaveBeenCalledWith('registered@test.com', 'securePass123')
      expect(onSuccess).toHaveBeenCalled()
    })

    // Register failure branch
    vi.spyOn(api.auth, 'register').mockRejectedValueOnce(new Error('Email already registered'))
    fireEvent.click(submitBtn)
    expect(await screen.findByRole('alert')).toHaveTextContent('Email already registered')

    // Guest login failure branch
    vi.spyOn(api.auth, 'guest').mockRejectedValueOnce('Network failure')
    const guestBtn = screen.getByRole('button', { name: /continue as guest/i })
    fireEvent.click(guestBtn)
    expect(await screen.findByRole('alert')).toHaveTextContent('Guest login failed.')

    // Close button
    const closeBtn = screen.getByLabelText(/close authentication dialog/i)
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalled()
  })

  it('covers common utility components: Toast, spotlight, DonutChart, Logo, Ribbon', () => {
    const { rerender } = render(<Toast message={null} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    rerender(<Toast message="Item saved" />)
    expect(screen.getByRole('status')).toHaveTextContent('Item saved')

    const el = document.createElement('div')
    spotlight({
      currentTarget: el,
      clientX: 50,
      clientY: 80,
    } as unknown as React.MouseEvent<HTMLElement>)
    expect(el.style.getPropertyValue('--mx')).toBeDefined()

    render(<DonutChart data={[{ label: 'Solo', value: 100 }]} />)
    render(<Logo size={36} />)
    render(<Ribbon />)
  })

  it('covers PlanTabContent for non-budget tabs', async () => {
    const setPlan = vi.fn()
    const toast = vi.fn()
    const toggleMilestone = vi.fn()

    const { rerender } = render(
      <PlanTabContent
        tab="vendors"
        plan={mockPlan}
        setPlan={setPlan}
        totalAlloc={4000}
        totalSpent={3800}
        onEdit={vi.fn()}
        toast={toast}
        toggleMilestone={toggleMilestone}
      />,
    )
    await waitFor(() => {
      expect(screen.getByDisplayValue('Gourmet Co')).toBeInTheDocument()
    })

    vi.spyOn(api.plans, 'listGuests').mockResolvedValue({
      guests: [
        {
          id: 'g1',
          name: 'Alex Smith',
          party: 1,
          status: 'attending',
          dietary: 'vegan',
          notes: 'VIP',
        },
      ],
    })
    vi.spyOn(api.plans, 'getGuestSummary').mockResolvedValue({
      summary: {
        totalGuests: 1,
        confirmedHeadcount: 1,
        countsByStatus: {
          attending: 1,
          pending: 0,
          declined: 0,
        },
        countsByDietary: {
          none: 0,
          veg: 0,
          vegan: 1,
          jain: 0,
          halal: 0,
          other: 0,
        },
        cateringAllocation: 2000,
        costPerHead: 40,
      },
    })

    rerender(
      <PlanTabContent
        tab="guests"
        plan={mockPlan}
        setPlan={setPlan}
        totalAlloc={4000}
        totalSpent={3800}
        onEdit={vi.fn()}
        toast={toast}
        toggleMilestone={toggleMilestone}
      />,
    )
    await waitFor(() => {
      expect(screen.getByDisplayValue('Alex Smith')).toBeInTheDocument()
    })

    vi.spyOn(api.plans, 'getMoodboard').mockResolvedValue({
      moodboard: mockMoodboard,
      generatedBy: 'gemini',
      createdAt: '2026-02-01',
    })

    rerender(
      <PlanTabContent
        tab="moodboard"
        plan={mockPlan}
        setPlan={setPlan}
        totalAlloc={4000}
        totalSpent={3800}
        onEdit={vi.fn()}
        toast={toast}
        toggleMilestone={toggleMilestone}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Cinzel')).toBeInTheDocument()
    })
  })

  it('covers useShareModal revoke and failure branches', async () => {
    const { result } = renderHook(() => useShareModal())
    const toast = vi.fn()

    // getShare failure branch
    vi.spyOn(api.plans, 'getShare').mockRejectedValueOnce(new Error('Share fetch error'))
    await act(async () => {
      await result.current.openShareModal('p1')
    })
    expect(result.current.shareData?.shareToken).toBeNull()

    // copyShareLink with null token returns early
    act(() => {
      result.current.copyShareLink(toast)
    })
    expect(toast).not.toHaveBeenCalled()

    // revoke share branch
    vi.spyOn(api.plans, 'getShare').mockResolvedValueOnce({ shareToken: 'tok-xyz', shareEnabled: true })
    await act(async () => {
      await result.current.openShareModal('p1')
    })
    vi.spyOn(api.plans, 'revokeShare').mockResolvedValueOnce({ message: 'Revoked', shareEnabled: false })
    await act(async () => {
      await result.current.toggleShareEnabled('p1', toast)
    })
    expect(toast).toHaveBeenCalledWith('Share link revoked')

    // toggle failure branch
    vi.spyOn(api.plans, 'enableShare').mockRejectedValueOnce(new Error('Network error'))
    await act(async () => {
      await result.current.toggleShareEnabled('p1', toast)
    })
    expect(toast).toHaveBeenCalledWith('Failed to update share link settings')
  })
})
