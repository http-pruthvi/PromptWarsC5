import type { Brief, BudgetRebalanceProposal, ChatMessage, DietaryOption, Guest, GuestStatus, GuestSummary, IdeaGroup, MoodboardResponse, Plan, PlanSummary, PublicPlanView, ShareResponse, User, Vendor, VendorStatus } from '@soiree/shared'

export class ApiError extends Error {
  status: number
  details?: any
  constructor(message: string, status: number, details?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    let errMsg = `Request failed (${res.status})`
    let details: any
    try {
      const errJson = await res.json()
      errMsg = errJson.error || errMsg
      details = errJson.details
    } catch {
      // Body not JSON
    }
    throw new ApiError(errMsg, res.status, details)
  }

  return (await res.json()) as T
}

export const api = {
  auth: {
    me: () => request<{ user: User }>('/api/auth/me'),
    login: (email: string, password: string) =>
      request<{ user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string) =>
      request<{ user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    guest: () =>
      request<{ user: User }>('/api/auth/guest', {
        method: 'POST',
      }),
    logout: () =>
      request<{ message: string }>('/api/auth/logout', {
        method: 'POST',
      }),
  },
  plans: {
    list: () => request<{ plans: PlanSummary[] }>('/api/plans'),
    get: (id: string) => request<{ plan: Plan }>(`/api/plans/${id}`),
    create: (brief: Brief) =>
      request<{ plan: Plan }>('/api/plans', {
        method: 'POST',
        body: JSON.stringify(brief),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/api/plans/${id}`, {
        method: 'DELETE',
      }),
    updateMilestone: (planId: string, milestoneId: string, done: boolean) =>
      request<{ id: string; done: boolean }>(`/api/plans/${planId}/milestones/${milestoneId}`, {
        method: 'PATCH',
        body: JSON.stringify({ done }),
      }),
    updateBudget: (planId: string, itemId: string, patch: { allocated?: number; spent?: number }) =>
      request<{ item: Plan['budget'][number] }>(`/api/plans/${planId}/budget/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    addVendor: (planId: string, vendor: { category: string; name?: string; status?: VendorStatus; estimate?: number; tips?: string }) =>
      request<{ vendor: Vendor }>(`/api/plans/${planId}/vendors`, {
        method: 'POST',
        body: JSON.stringify(vendor),
      }),
    updateVendor: (planId: string, vendorId: string, patch: Partial<Vendor>) =>
      request<{ vendor: Vendor }>(`/api/plans/${planId}/vendors/${vendorId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    deleteVendor: (planId: string, vendorId: string) =>
      request<{ message: string }>(`/api/plans/${planId}/vendors/${vendorId}`, {
        method: 'DELETE',
      }),
    regenerateIdeas: (planId: string, extra = '') =>
      request<{ ideas: IdeaGroup[]; ai: boolean }>(`/api/plans/${planId}/ideas/regenerate`, {
        method: 'POST',
        body: JSON.stringify({ extra }),
      }),
    getChat: (planId: string) =>
      request<{ messages: ChatMessage[] }>(`/api/plans/${planId}/chat`),
    sendChat: (planId: string, message: string) =>
      request<{ userMessage: ChatMessage; reply: ChatMessage; ai: boolean }>(`/api/plans/${planId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
    getIcsUrl: (planId: string) => `/api/plans/${planId}/export.ics`,
    getMoodboard: (planId: string) =>
      request<MoodboardResponse>(`/api/plans/${planId}/moodboard`),
    generateMoodboard: (planId: string, extra?: string) =>
      request<MoodboardResponse>(`/api/plans/${planId}/moodboard`, {
        method: 'POST',
        body: JSON.stringify({ extra }),
      }),
    getShare: (planId: string) =>
      request<ShareResponse>(`/api/plans/${planId}/share`),
    enableShare: (planId: string) =>
      request<ShareResponse>(`/api/plans/${planId}/share`, {
        method: 'POST',
      }),
    revokeShare: (planId: string) =>
      request<{ message: string; shareEnabled: boolean }>(`/api/plans/${planId}/share`, {
        method: 'DELETE',
      }),
    listGuests: (planId: string) =>
      request<{ guests: Guest[] }>(`/api/plans/${planId}/guests`),
    addGuest: (planId: string, guest: { name: string; party?: number; status?: GuestStatus; dietary?: DietaryOption; notes?: string }) =>
      request<{ guest: Guest }>(`/api/plans/${planId}/guests`, {
        method: 'POST',
        body: JSON.stringify(guest),
      }),
    updateGuest: (planId: string, guestId: string, patch: Partial<Guest>) =>
      request<{ guest: Guest }>(`/api/plans/${planId}/guests/${guestId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    deleteGuest: (planId: string, guestId: string) =>
      request<{ message: string }>(`/api/plans/${planId}/guests/${guestId}`, {
        method: 'DELETE',
      }),
    importGuests: (planId: string, text: string) =>
      request<{ count: number; guests: Guest[] }>(`/api/plans/${planId}/guests/import`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
    getGuestSummary: (planId: string) =>
      request<{ summary: GuestSummary }>(`/api/plans/${planId}/guests/summary`),
    rebalanceBudget: (planId: string) =>
      request<{ proposal: BudgetRebalanceProposal; ai: boolean }>(`/api/plans/${planId}/budget/rebalance`, {
        method: 'POST',
      }),
    applyRebalance: (planId: string, changes: Array<{ itemId: string; to: number }>) =>
      request<{ budget: Plan['budget'] }>(`/api/plans/${planId}/budget/apply`, {
        method: 'POST',
        body: JSON.stringify({ changes }),
      }),
  },
  public: {
    getPlan: (token: string) =>
      request<{ plan: PublicPlanView }>(`/api/public/plans/${token}`),
  },
}
