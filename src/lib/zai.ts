import ZAI from 'z-ai-web-dev-sdk'
import type OpenAI from 'openai'

/**
 * Sinap AI Client — Multi-provider support with function calling.
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
 */

// Platform credentials — Z-AI platform JWT (no expiration, internal only)
const DEFAULT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiM2I0OGUwZjAtN2I2NC00MzY3LTk3ZDYtNGMxYzQ1NWM2MzA4IiwiY2hhdF9pZCI6ImNoYXQtN2JlMGRhZDUtMWE4Ny00ZjFlLThhZTItMzE2ZWRmZmZkNjJiIiwicGxhdGZvcm0iOiJ6YWkifQ.a_1wytk_upNlP_i9DHsGUkqlLFQM_qm-c2bX7-3iDGI'
const DEFAULT_USER_ID = '3b48e0f0-7b64-4367-97d6-4c1c455c6308'
const DEFAULT_BASE_URL = 'https://internal-api.z.ai/v1'
const DEFAULT_API_KEY = 'Z.ai'

// ─── Types for function calling ──────────────────────────────
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string // JSON string
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string // For tool response messages
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string | null
      tool_calls?: ToolCall[]
    }
    finish_reason: string
  }>
}

export interface ZAIClient {
  chat: {
    completions: {
      create: (body: {
        messages: Array<ChatMessage>
        temperature?: number
        max_tokens?: number
        tools?: ToolDefinition[]
        tool_choice?: string | { type: 'function'; function: { name: string } }
        [key: string]: unknown
      }) => Promise<ChatCompletionResponse>
    }
  }
  // Expose the raw OpenAI client for direct access if needed
  _provider?: string
}

/**
 * Create an OpenAI-compatible client using the openai SDK.
 * Works with: Groq, OpenAI, Together AI, any OpenAI-compatible API.
 * Supports function calling (tool_use) for appointment booking.
 */
async function createOpenAICompatibleClient(): Promise<ZAIClient | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    const OpenAISDK = (await import('openai')).default
    const baseURL = process.env.OPENAI_BASE_URL || undefined
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

    const openai = new OpenAISDK({ apiKey, baseURL })

    const provider = baseURL?.includes('groq') ? 'Groq'
      : baseURL?.includes('together') ? 'Together'
      : baseURL?.includes('openrouter') ? 'OpenRouter'
      : 'OpenAI'

    console.log(`[Sinap AI] Using ${provider} provider (model: ${model})`)

    return {
      _provider: provider,
      chat: {
        completions: {
          create: async (body) => {
            // Build the OpenAI-compatible request
            const requestParams: OpenAI.ChatCompletionCreateParams = {
              model,
              messages: body.messages as OpenAI.ChatCompletionMessageParam[],
              temperature: body.temperature ?? 0.7,
              max_tokens: body.max_tokens ?? 800,
            }

            // Add tools if provided (for function calling)
            if (body.tools && body.tools.length > 0) {
              requestParams.tools = body.tools as OpenAI.ChatCompletionTool[]
              if (body.tool_choice) {
                requestParams.tool_choice = body.tool_choice as OpenAI.ChatCompletionToolChoiceOption
              }
            }

            const completion = await openai.chat.completions.create(requestParams)

            // Normalize response to include tool_calls
            return {
              choices: (completion.choices || []).map(choice => ({
                message: {
                  content: choice.message?.content || null,
                  tool_calls: choice.message?.tool_calls?.map(tc => {
                    // tc can be FunctionToolCall or CustomToolCall - handle both
                    const funcData = ('function' in tc) ? tc.function : null
                    return {
                      id: tc.id,
                      type: 'function' as const,
                      function: {
                        name: funcData?.name || '',
                        arguments: funcData?.arguments || '',
                      },
                    }
                  }),
                },
                finish_reason: choice.finish_reason || 'stop',
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
  const openaiClient = await createOpenAICompatibleClient()
  if (openaiClient) return openaiClient

  // 2. Try ZAI SDK directly — works in Z.ai infrastructure and local dev
  try {
    const sdk = await ZAI.create()
    if (sdk?.chat?.completions?.create) {
      console.log('[Sinap AI] Using ZAI SDK directly')
      // Wrap the ZAI SDK to match our interface
      return {
        _provider: 'ZAI',
        chat: {
          completions: {
            create: async (body) => {
              const completion = await sdk.chat.completions.create({
                messages: body.messages.filter(m => m.role !== 'tool').map(m => ({
                  role: m.role as 'system' | 'user' | 'assistant',
                  content: m.content || '',
                })),
                temperature: body.temperature,
                max_tokens: body.max_tokens,
              })
              return {
                choices: (completion.choices || []).map(choice => ({
                  message: {
                    content: choice.message?.content || null,
                    // ZAI SDK doesn't support tool calls — text only
                  },
                  finish_reason: 'stop',
                })),
              }
            },
          },
        },
      } as ZAIClient
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
    const sdk = new (ZAI as unknown as { new(cfg: unknown): unknown })(config) as { chat: { completions: { create: (body: unknown) => Promise<{ choices: Array<{ message: { content: string } }> }> } } }
    console.log('[Sinap AI] Using ZAI SDK with explicit config')
    return {
      _provider: 'ZAI-explicit',
      chat: {
        completions: {
          create: async (body) => {
            const completion = await sdk.chat.completions.create({
              messages: body.messages.filter(m => m.role !== 'tool').map(m => ({
                role: m.role as 'system' | 'user' | 'assistant',
                content: m.content || '',
              })),
              temperature: body.temperature,
              max_tokens: body.max_tokens,
            })
            return {
              choices: (completion.choices || []).map(choice => ({
                message: {
                  content: choice.message?.content || null,
                },
                finish_reason: 'stop',
              })),
            }
          },
        },
      },
    } as ZAIClient
  } catch (configError) {
    console.warn('[Sinap AI] ZAI SDK explicit config failed:', configError instanceof Error ? configError.message : configError)
  }

  throw new Error(
    'Sinap AI: No hay proveedor de IA disponible. ' +
    'Configura OPENAI_API_KEY en Vercel para usar Groq (gratis) u OpenAI.'
  )
}
