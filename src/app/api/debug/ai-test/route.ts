// ─── Diagnostic endpoint to test AI with clinic context ────
// Shows detailed errors for debugging. Remove after debugging is complete.

import { NextRequest, NextResponse } from 'next/server'
import { loadClinicContext, generateEmergencyResponse } from '@/lib/ai-orchestrator'
import { createZAI } from '@/lib/zai'

export async function POST(req: NextRequest) {
  const debug: Record<string, unknown> = {}

  try {
    const { message, clinicId } = await req.json()

    if (!message || !clinicId) {
      return NextResponse.json({ error: 'message and clinicId required' }, { status: 400 })
    }

    // 1. Load clinic context
    const context = await loadClinicContext(clinicId)
    debug.clinicContext = context ? {
      clinicName: context.clinicName,
      personaName: context.personaName,
      phone: context.phone,
      address: context.address,
      servicesCount: context.services.length,
      services: context.services.map(s => ({ name: s.name, price: s.price, duration: s.duration })),
      doctorsCount: context.doctors.length,
      doctors: context.doctors.map(d => ({ name: d.name, specialty: d.specialty, schedule: `${d.workDays} ${d.workStart}-${d.workEnd}` })),
    } : null

    // 2. Test AI client
    try {
      debug.aiStep = 'creating AI client...'
      const zai = await createZAI()
      debug.aiStep = 'AI client created, calling chat.completions.create...'

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: `Eres ${context?.personaName || 'Sinap Desk'}, asistente de ${context?.clinicName || 'la clínica'}. Responde en español, breve y profesional.` },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 300,
      })

      debug.aiStep = 'AI call completed'
      debug.aiResponse = completion.choices?.[0]?.message?.content || null
    } catch (aiError) {
      debug.aiError = aiError instanceof Error ? aiError.message : String(aiError)
      debug.aiErrorStack = aiError instanceof Error ? aiError.stack?.substring(0, 500) : null
    }

    // 3. Test environment info
    debug.env = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_URL: process.env.VERCEL_URL ? 'set' : 'not set',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ? 'set' : 'not set',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? `set (${process.env.OPENAI_API_KEY.substring(0, 8)}...)` : 'not set',
      OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || 'not set (using default)',
      OPENAI_MODEL: process.env.OPENAI_MODEL || 'not set (using gpt-4o-mini)',
      ZAI_PROXY_URL: process.env.ZAI_PROXY_URL ? 'set' : 'not set',
      ZAI_BASE_URL: process.env.ZAI_BASE_URL || 'not set',
      ZAI_TOKEN: process.env.ZAI_TOKEN ? 'set' : 'not set',
    }

    debug.emergencyResponse = !debug.aiResponse ? generateEmergencyResponse(message, context?.clinicName) : null

    return NextResponse.json(debug)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg, debug }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const clinicId = searchParams.get('clinicId')

  if (!clinicId) {
    return NextResponse.json({ error: 'clinicId query param required' }, { status: 400 })
  }

  const context = await loadClinicContext(clinicId)

  // Also test basic AI connection
  let aiTest: string | null = null
  try {
    const zai = await createZAI()
    const completion = await zai.chat.completions.create({
      messages: [{ role: 'user', content: 'Responde solo: OK' }],
      max_tokens: 10,
    })
    aiTest = completion.choices?.[0]?.message?.content || 'empty response'
  } catch (e) {
    aiTest = `ERROR: ${e instanceof Error ? e.message : String(e)}`
  }

  return NextResponse.json({
    clinicContext: context ? {
      clinicName: context.clinicName,
      personaName: context.personaName,
      phone: context.phone,
      address: context.address,
      city: context.city,
      state: context.state,
      servicesCount: context.services.length,
      services: context.services,
      doctorsCount: context.doctors.length,
      doctors: context.doctors,
    } : null,
    aiTest,
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'set' : 'not set',
      OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini (default)',
    },
  })
}
