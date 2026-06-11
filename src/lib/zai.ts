import ZAI from 'z-ai-web-dev-sdk'

/**
 * Sinap AI Client — Multi-provider support.
 *
 * Resolution order:
 * 1. If OPENAI_API_KEY is set → use OpenAI-compatible API (Groq, OpenAI, Together, etc.)
 * 2. Try ZAI SDK directly (ZAI.create()) — works in Z.ai infra and local dev
 * 3. Try SDK with explicit config (baseUrl + token)
 *
 * ─── RECOMENDACIÓN PARA SINAP ───
 * Usar Groq (gratis, rápido, excelente español):
 *   OPENAI_API_KEY=gsk_tu_key
 *   OPENAI_BASE_URL=https://api.groq.com/openai/v1
 *   OPENAI_MODEL=llama-3.3-70b-versatile
 *
 * El modelo llama-3.3-70b-versatile en Groq:
 *   - Gratis (1,000 requests/día, 100K tokens/día)
 *   - Súper rápido (~400 tokens/segundo)
 *   - Excelente español
 *   - Perfecto para respuestas de recepción dental
 */

// Platform credentials — Z-AI platform JWT (no expiration, internal only)
const DEFAULT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiM2I0OGUwZjAtN2I2NC00MzY3LTk3ZDYtNGMxYzQ1NWM2MzA4IiwiY2hhdF9pZCI6ImNoYXQtN2JlMGRhZDUtMWE4Ny00ZjFlLThhZTItMzE2ZWRmZmZkNjJiIiwicGxhdGZvcm0iOiJ6YWkifQ.a_1wytk_upNlP_i9DHsGUkqlLFQM_qm-c2bX7-3iDGI'
const DEFAULT_USER_ID = '3b48e0f0-7b64-4367-97d6-4c1c455c6308'
const DEFAULT_BASE_URL = 'https://internal-api.z.ai/v1'
const DEFAULT_API_KEY = 'Z.ai'

export interface ZAIClient {
  chat: {
    completions: {
      create: (body: {
        messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
        temperature?: number
        max_tokens?: number
        thinking?: { type: 'enabled' | 'disabled' }
        [key: string]: unknown
      }) => Promise<{ choices: Array<{ message: { content: string } }> }>
    }
  }
}

/**
 * Create an OpenAI-compatible client using the openai SDK.
 * Works with: Groq, OpenAI, Together AI, any OpenAI-compatible API.
 */
async function createOpenAICompatibleClient(): Promise<ZAIClient | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    const OpenAI = (await import('openai')).default
    const baseURL = process.env.OPENAI_BASE_URL || undefined // undefined = OpenAI default
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

    const openai = new OpenAI({ apiKey, baseURL })

    const provider = baseURL?.includes('groq') ? 'Groq'
      : baseURL?.includes('together') ? 'Together'
      : baseURL?.includes('openrouter') ? 'OpenRouter'
      : 'OpenAI'

    console.log(`[Sinap AI] Using ${provider} provider (model: ${model})`)

    return {
      chat: {
        completions: {
          create: async (body) => {
            const completion = await openai.chat.completions.create({
              model,
              messages: body.messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
              temperature: body.temperature ?? 0.7,
              max_tokens: body.max_tokens ?? 500,
            })

            // Normalize response to match our interface
            return {
              choices: (completion.choices || []).map(choice => ({
                message: {
                  content: choice.message?.content || '',
                },
              })),
            }
          },
        },
      },
    }
  } catch (error) {
    console.warn('[Sinap AI] OpenAI-compatible client failed:', error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Create a ZAI client — try OpenAI-compatible first, then ZAI SDK.
 */
export async function createZAI(): Promise<ZAIClient> {
  // 1. OpenAI-compatible API (Groq, OpenAI, Together, etc.)
  // This is the PRIMARY provider for Vercel deployments.
  const openaiClient = await createOpenAICompatibleClient()
  if (openaiClient) return openaiClient

  // 2. Try ZAI SDK directly — works in Z.ai infrastructure and local dev
  try {
    const sdk = await ZAI.create()
    if (sdk?.chat?.completions?.create) {
      console.log('[Sinap AI] Using ZAI SDK directly')
      return sdk as ZAIClient
    }
  } catch (sdkError) {
    console.warn('[Sinap AI] ZAI.create() failed:', sdkError instanceof Error ? sdkError.message : sdkError)
  }

  // 3. Try SDK with explicit config
  try {
    const config = {
      baseUrl: process.env.ZAI_BASE_URL || DEFAULT_BASE_URL,
      apiKey: process.env.ZAI_API_KEY || DEFAULT_API_KEY,
      token: process.env.ZAI_TOKEN || DEFAULT_TOKEN,
      userId: process.env.ZAI_USER_ID || DEFAULT_USER_ID,
    }
    const sdk = new (ZAI as unknown as { new(cfg: unknown): unknown })(config) as ZAIClient
    console.log('[Sinap AI] Using ZAI SDK with explicit config')
    return sdk
  } catch (configError) {
    console.warn('[Sinap AI] ZAI SDK explicit config failed:', configError instanceof Error ? configError.message : configError)
  }

  throw new Error(
    'Sinap AI: No hay proveedor de IA disponible. ' +
    'Configura OPENAI_API_KEY en Vercel para usar Groq (gratis) u OpenAI. ' +
    'Instrucciones: https://console.groq.com → crear API key → agregar a Vercel.'
  )
}
