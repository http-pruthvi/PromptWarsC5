import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Planner from '../components/Planner.js'
import { api } from '../lib/api.js'
import type { Plan } from '@soiree/shared'

describe('Planner Component State & Coordination Suite', () => {
  const samplePlan: Plan = {
    id: 'planner-plan-1',
    createdAt: 1774900000000,
    brief: {
      title: 'Autumn Harvest Dinner',
      type: 'birthday',
      date: '2026-10-25',
      guests: 24,
      budget: 3000,
      currency: 'USD',
      city: 'Napa Valley',
      vibe: 'Rustic Elegance',
      notes: '',
    },
    summary: 'A seasonal harvest dinner among Napa vineyards.',
    generatedBy: 'local',
    budget: [{ id: 'b1', category: 'Wine Pairings', allocated: 1200, spent: 400, note: '' }],
    timeline: [{ id: 'm1', label: 'Reserve vineyard patio', detail: 'Patio booking', weeksBefore: 6, done: true }],
    vendors: [{ id: 'v1', category: 'Sommelier', name: 'Valley Cellars', status: 'booked', estimate: 800, tips: '' }],
    ideas: [{ title: 'Decor', items: ['Gourds and vine centerpieces'] }],
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads plans and displays Dashboard when plans exist', async () => {
    vi.spyOn(api.plans, 'list').mockResolvedValue({
      plans: [
        {
          id: 'planner-plan-1',
          title: 'Autumn Harvest Dinner',
          type: 'birthday',
          date: '2026-10-25',
          guests: 24,
          budget: 3000,
          currency: 'USD',
          city: 'Napa Valley',
          summary: 'A seasonal harvest dinner.',
          generatedBy: 'local',
          createdAt: 1774900000000,
        },
      ],
    })

    const toast = vi.fn()
    render(<Planner user={null} onRequireAuth={vi.fn()} toast={toast} />)

    await waitFor(() => {
      expect(screen.getByText('Autumn Harvest Dinner')).toBeInTheDocument()
    })
  })

  it('opens a plan and switches mode to PlanView', async () => {
    vi.spyOn(api.plans, 'list').mockResolvedValue({
      plans: [
        {
          id: 'planner-plan-1',
          title: 'Autumn Harvest Dinner',
          type: 'birthday',
          date: '2026-10-25',
          guests: 24,
          budget: 3000,
          currency: 'USD',
          city: 'Napa Valley',
          summary: 'A seasonal harvest dinner.',
          generatedBy: 'local',
          createdAt: 1774900000000,
        },
      ],
    })
    vi.spyOn(api.plans, 'get').mockResolvedValue({ plan: samplePlan })
    vi.spyOn(api.plans, 'getShare').mockResolvedValue({ shareToken: null, shareEnabled: false })

    render(<Planner user={null} onRequireAuth={vi.fn()} toast={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Autumn Harvest Dinner')).toBeInTheDocument()
    })

    const card = screen.getByText('Autumn Harvest Dinner')
    fireEvent.click(card)

    await waitFor(() => {
      expect(screen.getByText('A seasonal harvest dinner among Napa vineyards.')).toBeInTheDocument()
    })
  })

  it('deletes a plan from Dashboard and shows confirmation toast', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(api.plans, 'list').mockResolvedValue({
      plans: [
        {
          id: 'planner-plan-1',
          title: 'Autumn Harvest Dinner',
          type: 'birthday',
          date: '2026-10-25',
          guests: 24,
          budget: 3000,
          currency: 'USD',
          city: 'Napa Valley',
          summary: 'A seasonal harvest dinner.',
          generatedBy: 'local',
          createdAt: 1774900000000,
        },
      ],
    })
    vi.spyOn(api.plans, 'delete').mockResolvedValue({ message: 'Deleted' })

    const toast = vi.fn()
    render(<Planner user={null} onRequireAuth={vi.fn()} toast={toast} />)

    await waitFor(() => {
      expect(screen.getByText('Autumn Harvest Dinner')).toBeInTheDocument()
    })

    const deleteBtn = screen.getByTitle('Delete celebration')
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(api.plans.delete).toHaveBeenCalledWith('planner-plan-1')
      expect(toast).toHaveBeenCalledWith('Plan deleted')
    })
  })

  it('starts directly in Wizard mode when presetType is provided', async () => {
    vi.spyOn(api.plans, 'list').mockResolvedValue({ plans: [] })
    render(<Planner presetType="wedding" user={null} onRequireAuth={vi.fn()} toast={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByLabelText(/Event name/i)).toBeInTheDocument()
    })
  })
})
