import type { Brief, ChatMessage, IdeaGroup, Plan } from '@soiree/shared'
import {
  buildBudget,
  buildTimeline,
  buildVendors,
  generateLocalPlan,
  localAnswer,
  localIdeas,
  money,
  normalizePercents,
  uid,
  weeksUntil,
} from './generator.js'

function getApiKey(): string {
  return process.env.GEMINI_API_KEY?.trim() || ''
}

function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash'
}

async function callGemini(prompt: string, json: boolean, system?: string): Promise<string> {
  const key = getApiKey()
  if (!key) throw new Error('No Gemini API key')
  const model = getModel()

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          ...(json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini HTTP error ${res.status}: ${res.statusText}`)
  const data = (await res.json()) as any
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('')
  if (!text) throw new Error('Empty response from Gemini')
  return text
}

const SYSTEM =
  'You are Soirée, an expert event planner for weddings, birthdays and community events, with deep knowledge of Indian and global celebrations. ' +
  'Be practical, warm and specific. Keep budgets realistic for the stated city and guest count.'

function briefLine(b: Brief): string {
  return (
    `Event type: ${b.type}. Title: ${b.title || 'untitled'}. Date: ${b.date} (${Math.round(weeksUntil(b.date))} weeks away). ` +
    `Guests: ${b.guests}. Total budget: ${money(b.budget, b.currency)}. City: ${b.city || 'unspecified'}. ` +
    `Vibe: ${b.vibe || 'unspecified'}. Notes: ${b.notes || 'none'}.`
  )
}

interface AiPlanJson {
  summary?: string
  budget?: Array<{ category: string; percent: number; note?: string }>
  timeline?: Array<{ label: string; detail?: string; weeksBefore: number }>
  vendors?: Array<{ category: string; percent: number; tips?: string }>
  ideas?: Array<{ title: string; items: string[] }>
}

function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  return JSON.parse(cleaned) as T
}

export async function generatePlan(brief: Brief): Promise<Plan> {
  if (!getApiKey()) {
    return generateLocalPlan(brief)
  }

  const prompt =
    `Create a complete event plan.\n${briefLine(brief)}\n\n` +
    `Return ONLY JSON with this shape:\n` +
    `{"summary": string (2-3 sentences),\n"budget": [{"category": string, "percent": number, "note": string}] (6-9 rows, percents sum to 100, include a Contingency row),\n` +
    `"timeline": [{"label": string, "detail": string, "weeksBefore": number}] (8-14 milestones, weeksBefore <= ${Math.max(1, Math.round(weeksUntil(brief.date)))}, last one is 0),\n` +
    `"vendors": [{"category": string, "percent": number, "tips": string}] (6-10 rows; percent of total budget),\n` +
    `"ideas": [{"title": string, "items": string[]}] (4-5 groups of 4-5 personalised ideas: theme & look, menu, entertainment, guest experience, etc.)}`

  try {
    const raw = await callGemini(prompt, true, SYSTEM)
    const j = parseJson<AiPlanJson>(raw)
    if (!j.budget?.length || !j.timeline?.length || !j.vendors?.length || !j.ideas?.length) {
      throw new Error('Incomplete structure in Gemini response')
    }

    const budget = buildBudget(
      brief,
      normalizePercents(j.budget.map((b) => ({ category: String(b.category), percent: Number(b.percent) || 0, note: b.note ?? '' }))),
    )
    const timeline = buildTimeline(
      brief,
      j.timeline.map((t) => ({ label: String(t.label), detail: t.detail ?? '', weeksBefore: Number(t.weeksBefore) || 0 })),
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
  } catch (err) {
    console.warn('[Gemini AI] Call failed or skipped, using offline smart engine fallback:', err)
    return generateLocalPlan(brief)
  }
}

export async function generateIdeas(brief: Brief, extra = ''): Promise<{ ideas: IdeaGroup[]; ai: boolean }> {
  if (getApiKey()) {
    try {
      const raw = await callGemini(
        `Give me a fresh set of personalised ideas.\n${briefLine(brief)}\n${extra ? 'Extra direction: ' + extra + '\n' : ''}` +
          `Return ONLY JSON: [{"title": string, "items": string[]}] with 4-5 groups of 4-5 specific ideas each.`,
        true,
        SYSTEM,
      )
      const arr = parseJson<IdeaGroup[]>(raw)
      if (Array.isArray(arr) && arr.length) {
        return { ideas: arr.map((g) => ({ title: String(g.title), items: (g.items ?? []).map(String) })), ai: true }
      }
    } catch (err) {
      console.warn('[Gemini AI] Idea generation fallback:', err)
    }
  }
  return { ideas: localIdeas(brief), ai: false }
}

function planContext(plan: Plan): string {
  const b = plan.brief
  const spent = plan.budget.reduce((s, x) => s + x.spent, 0)
  return (
    briefLine(b) +
    `\nSpent so far: ${money(spent, b.currency)}.` +
    `\nBudget: ${plan.budget.map((x) => `${x.category} ${money(x.allocated, b.currency)} (spent ${money(x.spent, b.currency)})`).join('; ')}.` +
    `\nPending milestones: ${plan.timeline.filter((t) => !t.done).map((t) => `${t.label} (${t.weeksBefore}w before)`).join('; ')}.` +
    `\nVendors: ${plan.vendors.map((v) => `${v.category}: ${v.status}`).join('; ')}.`
  )
}

export async function askAssistant(plan: Plan, history: ChatMessage[], question: string): Promise<{ text: string; ai: boolean }> {
  if (getApiKey()) {
    try {
      const convo = history.slice(-6).map((m) => `${m.role === 'user' ? 'User' : 'Soirée'}: ${m.text}`).join('\n')
      const text = await callGemini(
        `Current plan context:\n${planContext(plan)}\n\nConversation so far:\n${convo}\n\nUser: ${question}\n\nAnswer concisely (max ~120 words) with concrete, actionable suggestions.`,
        false,
        SYSTEM,
      )
      return { text: text.trim(), ai: true }
    } catch (err) {
      console.warn('[Gemini AI] Chat fallback:', err)
    }
  }
  return { text: localAnswer(plan, question), ai: false }
}
