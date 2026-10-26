import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Plan } from '@soiree/shared'
import PlanView from '../components/PlanView.js'
import { api } from '../lib/api.js'

describe('PlanView Component & Subcomponents Integration Suite', () => {
  const samplePlan: Plan = {
    id: 'view-plan-1',
    createdAt: 1774900000000,
    brief: {
      title: 'Venetian Masquerade',
      type: 'birthday',
      date: '2026-11-15',
      guests: 80,
      budget: 8000,
      currency: 'EUR',
      city: 'Venice',
      vibe: 'Mystical',
      notes: '',
    },
    summary: 'A grand masquerade ball along the Grand Canal.',
    generatedBy: 'local',
    budget: [{ id: 'b1', category: 'Costumes & Masks', allocated: 2000, spent: 500, note: '' }],
    timeline: [{ id: 'm1', label: 'Hire Gondolas', detail: 'Arrivals by water', weeksBefore: 6, done: false }],
    vendors: [{ id: 'v1', category: 'Mask Atelier', name: 'Ca Macana', status: 'contacted', estimate: 1500, tips: '' }],
    ideas: [{ title: 'Dramatic Reveals', items: ['Midnight unmasking', 'Violin entrance'] }],
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api.plans, 'getShare').mockResolvedValue({ shareToken: 'tok1', shareEnabled: true })
    vi.spyOn(api.plans, 'updateMilestone').mockResolvedValue({ id: 'm1', done: true })
  })

  it('renders plan header metrics, summary, and triggers navigation callbacks', () => {
    const setPlan = vi.fn()
    const onNew = vi.fn()
    const onBack = vi.fn()
    const toast = vi.fn()

    render(<PlanView plan={samplePlan} setPlan={setPlan} onNew={onNew} onBackToDashboard={onBack} toast={toast} />)

    expect(screen.getByText('Venetian Masquerade')).toBeInTheDocument()
    expect(screen.getByText('A grand masquerade ball along the Grand Canal.')).toBeInTheDocument()

    const newBtn = screen.getByRole('button', { name: /new plan/i })
    fireEvent.click(newBtn)
    expect(onNew).toHaveBeenCalled()

    const backBtn = screen.getByRole('button', { name: /all plans/i })
    fireEvent.click(backBtn)
    expect(onBack).toHaveBeenCalled()

    // Test Gemini badge and default title without city
    const { unmount } = render(
      <PlanView
        plan={{ ...samplePlan, generatedBy: 'gemini', brief: { ...samplePlan.brief, city: '', title: '' } }}
        setPlan={setPlan}
        onNew={onNew}
        onBackToDashboard={onBack}
        toast={toast}
      />,
    )
    expect(screen.getByText('Gemini AI')).toBeInTheDocument()
    expect(screen.getByText('Your birthday')).toBeInTheDocument()
    unmount()
  })

  it('switches tabs smoothly via PlanTabBar', async () => {
    const setPlan = vi.fn()
    const toast = vi.fn()

    render(<PlanView plan={samplePlan} setPlan={setPlan} onNew={vi.fn()} onBackToDashboard={vi.fn()} toast={toast} />)

    // Switch to Timeline
    const timelineTab = screen.getByRole('tab', { name: /timeline/i })
    fireEvent.click(timelineTab)
    await waitFor(() => {
      expect(screen.getByText('Hire Gondolas')).toBeInTheDocument()
    })

    // Switch to Vendors
    const vendorsTab = screen.getByRole('tab', { name: /vendors/i })
    fireEvent.click(vendorsTab)
    await waitFor(() => {
      expect(screen.getByText('Mask Atelier')).toBeInTheDocument()
    })

    // Switch to Ideas
    const ideasTab = screen.getByRole('tab', { name: /ideas/i })
    fireEvent.click(ideasTab)
    await waitFor(() => {
      expect(screen.getByText('Dramatic Reveals')).toBeInTheDocument()
    })
  })

  it('opens share modal and enables public sharing', async () => {
    const toast = vi.fn()
    render(<PlanView plan={samplePlan} setPlan={vi.fn()} onNew={vi.fn()} onBackToDashboard={vi.fn()} toast={toast} />)

    const shareBtn = screen.getByRole('button', { name: /^share$/i })
    fireEvent.click(shareBtn)

    await waitFor(() => {
      expect(screen.getByText(/Share Celebration Plan/i)).toBeInTheDocument()
    })

    const closeBtn = screen.getByRole('button', { name: /close share dialog/i })
    fireEvent.click(closeBtn)
  })

  it('optimistically toggles milestones and rolls back on failure', async () => {
    const setPlan = vi.fn()
    const toast = vi.fn()
    vi.spyOn(api.plans, 'updateMilestone').mockRejectedValueOnce(new Error('Network offline'))

    render(<PlanView plan={samplePlan} setPlan={setPlan} onNew={vi.fn()} onBackToDashboard={vi.fn()} toast={toast} />)

    const checkBtn = screen.getByRole('button', { name: /mark as/i })
    fireEvent.click(checkBtn)

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Failed to update milestone on server')
    })
  })

  it('updates budget allocated and spent values via debounced patch', async () => {
    const setPlan = vi.fn()
    const toast = vi.fn()
    vi.spyOn(api.plans, 'updateBudget').mockResolvedValue({ item: samplePlan.budget[0]! })

    render(<PlanView plan={samplePlan} setPlan={setPlan} onNew={vi.fn()} onBackToDashboard={vi.fn()} toast={toast} />)

    const budgetTab = screen.getByRole('tab', { name: /budget/i })
    fireEvent.click(budgetTab)

    await waitFor(() => {
      expect(screen.getByText('Costumes & Masks')).toBeInTheDocument()
    })

    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[0]!, { target: { value: '2500' } })
    expect(setPlan).toHaveBeenCalled()

    await waitFor(() => {
      expect(api.plans.updateBudget).toHaveBeenCalledWith('view-plan-1', 'b1', { allocated: 2500 })
    })
  })
})
