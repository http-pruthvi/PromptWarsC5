export type EventType = 'wedding' | 'birthday' | 'community'
export type Currency = 'INR' | 'USD' | 'EUR'
export type VendorStatus = 'todo' | 'contacted' | 'booked'

export interface Brief {
  type: EventType
  title: string
  date: string // yyyy-mm-dd
  guests: number
  budget: number
  currency: Currency
  city: string
  vibe: string
  notes: string
}

export interface BudgetItem {
  id: string
  category: string
  allocated: number
  spent: number
  note: string
}

export interface Milestone {
  id: string
  label: string
  detail: string
  weeksBefore: number
  done: boolean
}

export interface Vendor {
  id: string
  category: string
  name: string
  status: VendorStatus
  estimate: number
  tips: string
}

export interface IdeaGroup {
  title: string
  items: string[]
}

export interface Plan {
  id: string
  createdAt: number
  brief: Brief
  summary: string
  budget: BudgetItem[]
  timeline: Milestone[]
  vendors: Vendor[]
  ideas: IdeaGroup[]
  generatedBy: 'gemini' | 'local'
}

export interface PlanSummary {
  id: string
  createdAt: number
  type: EventType
  title: string
  date: string
  guests: number
  budget: number
  currency: Currency
  city: string
  summary: string
  generatedBy: 'gemini' | 'local'
}

export interface ChatMessage {
  id?: string
  role: 'user' | 'assistant'
  text: string
  createdAt?: number
}

export interface User {
  id: string
  email: string | null
  isGuest: boolean
  createdAt: number
}

export interface AuthResponse {
  user: User
}

export interface PaletteColor {
  name: string
  hex: string
  role: string
}

export interface MoodboardTypography {
  heading: string
  body: string
  vibe: string
}

export interface Moodboard {
  palette: PaletteColor[]
  typography: MoodboardTypography
  motifs: string[]
  decor: string[]
  outfitNotes: string[]
  playlistVibes: string[]
}

export interface MoodboardResponse {
  moodboard: Moodboard
  generatedBy: 'gemini' | 'offline'
  createdAt: string
}
