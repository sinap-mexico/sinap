import { NextRequest, NextResponse } from 'next/server'
import { createZAI } from '@/lib/zai'

// AI Proxy — uses the best available AI provider (OpenAI or ZAI SDK)
// This route is kept for backward compatibility with client-side calls.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const zai = await createZAI()

    const completion = await zai.chat.completions.create({
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 500,
    })

    return NextResponse.json(completion, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[AI Proxy] Error:', message)
    return NextResponse.json({ error: `AI proxy failed: ${message}` }, { status: 502 })
  }
}
