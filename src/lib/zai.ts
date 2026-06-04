import ZAI from 'z-ai-web-dev-sdk'

/**
 * Create a ZAI SDK instance or use native fetch through a proxy.
 *
 * Resolution order:
 * 1. If ZAI_PROXY_URL is set → use native fetch to proxy (for Vercel)
 * 2. If internal API is reachable → use ZAI SDK directly (for local dev)
 * 3. Fall back to template generation (no AI available)
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
 * Create a ZAI client — either using the SDK directly or via proxy.
 */
export async function createZAI(): Promise<ZAIClient> {
  const proxyUrl = process.env.ZAI_PROXY_URL

  // If a proxy URL is configured (for Vercel), use native fetch through proxy
  if (proxyUrl) {
    return createProxyClient(proxyUrl)
  }

  // Try to use the SDK directly (works when internal-api.z.ai is reachable)
  const config = {
    baseUrl: process.env.ZAI_BASE_URL || DEFAULT_BASE_URL,
    apiKey: process.env.ZAI_API_KEY || DEFAULT_API_KEY,
    token: process.env.ZAI_TOKEN || DEFAULT_TOKEN,
    userId: process.env.ZAI_USER_ID || DEFAULT_USER_ID,
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new (ZAI as any)(config) as ZAIClient
  } catch {
    // Last resort: try file-based config
    try {
      return await ZAI.create() as ZAIClient
    } catch {
      throw new Error('ZAI SDK no configurado. No se pudo crear la instancia de IA.')
    }
  }
}

/**
 * Create a proxy-based client that uses native fetch.
 * Used when the app runs on Vercel (can't reach internal-api.z.ai directly).
 */
function createProxyClient(proxyUrl: string): ZAIClient {
  const token = process.env.ZAI_TOKEN || DEFAULT_TOKEN
  const userId = process.env.ZAI_USER_ID || DEFAULT_USER_ID

  return {
    chat: {
      completions: {
        create: async (body) => {
          const response = await fetch(`${proxyUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.ZAI_API_KEY || DEFAULT_API_KEY}`,
              'X-Z-AI-From': 'Z',
              'X-Token': token,
              'X-User-Id': userId,
            },
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
