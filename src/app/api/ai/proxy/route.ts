import { NextRequest, NextResponse } from 'next/server'

// AI Proxy — forwards requests to Z-AI API
// This route runs on Vercel and tries multiple endpoints to reach the AI

const DEFAULT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiM2I0OGUwZjAtN2I2NC00MzY3LTk3ZDYtNGMxYzQ1NWM2MzA4IiwiY2hhdF9pZCI6ImNoYXQtN2JlMGRhZDUtMWE4Ny00ZjFlLThhZTItMzE2ZWRmZmZkNjJiIiwicGxhdGZvcm0iOiJ6YWkifQ.a_1wytk_upNlP_i9DHsGUkqlLFQM_qm-c2bX7-3iDGI'
const DEFAULT_USER_ID = '3b48e0f0-7b64-4367-97d6-4c1c455c6308'
const DEFAULT_API_KEY = 'Z.ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const apiKey = process.env.ZAI_API_KEY || DEFAULT_API_KEY
    const token = process.env.ZAI_TOKEN || DEFAULT_TOKEN
    const userId = process.env.ZAI_USER_ID || DEFAULT_USER_ID

    // Try multiple base URLs — the internal one may not be reachable from Vercel
    const baseUrls = [
      process.env.ZAI_BASE_URL || 'https://internal-api.z.ai/v1',
      'https://api.z.ai/v1',
    ].filter((url, i, arr) => arr.indexOf(url) === i) // deduplicate

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Z-AI-From': 'Z',
      'X-Token': token,
      'X-User-Id': userId,
    }

    let lastError: Error | null = null

    for (const baseUrl of baseUrls) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10_000)

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (response.ok) {
          const data = await response.json()
          return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
        }

        const errorBody = await response.text().catch(() => 'Unknown error')
        lastError = new Error(`${baseUrl} returned ${response.status}: ${errorBody}`)
        console.warn(`[AI Proxy] ${baseUrl} failed:`, response.status, errorBody.substring(0, 200))
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError))
        console.warn(`[AI Proxy] ${baseUrl} unreachable:`, lastError.message)
      }
    }

    console.error('[AI Proxy] All endpoints failed. Last error:', lastError?.message)
    return NextResponse.json({ error: `AI proxy failed: ${lastError?.message || 'unknown'}` }, { status: 502 })
  } catch (error) {
    console.error('[AI Proxy] Error:', error)
    return NextResponse.json({ error: 'AI proxy failed' }, { status: 500 })
  }
}
