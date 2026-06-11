import ZAI from 'z-ai-web-dev-sdk'

/**
 * Create a ZAI SDK instance — tries SDK directly first, then proxy fallback.
 *
 * Resolution order:
 * 1. Try ZAI SDK directly (ZAI.create()) — works in Z.ai infra and local dev
 * 2. Try SDK with explicit config (baseUrl + token) — works when infra is reachable
 * 3. If ZAI_PROXY_URL is set → use native fetch to proxy (last resort for Vercel)
 *
 * IMPORTANT: We try the SDK directly FIRST because the self-hosted proxy
 * on Vercel can't reach internal-api.z.ai either — so the proxy is pointless.
 * The SDK itself handles the connection correctly from serverless environments.
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
 * Create a ZAI client — try SDK directly first, then proxy fallback.
 */
export async function createZAI(): Promise<ZAIClient> {
  // 1. Try ZAI SDK directly — this works in most environments including serverless
  try {
    const sdk = await ZAI.create()
    // Verify it actually works by checking it has the expected interface
    if (sdk?.chat?.completions?.create) {
      console.log('[ZAI] Using SDK directly (ZAI.create())')
      return sdk as ZAIClient
    }
  } catch (sdkError) {
    console.warn('[ZAI] ZAI.create() failed:', sdkError instanceof Error ? sdkError.message : sdkError)
  }

  // 2. Try SDK with explicit config
  try {
    const config = {
      baseUrl: process.env.ZAI_BASE_URL || DEFAULT_BASE_URL,
      apiKey: process.env.ZAI_API_KEY || DEFAULT_API_KEY,
      token: process.env.ZAI_TOKEN || DEFAULT_TOKEN,
      userId: process.env.ZAI_USER_ID || DEFAULT_USER_ID,
    }
    const sdk = new (ZAI as unknown as { new(cfg: unknown): unknown })(config) as ZAIClient
    console.log('[ZAI] Using SDK with explicit config')
    return sdk
  } catch (configError) {
    console.warn('[ZAI] SDK with explicit config failed:', configError instanceof Error ? configError.message : configError)
  }

  // 3. Explicit proxy URL configured (last resort)
  const proxyUrl = process.env.ZAI_PROXY_URL
  if (proxyUrl) {
    console.log('[ZAI] Using explicit proxy:', proxyUrl)
    return createProxyClient(proxyUrl)
  }

  // 4. Self-hosted proxy on Vercel (last resort — likely won't work either)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  if (appUrl) {
    const selfProxyUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`
    console.log('[ZAI] Trying self-hosted proxy as last resort:', selfProxyUrl)
    return createProxyClient(selfProxyUrl)
  }

  throw new Error('ZAI SDK no configurado. No se pudo crear la instancia de IA por ningún método.')
}

/**
 * Create a proxy-based client that uses native fetch.
 * This is a fallback for environments where the SDK can't connect directly.
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
