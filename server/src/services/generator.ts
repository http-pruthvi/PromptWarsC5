import type { Brief, BudgetItem, Currency, IdeaGroup, Milestone, Moodboard, Plan, Vendor } from '@soiree/shared'
import { daysUntil, formatCurrency } from '@soiree/shared'
import { getMoodboardPreset } from './catalog/moodboardTemplates.js'
import {
  BUDGET_TEMPLATES,
  POOLS,
  TIMELINE_TEMPLATES,
  VENDOR_TEMPLATES,
  VIBES,
  type BudgetTpl,
  type MilestoneTpl,
  type VendorTpl,
} from './catalog/templates.js'

export { generateOfflineBudgetRebalance } from './rebalancer.js'

/**
 * Generate a random alphanumeric unique identifier.
 */
export const uid = (): string => Math.random().toString(36).slice(2, 10)

/**
 * Format currency amount using shared money utility.
 */
export function money(amount: number, currency: Currency = 'INR'): string {
  return formatCurrency(amount, currency)
}

/**
 * Calculate weeks remaining until a given date string.
 */
export function weeksUntil(dateStr: string, from: Date = new Date()): number {
  const days = daysUntil(dateStr, from.getTime())
  return Math.max(0, Math.round((days / 7) * 10) / 10)
}

function pickRandom<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = copy[i]
    const swapTarget = copy[j]
    if (temp !== undefined && swapTarget !== undefined) {
      copy[i] = swapTarget
      copy[j] = temp
    }
  }
  return copy.slice(0, n)
}

function matchVibe(vibe: string) {
  const v = (vibe || '').toLowerCase()
  const match = VIBES.find((x) => x.keys.some((k) => v.includes(k)))
  if (match) return match
  const first = VIBES[0]
  if (first) return first
  return {
    keys: ['classic'],
    theme: 'Royal Heritage',
    palette: 'Deep maroon, antique gold and cream',
    decor: 'Brass diyas, marigold canopies and embroidered drapes',
  }
}

/**
 * Normalise relative percentages to sum to 100%.
 */
export function normalizePercents<T extends { percent: number }>(rows: T[]): T[] {
  const total = rows.reduce((s, r) => s + Math.max(0, r.percent), 0) || 1
  return rows.map((r) => ({ ...r, percent: (Math.max(0, r.percent) / total) * 100 }))
}

/**
 * Construct structured budget items from template percentages.
 */
export function buildBudget(brief: Brief, tpl: BudgetTpl[]): BudgetItem[] {
  const rows = normalizePercents(tpl)
  let used = 0
  return rows.map((r, i) => {
    const allocated =
      i === rows.length - 1 ? brief.budget - used : Math.round((brief.budget * r.percent) / 100 / 100) * 100
    used += allocated
    return { id: uid(), category: r.category, allocated: Math.max(0, allocated), spent: 0, note: r.note }
  })
}

/**
 * Construct chronological milestones from template data scaled to available timeline runway.
 */
export function buildTimeline(brief: Brief, tpl: MilestoneTpl[]): Milestone[] {
  const available = Math.max(1, weeksUntil(brief.date))
  const maxWeeks = Math.max(...tpl.map((t) => t.weeksBefore), 1)
  const scale = available < maxWeeks ? available / maxWeeks : 1
  return tpl
    .map((t) => ({
      id: uid(),
      label: t.label,
      detail: t.detail,
      weeksBefore: Math.round(t.weeksBefore * scale * 10) / 10,
      done: false,
    }))
    .sort((a, b) => b.weeksBefore - a.weeksBefore)
}

/**
 * Construct vendor categories with initial cost estimates and booking tips.
 */
export function buildVendors(brief: Brief, tpl: VendorTpl[]): Vendor[] {
  const rows = normalizePercents(tpl)
  return rows.map((r) => ({
    id: uid(),
    category: r.category,
    name: '',
    status: 'todo' as const,
    estimate: Math.round((brief.budget * r.percent) / 100 / 500) * 500,
    tips: r.tips,
  }))
}

/**
 * Generate celebration theme and activity idea groups.
 */
export function localIdeas(brief: Brief): IdeaGroup[] {
  const vibe = matchVibe(brief.vibe)
  const head: IdeaGroup = {
    title: 'Theme & look',
    items: [
      `Theme: ${vibe.theme}`,
      `Palette: ${vibe.palette}`,
      `Decor: ${vibe.decor}`,
      brief.guests > 150
        ? 'Zone the venue (lounge, dining, stage) to avoid crowding'
        : 'Keep seating intimate with long communal tables',
    ],
  }
  const pool = POOLS[brief.type] ?? POOLS.wedding
  const groups = Object.entries(pool).map(([title, items]) => ({
    title,
    items: pickRandom(items, 4),
  }))
  return [head, ...groups]
}

/**
 * Generate a complete event plan deterministically using curated catalog heuristics.
 */
export function generateLocalPlan(brief: Brief): Plan {
  const vibe = matchVibe(brief.vibe)
  const weeks = weeksUntil(brief.date)
  const perHead = brief.guests > 0 ? brief.budget / brief.guests : 0
  const label =
    { wedding: 'wedding', birthday: 'birthday celebration', community: 'community event' }[brief.type] ?? 'celebration'
  const where = brief.city ? ` in ${brief.city}` : ''
  const summary =
    `${brief.title || 'Your ' + label} is a ${label}${where} for about ${brief.guests} guests, ${Math.round(weeks)} weeks away. ` +
    `At roughly ${formatCurrency(perHead, brief.currency)} per guest, we suggest a "${vibe.theme}" direction. ` +
    (weeks < 8
      ? 'The timeline is tight, so we compressed the milestones and put venue and catering first.'
      : 'You have a healthy runway; book the big-ticket vendors first.')

  return {
    id: uid(),
    createdAt: Date.now(),
    brief,
    summary,
    budget: buildBudget(brief, BUDGET_TEMPLATES[brief.type] ?? BUDGET_TEMPLATES.wedding),
    timeline: buildTimeline(brief, TIMELINE_TEMPLATES[brief.type] ?? TIMELINE_TEMPLATES.wedding),
    vendors: buildVendors(brief, VENDOR_TEMPLATES[brief.type] ?? VENDOR_TEMPLATES.wedding),
    ideas: localIdeas(brief),
    generatedBy: 'local',
  }
}

/**
 * Generate an offline moodboard matching event style keywords.
 */
export function generateOfflineMoodboard(brief: Brief, extra?: string): Moodboard {
  const text = `${brief.vibe} ${brief.notes} ${brief.title} ${extra ?? ''}`.toLowerCase()
  return getMoodboardPreset(text, brief.type)
}

/**
 * Offline assistant answering common event planning questions.
 */
export function localAnswer(plan: Plan, question: string): string {
  const b = plan.brief
  const s = question.toLowerCase()
  const spent = plan.budget.reduce((t, x) => t + x.spent, 0)

  if (/(over|save|cut|reduce|cheaper|budget)/.test(s)) {
    const big = [...plan.budget].sort((a, c) => c.allocated - a.allocated).slice(0, 2)
    return (
      `You've spent ${formatCurrency(spent, b.currency)} of ${formatCurrency(b.budget, b.currency)}. The biggest levers are ${big.map((x) => x.category).join(' and ')}. ` +
      `Try trimming guest count by 5–10%, choosing a weekday or off-peak slot, and negotiating bundled vendor packages. Keep the contingency row untouched.`
    )
  }

  if (/(when|deadline|timeline|next|todo|to-do)/.test(s)) {
    const next = plan.timeline.filter((t) => !t.done).slice(0, 3)
    return next.length > 0
      ? `Your next steps: ${next.map((t) => `“${t.label}”`).join(', ')}. Tackle them in that order.`
      : 'All milestones are done — enjoy the day!'
  }

  if (/(vendor|book|caterer|photographer|decor)/.test(s)) {
    const todo = plan.vendors.filter((v) => v.status === 'todo').map((v) => v.category)
    return todo.length > 0
      ? `Still to contact: ${todo.join(', ')}. Get at least 3 quotes each and ask for references from similar-sized events.`
      : 'Every vendor is at least contacted. Next, get written contracts with payment schedules.'
  }

  const ideas = localIdeas(b)
  const g = ideas[Math.min(1, ideas.length - 1)]
  if (!g) {
    return 'Your celebration plan is ready for review.'
  }
  return `Here are a few ideas for “${g.title}”: ${g.items.slice(0, 3).join('; ')}.`
}
