import ZAI from 'z-ai-web-dev-sdk'

/**
 * Create a ZAI SDK instance or use native fetch through a proxy.
 *
 * Resolution order:
 * 1. If ZAI_PROXY_URL is set → use native fetch to proxy (for Vercel)
 * 2. If running on Vercel (NEXT_PUBLIC_APP_URL set) → use self-hosted /api/ai/proxy
 * 3. If internal API is reachable → use ZAI SDK directly (for local dev)
 * 4. Fall back to template generation (no AI available)
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
  // 1. Explicit proxy URL configured
  const proxyUrl = process.env.ZAI_PROXY_URL
  if (proxyUrl) {
    console.log('[ZAI] Using explicit proxy:', proxyUrl)
    return createProxyClient(proxyUrl)
  }

  // 2. Auto-detect Vercel environment — use self-hosted proxy route
  // On Vercel, the ZAI SDK can't reach internal-api.z.ai directly,
  // so we route through our own /api/ai/proxy endpoint which CAN reach it.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  if (appUrl) {
    const selfProxyUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`
    console.log('[ZAI] Vercel detected — using self-hosted proxy:', selfProxyUrl)
    return createProxyClient(selfProxyUrl)
  }

  // 3. Try to use the SDK directly (works when internal-api.z.ai is reachable, e.g. local dev)
  const config = {
    baseUrl: process.env.ZAI_BASE_URL || DEFAULT_BASE_URL,
    apiKey: process.env.ZAI_API_KEY || DEFAULT_API_KEY,
    token: process.env.ZAI_TOKEN || DEFAULT_TOKEN,
    userId: process.env.ZAI_USER_ID || DEFAULT_USER_ID,
  }

  try {
    return new (ZAI as unknown as { new(cfg: unknown): unknown })(config) as ZAIClient
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
 * Routes through /api/ai/proxy which can reach external APIs.
 */
function createProxyClient(proxyUrl: string): ZAIClient {
  return {
    chat: {
      completions: {
        create: async (body) => {
          // Use our self-hosted proxy endpoint at /api/ai/proxy
          const response = await fetch(`${proxyUrl}/api/ai/proxy`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
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
