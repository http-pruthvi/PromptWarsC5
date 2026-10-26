import type { Brief, BudgetItem, ChatMessage, Plan } from '@soiree/shared'
import { formatCurrency } from '@soiree/shared'
import { weeksUntil } from '../generator.js'

export const SYSTEM_PROMPT =
  'You are Soirée, an expert event planner for weddings, birthdays and community events, with deep knowledge of Indian and global celebrations. ' +
  'Be practical, warm and specific. Keep budgets realistic for the stated city and guest count.'

export function briefLine(b: Brief): string {
  return (
    `Event type: ${b.type}. Title: ${b.title || 'untitled'}. Date: ${b.date} (${Math.round(weeksUntil(b.date))} weeks away). ` +
    `Guests: ${b.guests}. Total budget: ${formatCurrency(b.budget, b.currency)}. City: ${b.city || 'unspecified'}. ` +
    `Vibe: ${b.vibe || 'unspecified'}. Notes: ${b.notes || 'none'}.`
  )
}

export function buildPlanPrompt(brief: Brief): string {
  const weeks = Math.max(1, Math.round(weeksUntil(brief.date)))
  return (
    `Create a complete event plan.\n${briefLine(brief)}\n\n` +
    'Return ONLY JSON with this shape:\n' +
    '{"summary": string (2-3 sentences),\n' +
    '"budget": [{"category": string, "percent": number, "note": string}] (6-9 rows, percents sum to 100, include a Contingency row),\n' +
    `"timeline": [{"label": string, "detail": string, "weeksBefore": number}] (8-14 milestones, weeksBefore <= ${weeks}, last one is 0),\n` +
    '"vendors": [{"category": string, "percent": number, "tips": string}] (6-10 rows; percent of total budget),\n' +
    '"ideas": [{"title": string, "items": string[]}] (4-5 groups of 4-5 personalised ideas: theme & look, menu, entertainment, guest experience, etc.)}'
  )
}

export function buildMoodboardPrompt(brief: Brief, extra?: string): string {
  return `
Create an aesthetic event moodboard and color palette for this event:
${briefLine(brief)}
${extra ? `Additional user vision / steering guidance: "${extra}"` : ''}

Respond with a single JSON object containing:
- "palette": exactly 5 items, each having "name" (string), "hex" (valid 6-digit hex string matching /^#[0-9a-f]{6}$/i), and "role" (string describing its purpose like "Primary Metallic Accent", "Neutral Canvas", etc.)
- "typography": { "heading": string (font name), "body": string (font name), "vibe": string (short description) }
- "motifs": array of 4-6 specific visual motifs/patterns (e.g., "Mughal archways", "wildflower garlands")
- "decor": array of 4 specific decor styling points
- "outfitNotes": array of 4 attire suggestions for hosts and guests
- "playlistVibes": array of 4 musical mood styles

CRITICAL: "palette" MUST contain exactly 5 colors, and every "hex" MUST be a 6-digit lowercase/uppercase hex starting with '#' (e.g. "#d4af37").
`
}

export function buildRebalancePrompt(brief: Brief, budget: BudgetItem[]): string {
  const cur = brief.currency
  return `You are an elite event finance consultant for Soirée.
The client is planning a ${brief.type} in ${brief.city} with a total budget of ${brief.budget} ${cur}.
Here is the current budget breakdown with verified spend:
${JSON.stringify(
  budget.map((b) => ({ id: b.id, category: b.category, allocated: b.allocated, spent: b.spent })),
  null,
  2,
)}

Some categories may have exceeded their allocations. Propose a budget redistribution.
CRITICAL RULES:
1. The total of all proposed 'to' amounts across all categories MUST equal exactly ${brief.budget}.
2. For EVERY category, the new allocation 'to' MUST be greater than or equal to what has already been spent ('spent').
3. Any category with 'contingency' in the name MUST remain untouched (its 'to' must equal its current 'allocated').
4. Take funds proportionally from categories that have unspent headroom.

Return JSON in this exact structure:
{
  "changes": [
    { "category": "Category Name", "to": 123456, "reason": "Reason for change" }
  ],
  "summary": "Executive summary of why this rebalancing keeps the celebration on budget."
}`
}

export function buildChatPrompt(plan: Plan, history: ChatMessage[], question: string): string {
  const b = plan.brief
  const spent = plan.budget.reduce((s, x) => s + x.spent, 0)
  const context =
    briefLine(b) +
    `\nSpent so far: ${formatCurrency(spent, b.currency)}.` +
    `\nBudget: ${plan.budget.map((x) => `${x.category} ${formatCurrency(x.allocated, b.currency)} (spent ${formatCurrency(x.spent, b.currency)})`).join('; ')}.` +
    `\nPending milestones: ${plan.timeline
      .filter((t) => !t.done)
      .map((t) => `${t.label} (${t.weeksBefore}w before)`)
      .join('; ')}.` +
    `\nVendors: ${plan.vendors.map((v) => `${v.category}: ${v.status}`).join('; ')}.`

  const convo = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'User' : 'Soirée'}: ${m.text}`)
    .join('\n')

  return `Current plan context:\n${context}\n\nConversation so far:\n${convo}\n\nUser: ${question}\n\nAnswer concisely (max ~120 words) with concrete, actionable suggestions.`
}

export function parseJsonClean<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim()
  return JSON.parse(cleaned) as T
}
