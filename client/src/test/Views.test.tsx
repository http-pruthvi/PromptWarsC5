import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Navbar } from '../components/Navbar.js'
import AuthModal from '../components/AuthModal.js'
import Dashboard from '../components/Dashboard.js'
import { Landing } from '../components/Landing.js'
import SharedPlanPage from '../components/SharedPlanPage.js'
import { api } from '../lib/api.js'
import type { PlanSummary, PublicPlanView } from '@soiree/shared'

describe('Views Integration Suite: Navbar, AuthModal, Dashboard, Landing, SharedPlanPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders Navbar, toggles mobile drawer, and handles auth interactions', () => {
    const go = vi.fn()
    const onOpenAuth = vi.fn()
    const onLogout = vi.fn()

    const { rerender } = render(<Navbar route="home" go={go} user={null} onOpenAuth={onOpenAuth} onLogout={onLogout} />)

    expect(screen.getByText('Soirée')).toBeInTheDocument()
    const signInBtn = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(signInBtn)
    expect(onOpenAuth).toHaveBeenCalled()

    // Open mobile navigation drawer
    const burgerBtn = screen.getByRole('button', { name: /open navigation menu/i })
    fireEvent.click(burgerBtn)
    expect(screen.getByRole('dialog', { name: /mobile navigation/i })).toBeInTheDocument()

    // Click mobile drawer link
    const mobileLinks = screen.getAllByRole('link', { name: /features/i })
    fireEvent.click(mobileLinks[mobileLinks.length - 1]!)
    expect(go).toHaveBeenCalledWith('home', 'features')

    // Press Escape to close
    fireEvent.keyDown(window, { key: 'Escape' })

    // Logged in state
    rerender(
      <Navbar
        route="planner"
        go={go}
        user={{ id: 'u1', email: 'host@soiree.com', isGuest: false, createdAt: 100 }}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
      />,
    )
    expect(screen.getByText('host')).toBeInTheDocument()
    const logoutBtn = screen.getByTitle('Sign out')
    fireEvent.click(logoutBtn)
    expect(onLogout).toHaveBeenCalled()

    // Open drawer in planner route while logged in
    fireEvent.click(burgerBtn)
    const homeBtns = screen.getAllByRole('button', { name: /back to home/i })
    fireEvent.click(homeBtns[homeBtns.length - 1]!)
    expect(go).toHaveBeenCalledWith('home')
  })

  it('handles AuthModal mode switching, submission, and guest login', async () => {
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    vi.spyOn(api.auth, 'guest').mockResolvedValue({
      user: { id: 'g1', email: null, isGuest: true, createdAt: 100 },
    })
    vi.spyOn(api.auth, 'login').mockResolvedValue({
      user: { id: 'u1', email: 'test@example.com', isGuest: false, createdAt: 100 },
    })

    render(<AuthModal onSuccess={onSuccess} onClose={onClose} />)
    expect(screen.getByText(/Welcome back to Soirée/i)).toBeInTheDocument()

    // Click 1-Click Guest demo
    const guestBtn = screen.getByRole('button', { name: /continue as guest/i })
    fireEvent.click(guestBtn)
    await waitFor(() => {
      expect(api.auth.guest).toHaveBeenCalled()
      expect(onSuccess).toHaveBeenCalled()
    })

    // Mode switch to register and back to login
    const regTab = screen.getByRole('button', { name: /create account/i })
    fireEvent.click(regTab)
    expect(screen.getByText(/Begin your celebration/i)).toBeInTheDocument()

    const loginTab = screen.getByRole('button', { name: /^sign in$/i })
    fireEvent.click(loginTab)

    // Failed login shows alert
    vi.spyOn(api.auth, 'login').mockRejectedValueOnce(new Error('Invalid email or password'))
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'bad@user.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'wrongpass' } })
    const submitBtns = screen.getAllByRole('button', { name: /^sign in$/i })
    fireEvent.click(submitBtns[submitBtns.length - 1]!)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('renders Dashboard with plans list and handles delete/open', () => {
    const plans: PlanSummary[] = [
      {
        id: 'p1',
        title: 'Sapphire Anniversary',
        type: 'wedding',
        date: '2026-12-01',
        guests: 40,
        budget: 6000,
        currency: 'EUR',
        city: 'Milan',
        summary: 'Romantic Italian celebration.',
        generatedBy: 'gemini',
        createdAt: 1774900000000,
      },
    ]
    const onOpen = vi.fn()
    const onDelete = vi.fn()
    const onNew = vi.fn()

    const { rerender } = render(
      <Dashboard plans={plans} loading={false} onOpen={onOpen} onDelete={onDelete} onNew={onNew} />,
    )

    expect(screen.getByText('Sapphire Anniversary')).toBeInTheDocument()
    expect(screen.getByText('Gemini AI')).toBeInTheDocument()
    const card = screen.getByText('Sapphire Anniversary')
    fireEvent.click(card)
    expect(onOpen).toHaveBeenCalledWith('p1')

    // Confirm cancelled
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const deleteBtn = screen.getByTitle('Delete celebration')
    fireEvent.click(deleteBtn)
    expect(onDelete).not.toHaveBeenCalled()

    // Confirm accepted
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(deleteBtn)
    expect(onDelete).toHaveBeenCalledWith('p1')

    // Empty state
    rerender(<Dashboard plans={[]} loading={false} onOpen={onOpen} onDelete={onDelete} onNew={onNew} />)
    expect(screen.getByText(/No celebrations planned yet/i)).toBeInTheDocument()
  })

  it('renders Landing page hero and occasion selectors', async () => {
    const onStart = vi.fn()
    const { container } = render(<Landing onStart={onStart} />)
    expect(screen.getByText('AI-Crafted Celebrations')).toBeInTheDocument()

    const hero = container.querySelector('.hero') as HTMLElement
    fireEvent.pointerMove(hero, { clientX: 200, clientY: 200 })

    const sampleLink = screen.getByRole('link', { name: /see sample plan/i })
    fireEvent.click(sampleLink)

    const startBtn = screen.getByRole('button', { name: /create your plan/i })
    fireEvent.click(startBtn)
    await waitFor(() => {
      expect(onStart).toHaveBeenCalled()
    })
  })

  it('renders SharedPlanPage with public event details and error fallback', async () => {
    const publicPlan: PublicPlanView = {
      title: 'Solstice Banquet',
      eventType: 'birthday',
      date: '2026-06-21',
      city: 'Stockholm',
      summary: 'Midsummer banquet with candlelit long tables.',
      timeline: [{ id: 'm1', label: 'Tasting menu', detail: 'Finalize menu', weeksBefore: 3, done: true }],
      vendors: [{ category: 'Chef', status: 'booked' }],
      ideas: [{ title: 'Lighting', items: ['Luminaria lanterns'] }],
      moodboard: {
        palette: [
          { hex: '#2b2d42', name: 'Midnight', role: 'Primary' },
          { hex: '#8d99ae', name: 'Slate', role: 'Secondary' },
        ],
        typography: {
          heading: 'Playfair Display',
          body: 'Inter',
          vibe: 'Nordic Modern',
        },
        motifs: ['Birch twigs'],
        decor: ['Long timber tables'],
        outfitNotes: ['Linen chic'],
        playlistVibes: ['Scandinavian acoustic'],
      },
    }

    vi.spyOn(api.public, 'getPlan').mockResolvedValue({ plan: publicPlan })
    const { rerender } = render(<SharedPlanPage token="tok-123" onGoHome={vi.fn()} onStartPlanning={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Solstice Banquet')).toBeInTheDocument()
      expect(screen.getByText('Playfair Display')).toBeInTheDocument()
    })

    // Plan Not Found state
    const onGoHome = vi.fn()
    vi.spyOn(api.public, 'getPlan').mockRejectedValueOnce(new Error('Link revoked'))
    rerender(<SharedPlanPage token="revoked-tok" onGoHome={onGoHome} onStartPlanning={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Plan Not Found')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /return to home/i }))
    expect(onGoHome).toHaveBeenCalled()
  })
})
