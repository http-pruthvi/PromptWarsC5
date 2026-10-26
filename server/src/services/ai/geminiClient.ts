/**
 * Retrieve configured Gemini API key from environment.
 */
export function getApiKey(): string {
  return process.env.GEMINI_API_KEY?.trim() ?? ''
}

/**
 * Retrieve configured Gemini AI model name.
 */
export function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() ?? 'gemini-2.5-flash'
}

interface GeminiPart {
  text?: string
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[]
  }
}

interface GeminiApiResponse {
  candidates?: GeminiCandidate[]
}

/**
 * Perform an HTTP request to the Google Generative Language REST API.
 *
 * @param prompt - User prompt text
 * @param json - Whether to request response in JSON MIME format
 * @param system - Optional system instructions
 * @returns Raw text response from the model
 */
export async function callGemini(prompt: string, json: boolean, system?: string): Promise<string> {
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

  if (!res.ok) {
    throw new Error(`Gemini HTTP error ${res.status}: ${res.statusText}`)
  }

  const data = (await res.json()) as GeminiApiResponse
  const text: string | undefined = data.candidates?.[0]?.content?.parts?.map((p: GeminiPart) => p.text ?? '').join('')

  if (!text) throw new Error('Empty response from Gemini')
  return text
}
