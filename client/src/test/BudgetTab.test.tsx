import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BudgetTab from '../components/tabs/BudgetTab'
import { api } from '../lib/api'
import type { Plan } from '@soiree/shared'

vi.mock('../lib/api', () => ({
  api: {
    plans: {
      rebalanceBudget: vi.fn(),
      applyRebalance: vi.fn(),
    },
  },
}))

describe('BudgetTab Component Unit & Integration Tests', () => {
  const mockPlan: Plan = {
    id: 'test-plan-budget-123',
    createdAt: Date.now(),
    brief: {
      type: 'wedding',
      title: 'Grand Palace Soirée',
      date: '2028-10-15',
      guests: 150,
      budget: 1000000,
      currency: 'INR',
      city: 'Jaipur',
      vibe: 'Regal',
      notes: '',
    },
    summary: 'A grand celebration.',
    budget: [
      { id: 'b1', category: 'Venue & Decor', allocated: 500000, spent: 600000, note: 'Palace lawns' },
      { id: 'b2', category: 'Catering & Bar', allocated: 400000, spent: 200000, note: 'Royal thali' },
      { id: 'b3', category: 'Contingency Reserve', allocated: 100000, spent: 0, note: 'Buffer' },
    ],
    timeline: [],
    vendors: [],
    ideas: [],
    generatedBy: 'local',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders budget category rows and overspend badge when spent exceeds allocated', () => {
    render(
      <BudgetTab
        plan={mockPlan}
        setPlan={vi.fn()}
        totalAlloc={1000000}
        totalSpent={800000}
        onEdit={vi.fn()}
        toast={vi.fn()}
      />,
    )

    expect(screen.getByText('Venue & Decor')).toBeInTheDocument()
    expect(screen.getByText('Catering & Bar')).toBeInTheDocument()
    expect(screen.getByText('Contingency Reserve')).toBeInTheDocument()

    // Overspend badge check on Venue & Decor
    expect(screen.getByText(/Over by/i)).toBeInTheDocument()
  })

  it('calls onEdit when updating allocation or spent amounts', () => {
    const onEditMock = vi.fn()
    render(
      <BudgetTab
        plan={mockPlan}
        setPlan={vi.fn()}
        totalAlloc={1000000}
        totalSpent={800000}
        onEdit={onEditMock}
        toast={vi.fn()}
      />,
    )

    const inputs = screen.getAllByRole('spinbutton')
    const allocInput = inputs[0]
    const spentInput = inputs[1]
    if (!allocInput || !spentInput) throw new Error('Inputs not found')

    // First input is allocated for Venue & Decor
    fireEvent.change(allocInput, { target: { value: '550000' } })
    expect(onEditMock).toHaveBeenCalledWith('b1', 'allocated', 550000)

    // Second input is spent for Venue & Decor
    fireEvent.change(spentInput, { target: { value: '620000' } })
    expect(onEditMock).toHaveBeenCalledWith('b1', 'spent', 620000)
  })

  it('triggers AI Budget Rebalancer proposal modal and applies changes', async () => {
    vi.mocked(api.plans.rebalanceBudget).mockResolvedValue({
      proposal: {
        changes: [
          {
            itemId: 'b1',
            category: 'Venue & Decor',
            from: 500000,
            to: 600000,
            reason: 'Increased to cover expenses',
          },
          {
            itemId: 'b2',
            category: 'Catering & Bar',
            from: 400000,
            to: 300000,
            reason: 'Reallocated from headroom',
          },
          {
            itemId: 'b3',
            category: 'Contingency Reserve',
            from: 100000,
            to: 100000,
            reason: 'Contingency preserved untouched',
          },
        ],
        summary: 'Balanced across categories while preserving contingency cushion.',
      },
      ai: true,
    })

    vi.mocked(api.plans.applyRebalance).mockResolvedValue({
      budget: [
        { id: 'b1', category: 'Venue & Decor', allocated: 600000, spent: 600000, note: '' },
        { id: 'b2', category: 'Catering & Bar', allocated: 300000, spent: 200000, note: '' },
        { id: 'b3', category: 'Contingency Reserve', allocated: 100000, spent: 0, note: '' },
      ],
    })

    const setPlanMock = vi.fn()
    const toastMock = vi.fn()

    render(
      <BudgetTab
        plan={mockPlan}
        setPlan={setPlanMock}
        totalAlloc={1000000}
        totalSpent={800000}
        onEdit={vi.fn()}
        toast={toastMock}
      />,
    )

    // Click Rebalance Budget button
    const rebalanceBtn = screen.getByRole('button', { name: /Rebalance with AI/i })
    fireEvent.click(rebalanceBtn)

    await waitFor(() => {
      expect(screen.getByText('AI Budget Rebalancer Proposal')).toBeInTheDocument()
      expect(screen.getByText(/Balanced across categories while preserving contingency cushion/i)).toBeInTheDocument()
    })

    // Apply the proposal
    const applyBtn = screen.getByRole('button', { name: /Apply Rebalance/i })
    fireEvent.click(applyBtn)

    await waitFor(() => {
      expect(api.plans.applyRebalance).toHaveBeenCalled()
      expect(toastMock).toHaveBeenCalledWith('Budget allocations updated successfully')
    })
  })
})
