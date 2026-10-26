import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GuestsTab from '../components/tabs/GuestsTab'
import { api } from '../lib/api'
import type { Guest, GuestSummary, Plan } from '@soiree/shared'

vi.mock('../lib/api', () => ({
  api: {
    plans: {
      listGuests: vi.fn(),
      getGuestSummary: vi.fn(),
      addGuest: vi.fn(),
      updateGuest: vi.fn(),
      deleteGuest: vi.fn(),
      importGuests: vi.fn(),
    },
  },
}))

describe('GuestsTab Component Unit & Integration Tests', () => {
  const mockPlan: Plan = {
    id: 'test-guests-plan-123',
    createdAt: Date.now(),
    brief: {
      type: 'wedding',
      title: 'Aarav & Meera Wedding',
      date: '2028-11-20',
      guests: 200,
      budget: 2000000,
      currency: 'INR',
      city: 'Delhi',
      vibe: 'Festive',
      notes: '',
    },
    summary: 'A celebration in Delhi.',
    budget: [{ id: 'b1', category: 'Catering & Bar', allocated: 600000, spent: 300000, note: '' }],
    timeline: [],
    vendors: [],
    ideas: [],
    generatedBy: 'local',
  }

  const initialGuests: Guest[] = [
    {
      id: 'g1',
      name: 'Rohan Sharma',
      party: 2,
      status: 'attending',
      dietary: 'veg',
      notes: 'Table 2',
    },
    {
      id: 'g2',
      name: 'Ananya Verma',
      party: 1,
      status: 'pending',
      dietary: 'none',
      notes: '',
    },
  ]

  const initialSummary: GuestSummary = {
    totalGuests: 2,
    confirmedHeadcount: 2,
    countsByStatus: {
      attending: 1,
      pending: 1,
      declined: 0,
    },
    countsByDietary: {
      none: 1,
      veg: 2,
      vegan: 0,
      jain: 0,
      halal: 0,
      other: 0,
    },
    cateringAllocation: 600000,
    costPerHead: 3000,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.plans.listGuests).mockResolvedValue({ guests: initialGuests, total: 2, limit: 100, offset: 0 })
    vi.mocked(api.plans.getGuestSummary).mockResolvedValue({ summary: initialSummary })
  })

  it('loads and renders guest rows and summary metrics', async () => {
    const toastMock = vi.fn()
    render(<GuestsTab plan={mockPlan} toast={toastMock} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Rohan Sharma')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Ananya Verma')).toBeInTheDocument()
      expect(screen.getByText(/Confirmed Headcount/i)).toBeInTheDocument()
      expect(screen.getAllByText(/Vegetarian/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('adds a new guest via the quick add form', async () => {
    const newGuest: Guest = {
      id: 'g3',
      name: 'Kavita Kapoor',
      party: 2,
      status: 'pending',
      dietary: 'jain',
      notes: '',
    }
    vi.mocked(api.plans.addGuest).mockResolvedValue({ guest: newGuest })

    const toastMock = vi.fn()
    render(<GuestsTab plan={mockPlan} toast={toastMock} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Rohan Sharma')).toBeInTheDocument()
    })

    const nameInput = screen.getByLabelText(/New guest name/i)
    fireEvent.change(nameInput, { target: { value: 'Kavita Kapoor' } })

    const addBtn = screen.getByRole('button', { name: /^Add$/i })
    fireEvent.click(addBtn)

    await waitFor(() => {
      expect(api.plans.addGuest).toHaveBeenCalledWith(mockPlan.id, expect.objectContaining({ name: 'Kavita Kapoor' }))
      expect(toastMock).toHaveBeenCalledWith('Added Kavita Kapoor')
    })
  })

  it('opens bulk import modal and imports guests', async () => {
    const importedGuests: Guest[] = [
      { id: 'g4', name: 'Kabir Das', party: 1, status: 'pending', dietary: 'none', notes: '' },
      { id: 'g5', name: 'Priya Sen', party: 2, status: 'pending', dietary: 'none', notes: '' },
    ]
    vi.mocked(api.plans.importGuests).mockResolvedValue({ count: 2, guests: importedGuests })

    const toastMock = vi.fn()
    render(<GuestsTab plan={mockPlan} toast={toastMock} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Rohan Sharma')).toBeInTheDocument()
    })

    // Click Bulk Import button
    const importBtn = screen.getByRole('button', { name: /Open bulk paste import modal/i })
    fireEvent.click(importBtn)

    expect(screen.getByText(/Bulk Paste Guest List/i)).toBeInTheDocument()

    const textarea = screen.getByLabelText(/Pasted guest names, one per line/i)
    fireEvent.change(textarea, { target: { value: 'Kabir Das\nPriya Sen' } })

    const submitImportBtn = screen.getByRole('button', { name: /Import 2 Guests/i })
    fireEvent.click(submitImportBtn)

    await waitFor(() => {
      expect(api.plans.importGuests).toHaveBeenCalledWith(mockPlan.id, 'Kabir Das\nPriya Sen')
      expect(toastMock).toHaveBeenCalledWith('Imported 2 guests')
    })
  })

  it('handles guest status toggle, deletion, and displays capacity alert when over limit', async () => {
    vi.mocked(api.plans.updateGuest).mockResolvedValue({
      guest: { ...initialGuests[0]!, status: 'declined' },
    })
    vi.mocked(api.plans.deleteGuest).mockResolvedValue({ message: 'Deleted' })

    const toastMock = vi.fn()
    // Planned capacity is 1, but confirmed headcount is 2 -> triggers capacity alert
    render(<GuestsTab plan={{ ...mockPlan, brief: { ...mockPlan.brief, guests: 1 } }} toast={toastMock} />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/Headcount Alert: Capacity Exceeded/i)).toBeInTheDocument()
    })

    // Change RSVP status
    const select = screen.getByLabelText(/RSVP status for Rohan Sharma/i)
    fireEvent.change(select, { target: { value: 'declined' } })

    // Remove guest
    const removeBtn = screen.getByRole('button', { name: /remove guest rohan sharma/i })
    fireEvent.click(removeBtn)
    await waitFor(() => {
      expect(api.plans.deleteGuest).toHaveBeenCalledWith(mockPlan.id, 'g1')
      expect(toastMock).toHaveBeenCalledWith('Guest removed')
    })
  })

  it('filters guests by search query and renders empty table states', async () => {
    vi.mocked(api.plans.listGuests).mockResolvedValueOnce({ guests: [], total: 0, limit: 100, offset: 0 })
    vi.mocked(api.plans.getGuestSummary).mockResolvedValueOnce({ summary: null as unknown as GuestSummary })

    const { rerender } = render(<GuestsTab plan={mockPlan} toast={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('No guests added yet')).toBeInTheDocument()
    })

    // Search query with no matches
    vi.mocked(api.plans.listGuests).mockResolvedValueOnce({ guests: initialGuests, total: 2, limit: 100, offset: 0 })
    rerender(<GuestsTab plan={mockPlan} toast={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Rohan Sharma')).toBeInTheDocument()
    })

    const searchInput = screen.getByLabelText('Search guests')
    fireEvent.change(searchInput, { target: { value: 'Nonexistent person' } })
    expect(screen.getByText('No guests match your filters')).toBeInTheDocument()
  })
})
