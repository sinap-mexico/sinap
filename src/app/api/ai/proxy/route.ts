import { NextRequest, NextResponse } from 'next/server'

// AI Proxy — forwards requests to Z-AI internal API
// This route runs on Vercel and can reach external APIs,
// acting as a bridge for serverless functions that can't
// directly access internal-api.z.ai

const DEFAULT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiM2I0OGUwZjAtN2I2NC00MzY3LTk3ZDYtNGMxYzQ1NWM2MzA4IiwiY2hhdF9pZCI6ImNoYXQtN2JlMGRhZDUtMWE4Ny00ZjFlLThhZTItMzE2ZWRmZmZkNjJiIiwicGxhdGZvcm0iOiJ6YWkifQ.a_1wytk_upNlP_i9DHsGUkqlLFQM_qm-c2bX7-3iDGI'
const DEFAULT_USER_ID = '3b48e0f0-7b64-4367-97d6-4c1c455c6308'
const DEFAULT_BASE_URL = 'https://internal-api.z.ai/v1'
const DEFAULT_API_KEY = 'Z.ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const baseUrl = process.env.ZAI_BASE_URL || DEFAULT_BASE_URL
    const apiKey = process.env.ZAI_API_KEY || DEFAULT_API_KEY
    const token = process.env.ZAI_TOKEN || DEFAULT_TOKEN
    const userId = process.env.ZAI_USER_ID || DEFAULT_USER_ID

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Z-AI-From': 'Z',
        'X-Token': token,
        'X-User-Id': userId,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error')
      console.error('[AI Proxy] Upstream error:', response.status, errorBody)
      return NextResponse.json({ error: `AI proxy error (${response.status})` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[AI Proxy] Error:', error)
    return NextResponse.json({ error: 'AI proxy failed' }, { status: 500 })
  }
}
