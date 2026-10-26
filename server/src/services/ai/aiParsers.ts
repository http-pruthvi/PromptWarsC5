import type { Brief, BudgetItem, BudgetRebalanceProposal, IdeaGroup, Moodboard, Plan } from '@soiree/shared'
import { formatCurrency } from '@soiree/shared'
import { buildBudget, buildTimeline, buildVendors, generateLocalPlan, normalizePercents, uid } from '../generator.js'
import { parseJsonClean } from './prompts.js'

interface AiPlanJson {
  summary?: string
  budget?: Array<{ category: string; percent: number; note?: string }>
  timeline?: Array<{ label: string; detail?: string; weeksBefore: number }>
  vendors?: Array<{ category: string; percent: number; tips?: string }>
  ideas?: Array<{ title: string; items: string[] }>
}

/**
 * Safely parse raw JSON from Gemini into a validated and normalized Plan object.
 */
export function parseAndBuildPlan(raw: string, brief: Brief): Plan {
  const j = parseJsonClean<AiPlanJson>(raw)
  if (!j.budget?.length || !j.timeline?.length || !j.vendors?.length || !j.ideas?.length) {
    throw new Error('Incomplete structure in Gemini response')
  }

  const budget = buildBudget(
    brief,
    normalizePercents(
      j.budget.map((b) => ({ category: String(b.category), percent: Number(b.percent) || 0, note: b.note ?? '' })),
    ),
  )
  const timeline = buildTimeline(
    brief,
    j.timeline.map((t) => ({
      label: String(t.label),
      detail: t.detail ?? '',
      weeksBefore: Number(t.weeksBefore) || 0,
    })),
  )
  const vendors = buildVendors(
    brief,
    j.vendors.map((v) => ({ category: String(v.category), percent: Number(v.percent) || 1, tips: v.tips ?? '' })),
  )
  const ideas: IdeaGroup[] = j.ideas.map((g) => ({ title: String(g.title), items: (g.items ?? []).map(String) }))

  return {
    id: uid(),
    createdAt: Date.now(),
    brief,
    summary: j.summary || generateLocalPlan(brief).summary,
    budget,
    timeline,
    vendors,
    ideas,
    generatedBy: 'gemini',
  }
}

function isValidPalette(palette: unknown): palette is Array<{ name: string; role: string; hex: string }> {
  const hexRegex = /^#[0-9a-f]{6}$/i
  if (!Array.isArray(palette) || palette.length !== 5) return false
  return palette.every(
    (c) =>
      typeof c?.name === 'string' && typeof c?.role === 'string' && typeof c?.hex === 'string' && hexRegex.test(c.hex),
  )
}

function isValidTypography(t: unknown): t is { heading: string; body: string; vibe: string } {
  if (!t || typeof t !== 'object') return false
  const rec = t as Record<string, unknown>
  return typeof rec.heading === 'string' && typeof rec.body === 'string' && typeof rec.vibe === 'string'
}

/**
 * Validate and map AI moodboard output against strict color format and role schemas.
 */
export function validateAndMapMoodboard(parsed: Record<string, unknown>, offline: Moodboard): Moodboard | null {
  const palette = parsed['palette']
  const typography = parsed['typography']

  if (!isValidPalette(palette) || !isValidTypography(typography)) {
    return null
  }

  return {
    palette: palette.map((c) => ({
      name: c.name.trim(),
      hex: c.hex.trim().toLowerCase(),
      role: c.role.trim(),
    })),
    typography: {
      heading: typography.heading.trim(),
      body: typography.body.trim(),
      vibe: typography.vibe.trim(),
    },
    motifs: (Array.isArray(parsed['motifs']) ? parsed['motifs'] : offline.motifs).map((m) => String(m).trim()),
    decor: (Array.isArray(parsed['decor']) ? parsed['decor'] : offline.decor).map((d) => String(d).trim()),
    outfitNotes: (Array.isArray(parsed['outfitNotes']) ? parsed['outfitNotes'] : offline.outfitNotes).map((o) =>
      String(o).trim(),
    ),
    playlistVibes: (Array.isArray(parsed['playlistVibes']) ? parsed['playlistVibes'] : offline.playlistVibes).map((p) =>
      String(p).trim(),
    ),
  }
}

/**
 * Parses raw JSON text into a map of requested budget allocations and optional summary.
 */
export function parseRebalanceResponse(
  text: string,
): { changesMap: Map<string, { to: number; reason: string }>; summary?: string } | null {
  try {
    const parsed = JSON.parse(text) as {
      changes?: Array<{ category?: unknown; to?: unknown; reason?: unknown }>
      summary?: string
    }
    if (!parsed || !Array.isArray(parsed.changes)) return null

    const changesMap = new Map<string, { to: number; reason: string }>()
    for (const c of parsed.changes) {
      if (typeof c.category === 'string' && typeof c.to === 'number') {
        changesMap.set(c.category.toLowerCase().trim(), {
          to: Math.round(c.to),
          reason: typeof c.reason === 'string' ? c.reason.trim() : '',
        })
      }
    }
    return {
      changesMap,
      ...(typeof parsed.summary === 'string' && parsed.summary.trim() ? { summary: parsed.summary.trim() } : {}),
    }
  } catch {
    return null
  }
}

/**
 * Applies invariant constraints to AI-suggested budget rebalance:
 * 1. Contingency untouched
 * 2. No category below its spent amount
 * 3. Total sum strictly conserved
 */
export function applyRebalanceConstraints(
  budget: BudgetItem[],
  changesMap: Map<string, { to: number; reason: string }>,
  totalBudget: number,
  cur: Brief['currency'],
): BudgetRebalanceProposal | null {
  const isContingency = (cat: string) => cat.toLowerCase().includes('contingency')
  const clampedItems = budget.map((b) => {
    const contingency = isContingency(b.category)
    const suggestion = changesMap.get(b.category.toLowerCase().trim())
    let to = suggestion ? suggestion.to : b.allocated
    let reason = suggestion?.reason || ''

    if (contingency) {
      to = b.allocated
      reason = 'Contingency reserve remains untouched as a dedicated emergency cushion.'
    }
    if (to < b.spent) {
      to = b.spent
    }

    return { itemId: b.id, category: b.category, from: b.allocated, spent: b.spent, contingency, to, reason }
  })

  const currentSum = clampedItems.reduce((s, i) => s + i.to, 0)
  const diff = totalBudget - currentSum
  if (diff !== 0) {
    const candidate = clampedItems
      .filter((i) => !i.contingency && i.to + diff >= i.spent)
      .sort((a, b) => b.to - b.spent - (a.to - a.spent))[0]
    if (candidate) {
      candidate.to += diff
    } else {
      return null
    }
  }

  for (const item of clampedItems) {
    if (!item.reason) {
      if (item.to > item.from) {
        item.reason = `Increased allocation by ${formatCurrency(item.to - item.from, cur)} to cover verified booking expenses.`
      } else if (item.to < item.from) {
        item.reason = `Reallocated ${formatCurrency(item.from - item.to, cur)} from uncommitted headroom.`
      } else {
        item.reason = `Preserved target allocation of ${formatCurrency(item.to, cur)}.`
      }
    }
  }

  return {
    changes: clampedItems.map((i) => ({
      itemId: i.itemId,
      category: i.category,
      from: i.from,
      to: i.to,
      reason: i.reason,
    })),
    summary: 'Rebalanced budget across categories to protect contingency and absorb verified booking expenses.',
  }
}
