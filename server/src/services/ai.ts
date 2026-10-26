import type {
  Brief,
  BudgetItem,
  BudgetRebalanceProposal,
  ChatMessage,
  IdeaGroup,
  Moodboard,
  Plan,
} from '@soiree/shared'
import { logger } from '../utils/logger.js'
import { generateLocalPlan, generateOfflineMoodboard, localAnswer, localIdeas } from './generator.js'
import { callGemini, getApiKey, getModel } from './ai/geminiClient.js'
import {
  SYSTEM_PROMPT,
  briefLine,
  buildChatPrompt,
  buildMoodboardPrompt,
  buildPlanPrompt,
  buildRebalancePrompt,
  parseJsonClean,
} from './ai/prompts.js'
import { generateOfflineBudgetRebalance } from './rebalancer.js'
import {
  applyRebalanceConstraints,
  parseAndBuildPlan,
  parseRebalanceResponse,
  validateAndMapMoodboard,
} from './ai/aiParsers.js'

/**
 * Generate a complete celebration plan via Gemini AI, with automatic offline fallback.
 */
export async function generatePlan(brief: Brief): Promise<Plan> {
  if (!getApiKey()) {
    return generateLocalPlan(brief)
  }

  try {
    const raw = await callGemini(buildPlanPrompt(brief), true, SYSTEM_PROMPT)
    return parseAndBuildPlan(raw, brief)
  } catch (err) {
    logger.warn('Gemini AI plan call failed, falling back to offline engine', { error: String(err) })
    return generateLocalPlan(brief)
  }
}

/**
 * Generate celebration theme and activity ideas using Gemini AI or catalog heuristics.
 */
export async function generateIdeas(brief: Brief, extra = ''): Promise<{ ideas: IdeaGroup[]; ai: boolean }> {
  if (getApiKey()) {
    try {
      const prompt =
        `Give me a fresh set of personalised ideas.\n${briefLine(brief)}\n${extra ? 'Extra direction: ' + extra + '\n' : ''}` +
        'Return ONLY JSON: [{"title": string, "items": string[]}] with 4-5 groups of 4-5 specific ideas each.'
      const raw = await callGemini(prompt, true, SYSTEM_PROMPT)
      const arr = parseJsonClean<IdeaGroup[]>(raw)
      if (Array.isArray(arr) && arr.length > 0) {
        return { ideas: arr.map((g) => ({ title: String(g.title), items: (g.items ?? []).map(String) })), ai: true }
      }
    } catch (err) {
      logger.warn('Gemini AI idea generation failed, falling back to local catalog', { error: String(err) })
    }
  }
  return { ideas: localIdeas(brief), ai: false }
}

/**
 * Answer event planning questions using conversational AI context.
 */
export async function askAssistant(
  plan: Plan,
  history: ChatMessage[],
  question: string,
): Promise<{ text: string; ai: boolean }> {
  if (getApiKey()) {
    try {
      const prompt = buildChatPrompt(plan, history, question)
      const text = await callGemini(prompt, false, SYSTEM_PROMPT)
      return { text: text.trim(), ai: true }
    } catch (err) {
      logger.warn('Gemini AI chat assistant failed, falling back to local responder', { error: String(err) })
    }
  }
  return { text: localAnswer(plan, question), ai: false }
}

/**
 * Generate an aesthetic event moodboard and colour palette using AI or offline presets.
 */
export async function generateMoodboard(
  brief: Brief,
  extra?: string,
): Promise<{ moodboard: Moodboard; generatedBy: 'gemini' | 'offline' }> {
  const offline = generateOfflineMoodboard(brief, extra)
  if (!getApiKey()) {
    return { moodboard: offline, generatedBy: 'offline' }
  }

  try {
    const raw = await callGemini(buildMoodboardPrompt(brief, extra), true, SYSTEM_PROMPT)
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const validated = validateAndMapMoodboard(parsed, offline)
    if (!validated) {
      logger.warn('AI Moodboard failed strict validation, using offline preset')
      return { moodboard: offline, generatedBy: 'offline' }
    }
    return { moodboard: validated, generatedBy: 'gemini' }
  } catch (err) {
    logger.warn('Gemini moodboard call failed, falling back to offline', { error: String(err) })
    return { moodboard: offline, generatedBy: 'offline' }
  }
}

/**
 * Rebalance budget categories via AI with deterministic fallback.
 */
async function fetchGeminiRebalance(prompt: string): Promise<string | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${getModel()}:generateContent?key=${getApiKey()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    },
  )
  if (!res.ok) return null
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null
}

export async function rebalanceBudget(
  brief: Brief,
  budget: BudgetItem[],
): Promise<{ proposal: BudgetRebalanceProposal; ai: boolean }> {
  const offline = generateOfflineBudgetRebalance(brief, budget)
  if (!getApiKey()) return { proposal: offline, ai: false }

  try {
    const text = await fetchGeminiRebalance(buildRebalancePrompt(brief, budget))
    if (!text) return { proposal: offline, ai: false }

    const parsed = parseRebalanceResponse(text)
    if (!parsed) return { proposal: offline, ai: false }

    const constrained = applyRebalanceConstraints(budget, parsed.changesMap, brief.budget, brief.currency)
    if (!constrained) return { proposal: offline, ai: false }

    if (parsed.summary) constrained.summary = parsed.summary
    return { proposal: constrained, ai: true }
  } catch (err) {
    logger.warn('AI rebalanceBudget failed, falling back to offline', { error: String(err) })
    return { proposal: offline, ai: false }
  }
}
