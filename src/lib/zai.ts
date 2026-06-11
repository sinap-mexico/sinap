import ZAI from 'z-ai-web-dev-sdk'

/**
 * Create an AI client — supports multiple providers.
 *
 * Resolution order:
 * 1. If OPENAI_API_KEY is set → use OpenAI API (works everywhere including Vercel)
 * 2. Try ZAI SDK directly (ZAI.create()) — works in Z.ai infra and local dev
 * 3. Try SDK with explicit config (baseUrl + token)
 * 4. Fall back to proxy (last resort, likely won't work from Vercel)
 *
 * For Vercel deployments, set OPENAI_API_KEY (and optionally OPENAI_BASE_URL
 * for OpenAI-compatible APIs like Groq, Together, etc.)
 */

// Platform credentials — Z-AI platform JWT (no expiration)
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
 */
async function createOpenAIClient(): Promise<ZAIClient | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    const OpenAI = (await import('openai')).default
    const baseURL = process.env.OPENAI_BASE_URL || undefined // undefined = use OpenAI default
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini' // Cost-effective default

    const openai = new OpenAI({ apiKey, baseURL })

    console.log(`[ZAI] Using OpenAI provider (model: ${model}, baseURL: ${baseURL || 'default'})`)

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

            // Normalize response to match ZAI interface
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
    console.warn('[ZAI] OpenAI client creation failed:', error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Create a ZAI client — try OpenAI first, then ZAI SDK, then proxy.
 */
export async function createZAI(): Promise<ZAIClient> {
  // 1. Try OpenAI API (works from anywhere including Vercel)
  const openaiClient = await createOpenAIClient()
  if (openaiClient) return openaiClient

  // 2. Try ZAI SDK directly — this works in Z.ai infra and local dev
  try {
    const sdk = await ZAI.create()
    if (sdk?.chat?.completions?.create) {
      console.log('[ZAI] Using ZAI SDK directly (ZAI.create())')
      return sdk as ZAIClient
    }
  } catch (sdkError) {
    console.warn('[ZAI] ZAI.create() failed:', sdkError instanceof Error ? sdkError.message : sdkError)
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
    console.log('[ZAI] Using ZAI SDK with explicit config')
    return sdk
  } catch (configError) {
    console.warn('[ZAI] SDK with explicit config failed:', configError instanceof Error ? configError.message : configError)
  }

  // 4. Explicit proxy URL (last resort)
  const proxyUrl = process.env.ZAI_PROXY_URL
  if (proxyUrl) {
    console.log('[ZAI] Using explicit proxy:', proxyUrl)
    return createProxyClient(proxyUrl)
  }

  throw new Error(
    'No AI provider available. Set OPENAI_API_KEY for Vercel deployment, ' +
    'or ensure ZAI SDK is accessible from this environment.'
  )
}

/**
 * Create a proxy-based client that uses native fetch.
 * Fallback for environments where the SDK can't connect directly.
 */
function createProxyClient(proxyUrl: string): ZAIClient {
  return {
    chat: {
      completions: {
        create: async (body) => {
          const response = await fetch(`${proxyUrl}/api/ai/proxy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })

          if (!response.ok) {
            const errorBody = await response.text().catch(() => 'Unknown error')
            throw new Error(`Z-AI proxy error (${response.status}): ${errorBody}`)
          }

          return await response.json()
        },
      },
    },
  }
}
